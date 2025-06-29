"""
Advanced user management and roles service.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.user_management import (
    UserRole, Permission, AccountStatus, RoleDefinition, UserProfile, UserSession,
    UserActivity, UserRoleAssignment, UserStats, AdminAction, UserGroup, UserLimit,
    UserProfileDocument, UserSessionDocument, UserActivityDocument,
    UserRoleAssignmentDocument, AdminActionDocument, DEFAULT_ROLES
)

logger = logging.getLogger(__name__)


class UserManagementService:
    """Service for advanced user management and roles."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.users_collection = database.users
        self.user_profiles_collection = database.user_profiles
        self.user_sessions_collection = database.user_sessions
        self.user_activities_collection = database.user_activities
        self.user_roles_collection = database.user_roles
        self.admin_actions_collection = database.admin_actions
        self.user_groups_collection = database.user_groups
        self.user_limits_collection = database.user_limits
        
        # Cache for role definitions
        self.role_definitions = DEFAULT_ROLES.copy()
    
    # Role and Permission Management
    async def get_user_role(self, user_id: str) -> UserRole:
        """Get user's current role."""
        role_assignment = await self.user_roles_collection.find_one({
            "user_id": user_id,
            "is_active": True,
            "$or": [
                {"expires_at": {"$exists": False}},
                {"expires_at": None},
                {"expires_at": {"$gt": datetime.now()}}
            ]
        })
        
        if role_assignment:
            return UserRole(role_assignment["role"])
        
        return UserRole.REGULAR_USER  # Default role
    
    async def assign_role(self, user_id: str, role: UserRole, assigned_by: str, 
                         expires_at: Optional[datetime] = None) -> bool:
        """Assign a role to a user."""
        try:
            # Deactivate existing role assignments
            await self.user_roles_collection.update_many(
                {"user_id": user_id, "is_active": True},
                {"$set": {"is_active": False}}
            )
            
            # Create new role assignment
            assignment = UserRoleAssignmentDocument(
                user_id=user_id,
                role=role.value,
                assigned_by=assigned_by,
                expires_at=expires_at
            )
            
            await self.user_roles_collection.insert_one(assignment.model_dump())
            
            # Log admin action
            await self.log_admin_action(
                assigned_by,
                "assign_role",
                user_id,
                f"Assigned role {role.value} to user {user_id}",
                {"role": role.value, "expires_at": expires_at.isoformat() if expires_at else None}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error assigning role {role.value} to user {user_id}: {e}")
            return False
    
    async def revoke_role(self, user_id: str, revoked_by: str) -> bool:
        """Revoke user's current role."""
        try:
            result = await self.user_roles_collection.update_many(
                {"user_id": user_id, "is_active": True},
                {"$set": {"is_active": False}}
            )
            
            # Log admin action
            await self.log_admin_action(
                revoked_by,
                "revoke_role",
                user_id,
                f"Revoked role from user {user_id}",
                {}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error revoking role from user {user_id}: {e}")
            return False
    
    async def check_permission(self, user_id: str, permission: Permission) -> bool:
        """Check if user has a specific permission."""
        user_role = await self.get_user_role(user_id)
        role_definition = self.role_definitions.get(user_role)
        
        if not role_definition:
            return False
        
        return permission in role_definition.permissions
    
    async def get_user_permissions(self, user_id: str) -> List[Permission]:
        """Get all permissions for a user."""
        user_role = await self.get_user_role(user_id)
        role_definition = self.role_definitions.get(user_role)
        
        if not role_definition:
            return []
        
        return role_definition.permissions
    
    # User Profile Management
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user's extended profile."""
        profile_doc = await self.user_profiles_collection.find_one({"user_id": user_id})
        
        if profile_doc:
            return UserProfile(**profile_doc)
        
        return None
    
    async def update_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> bool:
        """Update user's profile."""
        try:
            profile_data["updated_at"] = datetime.now()
            
            result = await self.user_profiles_collection.update_one(
                {"user_id": user_id},
                {"$set": profile_data},
                upsert=True
            )
            
            return result.acknowledged
            
        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {e}")
            return False
    
    # User Session Management
    async def create_session(self, user_id: str, ip_address: str, user_agent: str,
                           session_duration_hours: int = 24) -> str:
        """Create a new user session."""
        session_id = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(hours=session_duration_hours)
        
        session = UserSessionDocument(
            session_id=session_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at
        )
        
        await self.user_sessions_collection.insert_one(session.model_dump())
        
        # Update user's last login
        await self.users_collection.update_one(
            {"_id": user_id},
            {"$set": {"last_login": datetime.now()}}
        )
        
        return session_id
    
    async def validate_session(self, session_id: str) -> Optional[str]:
        """Validate session and return user ID."""
        session = await self.user_sessions_collection.find_one({
            "session_id": session_id,
            "is_active": True,
            "expires_at": {"$gt": datetime.now()}
        })
        
        if session:
            # Update last activity
            await self.user_sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"last_activity": datetime.now()}}
            )
            
            return session["user_id"]
        
        return None
    
    async def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a user session."""
        result = await self.user_sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {"is_active": False}}
        )
        
        return result.modified_count > 0
    
    async def get_user_sessions(self, user_id: str, active_only: bool = True) -> List[UserSession]:
        """Get user's sessions."""
        query = {"user_id": user_id}
        if active_only:
            query.update({
                "is_active": True,
                "expires_at": {"$gt": datetime.now()}
            })
        
        sessions = []
        cursor = self.user_sessions_collection.find(query).sort("created_at", -1)
        
        async for session_doc in cursor:
            session = UserSession(**session_doc)
            sessions.append(session)
        
        return sessions
    
    # Activity Logging
    async def log_user_activity(self, user_id: str, action: str, resource: Optional[str] = None,
                               resource_id: Optional[str] = None, ip_address: str = "",
                               user_agent: str = "", metadata: Dict[str, Any] = None,
                               success: bool = True) -> None:
        """Log user activity."""
        activity = UserActivityDocument(
            activity_id=str(uuid.uuid4()),
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
            success=success
        )
        
        await self.user_activities_collection.insert_one(activity.model_dump())
    
    async def get_user_activities(self, user_id: str, limit: int = 50,
                                 action_filter: Optional[str] = None) -> List[UserActivity]:
        """Get user's activity history."""
        query = {"user_id": user_id}
        if action_filter:
            query["action"] = {"$regex": action_filter, "$options": "i"}
        
        activities = []
        cursor = self.user_activities_collection.find(query).sort("timestamp", -1).limit(limit)
        
        async for activity_doc in cursor:
            activity = UserActivity(**activity_doc)
            activities.append(activity)
        
        return activities
    
    # User Statistics
    async def calculate_user_stats(self, user_id: str) -> UserStats:
        """Calculate comprehensive user statistics."""
        try:
            # Get user creation date
            user = await self.users_collection.find_one({"_id": user_id})
            if not user:
                return UserStats(user_id=user_id)
            
            created_at = user.get("created_at", datetime.now())
            account_age_days = (datetime.now() - created_at).days
            
            # Count sessions
            total_sessions = await self.user_sessions_collection.count_documents({"user_id": user_id})
            
            # Count activities
            activity_stats = await self.user_activities_collection.aggregate([
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$action",
                    "count": {"$sum": 1}
                }}
            ]).to_list(None)
            
            total_searches = sum(stat["count"] for stat in activity_stats if "search" in stat["_id"].lower())
            
            # Count wishlists (would need to query wishlist collection)
            total_wishlists = await self.db.wishlist.count_documents({"user_id": user_id})
            
            # Calculate session metrics
            session_durations = []
            cursor = self.user_sessions_collection.find({
                "user_id": user_id,
                "last_activity": {"$exists": True}
            })
            
            async for session in cursor:
                if session.get("created_at") and session.get("last_activity"):
                    duration = (session["last_activity"] - session["created_at"]).total_seconds() / 60
                    session_durations.append(duration)
            
            avg_session_duration = sum(session_durations) / len(session_durations) if session_durations else 0
            
            # Get features used (from activities)
            features_used = list(set(stat["_id"] for stat in activity_stats))
            
            stats = UserStats(
                user_id=user_id,
                account_age_days=account_age_days,
                last_login=user.get("last_login"),
                login_count=total_sessions,
                total_sessions=total_sessions,
                total_searches=total_searches,
                total_wishlists=total_wishlists,
                average_session_duration=avg_session_duration,
                features_used=features_used[:10],  # Limit to top 10
                reviews_written=0,  # Would need reviews collection
                lists_shared=0,  # Would need sharing data
                social_interactions=0  # Would need social data
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating stats for user {user_id}: {e}")
            return UserStats(user_id=user_id)
    
    # Admin Actions
    async def log_admin_action(self, admin_user_id: str, action_type: str,
                              target_user_id: Optional[str], description: str,
                              parameters: Dict[str, Any], ip_address: str = "") -> None:
        """Log administrative action."""
        action = AdminActionDocument(
            action_id=str(uuid.uuid4()),
            admin_user_id=admin_user_id,
            action_type=action_type,
            target_user_id=target_user_id,
            description=description,
            parameters=parameters,
            result="success",  # Could be enhanced to track failures
            ip_address=ip_address
        )
        
        await self.admin_actions_collection.insert_one(action.model_dump())
    
    async def get_admin_actions(self, limit: int = 100, admin_filter: Optional[str] = None) -> List[AdminAction]:
        """Get administrative actions log."""
        query = {}
        if admin_filter:
            query["admin_user_id"] = admin_filter
        
        actions = []
        cursor = self.admin_actions_collection.find(query).sort("timestamp", -1).limit(limit)
        
        async for action_doc in cursor:
            action = AdminAction(**action_doc)
            actions.append(action)
        
        return actions
    
    # User Management Operations
    async def get_all_users(self, limit: int = 100, offset: int = 0,
                           role_filter: Optional[UserRole] = None,
                           status_filter: Optional[AccountStatus] = None) -> List[Dict[str, Any]]:
        """Get paginated list of users with their roles and stats."""
        # Build aggregation pipeline
        pipeline = []
        
        # Match filters
        match_stage = {}
        if status_filter:
            match_stage["status"] = status_filter.value
        
        if match_stage:
            pipeline.append({"$match": match_stage})
        
        # Lookup role assignments
        pipeline.extend([
            {
                "$lookup": {
                    "from": "user_roles",
                    "let": {"user_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$user_id", "$$user_id"]},
                                        {"$eq": ["$is_active", True]}
                                    ]
                                }
                            }
                        },
                        {"$sort": {"assigned_at": -1}},
                        {"$limit": 1}
                    ],
                    "as": "role_assignment"
                }
            },
            {
                "$addFields": {
                    "current_role": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$role_assignment.role", 0]},
                            "regular_user"
                        ]
                    }
                }
            }
        ])
        
        # Filter by role if specified
        if role_filter:
            pipeline.append({"$match": {"current_role": role_filter.value}})
        
        # Add pagination
        pipeline.extend([
            {"$skip": offset},
            {"$limit": limit},
            {
                "$project": {
                    "email": 1,
                    "full_name": 1,
                    "created_at": 1,
                    "last_login": 1,
                    "is_active": 1,
                    "current_role": 1,
                    "picture_url": 1
                }
            }
        ])
        
        users = []
        cursor = self.users_collection.aggregate(pipeline)
        
        async for user_doc in cursor:
            user_doc["user_id"] = str(user_doc["_id"])
            users.append(user_doc)
        
        return users
    
    async def update_user_status(self, user_id: str, status: AccountStatus, updated_by: str) -> bool:
        """Update user account status."""
        try:
            result = await self.users_collection.update_one(
                {"_id": user_id},
                {"$set": {"status": status.value, "updated_at": datetime.now()}}
            )
            
            # Log admin action
            await self.log_admin_action(
                updated_by,
                "update_user_status",
                user_id,
                f"Updated user status to {status.value}",
                {"status": status.value}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating status for user {user_id}: {e}")
            return False
    
    async def delete_user(self, user_id: str, deleted_by: str, soft_delete: bool = True) -> bool:
        """Delete or soft-delete a user."""
        try:
            if soft_delete:
                # Soft delete - mark as deleted but keep data
                result = await self.users_collection.update_one(
                    {"_id": user_id},
                    {
                        "$set": {
                            "status": AccountStatus.DELETED.value,
                            "deleted_at": datetime.now(),
                            "deleted_by": deleted_by
                        }
                    }
                )
                action_desc = f"Soft deleted user {user_id}"
            else:
                # Hard delete - remove all user data
                await self.users_collection.delete_one({"_id": user_id})
                await self.user_profiles_collection.delete_many({"user_id": user_id})
                await self.user_sessions_collection.delete_many({"user_id": user_id})
                await self.user_roles_collection.delete_many({"user_id": user_id})
                # Note: Keep activities and admin actions for audit trail
                
                result = type('Result', (), {'modified_count': 1})()  # Mock result
                action_desc = f"Hard deleted user {user_id}"
            
            # Log admin action
            await self.log_admin_action(
                deleted_by,
                "delete_user",
                user_id,
                action_desc,
                {"soft_delete": soft_delete}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            return False
    
    # Usage Limits Management
    async def check_user_limit(self, user_id: str, resource: str) -> Dict[str, Any]:
        """Check user's usage against limits."""
        user_role = await self.get_user_role(user_id)
        
        # Default limits based on role
        default_limits = {
            UserRole.REGULAR_USER: {
                "wishlists": 5,
                "products_per_wishlist": 50,
                "daily_searches": 100,
                "alerts": 3
            },
            UserRole.PREMIUM_USER: {
                "wishlists": -1,  # Unlimited
                "products_per_wishlist": -1,  # Unlimited
                "daily_searches": -1,  # Unlimited
                "alerts": 20
            }
        }
        
        role_limits = default_limits.get(user_role, default_limits[UserRole.REGULAR_USER])
        limit_value = role_limits.get(resource, 0)
        
        if limit_value == -1:  # Unlimited
            return {
                "limit": -1,
                "current_usage": 0,
                "remaining": -1,
                "is_exceeded": False
            }
        
        # Get current usage from database
        # This would need to be implemented based on specific resource
        current_usage = 0
        
        if resource == "wishlists":
            current_usage = await self.db.wishlist.count_documents({"user_id": user_id})
        elif resource == "alerts":
            current_usage = await self.db.alert_configs.count_documents({
                "user_id": user_id,
                "is_active": True
            })
        
        remaining = max(0, limit_value - current_usage)
        is_exceeded = current_usage >= limit_value
        
        return {
            "limit": limit_value,
            "current_usage": current_usage,
            "remaining": remaining,
            "is_exceeded": is_exceeded
        }
    
    # Cleanup and Maintenance
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        result = await self.user_sessions_collection.delete_many({
            "expires_at": {"$lt": datetime.now()}
        })
        
        logger.info(f"Cleaned up {result.deleted_count} expired sessions")
        return result.deleted_count
    
    async def cleanup_old_activities(self, days: int = 90) -> int:
        """Clean up old activity logs."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        result = await self.user_activities_collection.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        logger.info(f"Cleaned up {result.deleted_count} old activity logs")
        return result.deleted_count
    
    # System Statistics
    async def get_system_user_stats(self) -> Dict[str, Any]:
        """Get system-wide user statistics."""
        try:
            # Count users by role
            role_counts = {}
            for role in UserRole:
                count = await self.user_roles_collection.count_documents({
                    "role": role.value,
                    "is_active": True
                })
                role_counts[role.value] = count
            
            # Count users by status
            status_pipeline = [
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            status_counts = {}
            cursor = self.users_collection.aggregate(status_pipeline)
            async for doc in cursor:
                status_counts[doc["_id"] or "active"] = doc["count"]
            
            # Recent activity
            recent_activities = await self.user_activities_collection.count_documents({
                "timestamp": {"$gte": datetime.now() - timedelta(days=1)}
            })
            
            # Active sessions
            active_sessions = await self.user_sessions_collection.count_documents({
                "is_active": True,
                "expires_at": {"$gt": datetime.now()}
            })
            
            return {
                "total_users": sum(role_counts.values()),
                "users_by_role": role_counts,
                "users_by_status": status_counts,
                "recent_activities_24h": recent_activities,
                "active_sessions": active_sessions,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting system user stats: {e}")
            return {}