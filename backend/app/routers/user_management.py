"""
Advanced user management and roles API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Dict, Optional
from datetime import datetime

from app.auth.jwt import get_current_user
from app.db import db
from app.services.user_management_service import UserManagementService
from app.models.user_management import (
    UserRole, Permission, AccountStatus, UserProfile, UserSession,
    UserActivity, UserStats, AdminAction
)
from app.models.db_models import User

router = APIRouter(prefix="/api/user-management", tags=["user-management"])


async def get_user_management_service():
    """Dependency to get user management service."""
    return UserManagementService(db)


def require_permission(permission: Permission):
    """Dependency to check user permission."""
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        service: UserManagementService = Depends(get_user_management_service)
    ):
        has_permission = await service.check_permission(str(current_user.id), permission)
        if not has_permission:
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required: {permission.value}"
            )
        return current_user
    return permission_checker


async def require_admin(
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Dependency to require admin role."""
    user_role = await service.get_user_role(str(current_user.id))
    if user_role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user


# User Role and Permission Management
@router.get("/roles", response_model=List[dict])
async def get_available_roles():
    """Get all available user roles."""
    roles = []
    for role in UserRole:
        roles.append({
            "value": role.value,
            "name": role.value.replace("_", " ").title(),
            "description": f"{role.value} role"
        })
    return roles


@router.get("/permissions", response_model=List[dict])
async def get_available_permissions():
    """Get all available permissions."""
    permissions = []
    for permission in Permission:
        permissions.append({
            "value": permission.value,
            "name": permission.value.replace("_", " ").title(),
            "description": f"{permission.value} permission"
        })
    return permissions


@router.get("/users/{user_id}/role", response_model=dict)
async def get_user_role(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.VIEW_USER_DETAILS)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get a user's current role."""
    try:
        role = await service.get_user_role(user_id)
        return {"user_id": user_id, "role": role.value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user role: {str(e)}")


@router.post("/users/{user_id}/role")
async def assign_user_role(
    user_id: str,
    role_data: dict,
    request: Request,
    current_user: User = Depends(require_permission(Permission.MODIFY_USER_ROLES)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Assign a role to a user."""
    try:
        role = UserRole(role_data["role"])
        expires_at = None
        if role_data.get("expires_at"):
            expires_at = datetime.fromisoformat(role_data["expires_at"].replace("Z", "+00:00"))
        
        success = await service.assign_role(
            user_id, 
            role, 
            str(current_user.id),
            expires_at
        )
        
        if success:
            return {"message": f"Role {role.value} assigned to user successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to assign role")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid role: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign role: {str(e)}")


@router.delete("/users/{user_id}/role")
async def revoke_user_role(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.MODIFY_USER_ROLES)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Revoke a user's current role."""
    try:
        success = await service.revoke_role(user_id, str(current_user.id))
        if success:
            return {"message": "User role revoked successfully"}
        else:
            raise HTTPException(status_code=404, detail="No active role found for user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to revoke role: {str(e)}")


@router.get("/users/{user_id}/permissions", response_model=List[str])
async def get_user_permissions(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.VIEW_USER_DETAILS)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get a user's permissions."""
    try:
        permissions = await service.get_user_permissions(user_id)
        return [p.value for p in permissions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get permissions: {str(e)}")


@router.get("/my-permissions", response_model=List[str])
async def get_my_permissions(
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get current user's permissions."""
    try:
        permissions = await service.get_user_permissions(str(current_user.id))
        return [p.value for p in permissions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get permissions: {str(e)}")


# User Profile Management
@router.get("/users/{user_id}/profile", response_model=dict)
async def get_user_profile(
    user_id: str,
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get user's extended profile."""
    # Users can view their own profile, admins can view any profile
    if user_id != str(current_user.id):
        has_permission = await service.check_permission(str(current_user.id), Permission.VIEW_USER_DETAILS)
        if not has_permission:
            raise HTTPException(status_code=403, detail="Cannot view other users' profiles")
    
    try:
        profile = await service.get_user_profile(user_id)
        if profile:
            return profile.model_dump()
        else:
            return {"user_id": user_id, "message": "Profile not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")


@router.put("/users/{user_id}/profile")
async def update_user_profile(
    user_id: str,
    profile_data: dict,
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Update user's profile."""
    # Users can only update their own profile
    if user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Cannot update other users' profiles")
    
    try:
        success = await service.update_user_profile(user_id, profile_data)
        if success:
            return {"message": "Profile updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update profile")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


# User Session Management
@router.get("/users/{user_id}/sessions", response_model=List[dict])
async def get_user_sessions(
    user_id: str,
    active_only: bool = Query(True, description="Show only active sessions"),
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get user's sessions."""
    # Users can view their own sessions, admins can view any user's sessions
    if user_id != str(current_user.id):
        has_permission = await service.check_permission(str(current_user.id), Permission.VIEW_USER_DETAILS)
        if not has_permission:
            raise HTTPException(status_code=403, detail="Cannot view other users' sessions")
    
    try:
        sessions = await service.get_user_sessions(user_id, active_only)
        return [session.model_dump() for session in sessions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")


@router.delete("/sessions/{session_id}")
async def invalidate_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Invalidate a session."""
    try:
        # Validate that the session belongs to the current user (unless admin)
        session_user_id = await service.validate_session(session_id)
        if session_user_id != str(current_user.id):
            has_permission = await service.check_permission(str(current_user.id), Permission.MANAGE_USERS)
            if not has_permission:
                raise HTTPException(status_code=403, detail="Cannot invalidate other users' sessions")
        
        success = await service.invalidate_session(session_id)
        if success:
            return {"message": "Session invalidated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to invalidate session: {str(e)}")


# User Activity and Statistics
@router.get("/users/{user_id}/activities", response_model=List[dict])
async def get_user_activities(
    user_id: str,
    limit: int = Query(50, le=200, description="Maximum number of activities to return"),
    action_filter: Optional[str] = Query(None, description="Filter by action type"),
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get user's activity history."""
    # Users can view their own activities, admins can view any user's activities
    if user_id != str(current_user.id):
        has_permission = await service.check_permission(str(current_user.id), Permission.VIEW_USER_DETAILS)
        if not has_permission:
            raise HTTPException(status_code=403, detail="Cannot view other users' activities")
    
    try:
        activities = await service.get_user_activities(user_id, limit, action_filter)
        return [activity.model_dump() for activity in activities]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get activities: {str(e)}")


@router.get("/users/{user_id}/stats", response_model=dict)
async def get_user_stats(
    user_id: str,
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get user statistics."""
    # Users can view their own stats, admins can view any user's stats
    if user_id != str(current_user.id):
        has_permission = await service.check_permission(str(current_user.id), Permission.VIEW_USER_ANALYTICS)
        if not has_permission:
            raise HTTPException(status_code=403, detail="Cannot view other users' statistics")
    
    try:
        stats = await service.calculate_user_stats(user_id)
        return stats.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user stats: {str(e)}")


# Admin User Management
@router.get("/admin/users", response_model=List[dict])
async def get_all_users(
    limit: int = Query(50, le=200, description="Number of users to return"),
    offset: int = Query(0, ge=0, description="Number of users to skip"),
    role_filter: Optional[str] = Query(None, description="Filter by role"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get paginated list of all users (admin only)."""
    try:
        role_enum = None
        if role_filter:
            try:
                role_enum = UserRole(role_filter)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid role: {role_filter}")
        
        status_enum = None
        if status_filter:
            try:
                status_enum = AccountStatus(status_filter)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")
        
        users = await service.get_all_users(limit, offset, role_enum, status_enum)
        return users
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")


@router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_data: dict,
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Update user account status (admin only)."""
    try:
        status = AccountStatus(status_data["status"])
        success = await service.update_user_status(user_id, status, str(current_user.id))
        
        if success:
            return {"message": f"User status updated to {status.value}"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid status: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    soft_delete: bool = Query(True, description="Perform soft delete instead of hard delete"),
    current_user: User = Depends(require_permission(Permission.DELETE_USERS)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Delete a user (admin only)."""
    try:
        success = await service.delete_user(user_id, str(current_user.id), soft_delete)
        
        if success:
            action = "soft deleted" if soft_delete else "permanently deleted"
            return {"message": f"User {action} successfully"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


@router.get("/admin/actions", response_model=List[dict])
async def get_admin_actions(
    limit: int = Query(100, le=500, description="Number of actions to return"),
    admin_filter: Optional[str] = Query(None, description="Filter by admin user ID"),
    current_user: User = Depends(require_permission(Permission.ACCESS_LOGS)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get administrative actions log (admin only)."""
    try:
        actions = await service.get_admin_actions(limit, admin_filter)
        return [action.model_dump() for action in actions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get admin actions: {str(e)}")


# Usage Limits
@router.get("/users/{user_id}/limits/{resource}")
async def check_user_limit(
    user_id: str,
    resource: str,
    current_user: User = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Check user's usage limits for a resource."""
    # Users can check their own limits
    if user_id != str(current_user.id):
        has_permission = await service.check_permission(str(current_user.id), Permission.VIEW_USER_DETAILS)
        if not has_permission:
            raise HTTPException(status_code=403, detail="Cannot view other users' limits")
    
    try:
        limit_info = await service.check_user_limit(user_id, resource)
        return limit_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check limits: {str(e)}")


# System Statistics
@router.get("/admin/stats/system")
async def get_system_stats(
    current_user: User = Depends(require_permission(Permission.VIEW_SYSTEM_STATS)),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Get system-wide user statistics (admin only)."""
    try:
        stats = await service.get_system_user_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system stats: {str(e)}")


# Maintenance Operations
@router.post("/admin/cleanup/sessions")
async def cleanup_expired_sessions(
    current_user: User = Depends(require_admin),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Clean up expired sessions (admin only)."""
    try:
        cleaned_count = await service.cleanup_expired_sessions()
        return {"message": f"Cleaned up {cleaned_count} expired sessions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup sessions: {str(e)}")


@router.post("/admin/cleanup/activities")
async def cleanup_old_activities(
    days: int = Query(90, ge=30, description="Keep activities newer than this many days"),
    current_user: User = Depends(require_admin),
    service: UserManagementService = Depends(get_user_management_service)
):
    """Clean up old activity logs (admin only)."""
    try:
        cleaned_count = await service.cleanup_old_activities(days)
        return {"message": f"Cleaned up {cleaned_count} old activity logs"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup activities: {str(e)}")


# Utility Endpoints
@router.get("/status-types")
async def get_status_types():
    """Get available account status types."""
    statuses = []
    for status in AccountStatus:
        statuses.append({
            "value": status.value,
            "name": status.value.replace("_", " ").title()
        })
    return {"status_types": statuses}