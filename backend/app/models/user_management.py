"""
Advanced user management and roles models.
"""
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum
from bson import ObjectId


class UserRole(str, Enum):
    """User role types."""
    SUPER_ADMIN = "super_admin"      # Full system access
    ADMIN = "admin"                  # Platform administration
    MODERATOR = "moderator"          # Content and user moderation
    PREMIUM_USER = "premium_user"    # Premium features access
    REGULAR_USER = "regular_user"    # Standard user access
    GUEST = "guest"                  # Limited access


class Permission(str, Enum):
    """System permissions."""
    # User management
    MANAGE_USERS = "manage_users"
    VIEW_USER_DETAILS = "view_user_details"
    MODIFY_USER_ROLES = "modify_user_roles"
    DELETE_USERS = "delete_users"
    
    # Content management
    MANAGE_PRODUCTS = "manage_products"
    MODERATE_REVIEWS = "moderate_reviews"
    MANAGE_CATEGORIES = "manage_categories"
    
    # System administration
    ACCESS_ADMIN_PANEL = "access_admin_panel"
    VIEW_SYSTEM_STATS = "view_system_stats"
    MANAGE_SYSTEM_SETTINGS = "manage_system_settings"
    ACCESS_LOGS = "access_logs"
    
    # Marketplace management
    MANAGE_MARKETPLACES = "manage_marketplaces"
    CONFIGURE_APIS = "configure_apis"
    
    # Analytics and reporting
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"
    VIEW_USER_ANALYTICS = "view_user_analytics"
    
    # Deal hunting
    MANAGE_DEAL_ALERTS = "manage_deal_alerts"
    TRIGGER_MANUAL_HUNTS = "trigger_manual_hunts"
    
    # Premium features
    UNLIMITED_WISHLISTS = "unlimited_wishlists"
    PRIORITY_SUPPORT = "priority_support"
    ADVANCED_ANALYTICS = "advanced_analytics"
    BULK_OPERATIONS = "bulk_operations"


class AccountStatus(str, Enum):
    """User account status."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"
    PENDING_VERIFICATION = "pending_verification"
    DELETED = "deleted"


class RoleDefinition(BaseModel):
    """Role definition with permissions."""
    role: UserRole = Field(..., description="Role identifier")
    name: str = Field(..., description="Display name")
    description: str = Field(..., description="Role description")
    permissions: List[Permission] = Field(..., description="Granted permissions")
    is_system_role: bool = Field(True, description="Whether this is a system-defined role")
    created_at: datetime = Field(default_factory=datetime.now)


class UserProfile(BaseModel):
    """Extended user profile information."""
    user_id: str = Field(..., description="User identifier")
    bio: Optional[str] = Field(None, description="User biography")
    location: Optional[str] = Field(None, description="User location")
    website: Optional[str] = Field(None, description="User website")
    social_links: Dict[str, str] = Field({}, description="Social media links")
    preferences: Dict[str, Any] = Field({}, description="User preferences")
    notification_settings: Dict[str, bool] = Field({}, description="Notification preferences")
    privacy_settings: Dict[str, bool] = Field({}, description="Privacy settings")
    updated_at: datetime = Field(default_factory=datetime.now)


class UserSession(BaseModel):
    """User session tracking."""
    session_id: str = Field(..., description="Session identifier")
    user_id: str = Field(..., description="User identifier")
    ip_address: str = Field(..., description="IP address")
    user_agent: str = Field(..., description="User agent string")
    device_info: Dict[str, str] = Field({}, description="Device information")
    location: Optional[str] = Field(None, description="Geolocation")
    created_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)
    expires_at: datetime = Field(..., description="Session expiration")
    is_active: bool = Field(True, description="Session status")


class UserActivity(BaseModel):
    """User activity logging."""
    activity_id: str = Field(..., description="Activity identifier")
    user_id: str = Field(..., description="User identifier")
    action: str = Field(..., description="Action performed")
    resource: Optional[str] = Field(None, description="Resource affected")
    resource_id: Optional[str] = Field(None, description="Resource identifier")
    ip_address: str = Field(..., description="IP address")
    user_agent: str = Field(..., description="User agent")
    metadata: Dict[str, Any] = Field({}, description="Additional activity data")
    timestamp: datetime = Field(default_factory=datetime.now)
    success: bool = Field(True, description="Whether action was successful")


class UserRoleAssignment(BaseModel):
    """User role assignment."""
    user_id: str = Field(..., description="User identifier")
    role: UserRole = Field(..., description="Assigned role")
    assigned_by: str = Field(..., description="Who assigned the role")
    assigned_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = Field(None, description="Role expiration")
    is_active: bool = Field(True, description="Assignment status")
    metadata: Dict[str, Any] = Field({}, description="Additional assignment data")


class UserStats(BaseModel):
    """User statistics and metrics."""
    user_id: str = Field(..., description="User identifier")
    
    # Account metrics
    account_age_days: int = Field(0, description="Days since account creation")
    last_login: Optional[datetime] = Field(None, description="Last login time")
    login_count: int = Field(0, description="Total login count")
    
    # Activity metrics
    total_sessions: int = Field(0, description="Total sessions")
    total_searches: int = Field(0, description="Total searches performed")
    total_wishlists: int = Field(0, description="Total wishlists created")
    total_products_tracked: int = Field(0, description="Total products tracked")
    
    # Engagement metrics
    average_session_duration: float = Field(0.0, description="Average session duration in minutes")
    pages_per_session: float = Field(0.0, description="Average pages per session")
    bounce_rate: float = Field(0.0, description="Session bounce rate")
    
    # Feature usage
    features_used: List[str] = Field([], description="Features the user has used")
    premium_features_used: List[str] = Field([], description="Premium features used")
    
    # Social metrics
    reviews_written: int = Field(0, description="Reviews written")
    lists_shared: int = Field(0, description="Wishlists shared")
    social_interactions: int = Field(0, description="Social interactions count")
    
    last_updated: datetime = Field(default_factory=datetime.now)


class AdminAction(BaseModel):
    """Administrative action logging."""
    action_id: str = Field(..., description="Action identifier")
    admin_user_id: str = Field(..., description="Admin who performed action")
    action_type: str = Field(..., description="Type of administrative action")
    target_user_id: Optional[str] = Field(None, description="Target user (if applicable)")
    target_resource: Optional[str] = Field(None, description="Target resource")
    description: str = Field(..., description="Action description")
    parameters: Dict[str, Any] = Field({}, description="Action parameters")
    result: str = Field(..., description="Action result")
    timestamp: datetime = Field(default_factory=datetime.now)
    ip_address: str = Field(..., description="Admin IP address")


class UserGroup(BaseModel):
    """User groups for organization."""
    group_id: str = Field(..., description="Group identifier")
    name: str = Field(..., description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    permissions: List[Permission] = Field([], description="Group permissions")
    members: List[str] = Field([], description="User IDs in group")
    created_by: str = Field(..., description="Creator user ID")
    created_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(True, description="Group status")


class UserLimit(BaseModel):
    """User usage limits."""
    user_id: str = Field(..., description="User identifier")
    resource: str = Field(..., description="Limited resource")
    limit_value: int = Field(..., description="Limit amount")
    current_usage: int = Field(0, description="Current usage")
    reset_period: str = Field("monthly", description="Reset period (daily/weekly/monthly)")
    last_reset: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(True, description="Limit status")


# MongoDB Document Models
class UserProfileDocument(BaseModel):
    """MongoDB document for user profiles."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    social_links: Dict[str, str] = {}
    preferences: Dict[str, Any] = {}
    notification_settings: Dict[str, bool] = {}
    privacy_settings: Dict[str, bool] = {}
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class UserSessionDocument(BaseModel):
    """MongoDB document for user sessions."""
    id: Optional[str] = Field(None, alias="_id")
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    device_info: Dict[str, str] = {}
    location: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)
    expires_at: datetime
    is_active: bool = True
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class UserActivityDocument(BaseModel):
    """MongoDB document for user activities."""
    id: Optional[str] = Field(None, alias="_id")
    activity_id: str
    user_id: str
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: str
    user_agent: str
    metadata: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.now)
    success: bool = True
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class UserRoleAssignmentDocument(BaseModel):
    """MongoDB document for role assignments."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    role: str
    assigned_by: str
    assigned_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    is_active: bool = True
    metadata: Dict[str, Any] = {}
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class AdminActionDocument(BaseModel):
    """MongoDB document for admin actions."""
    id: Optional[str] = Field(None, alias="_id")
    action_id: str
    admin_user_id: str
    action_type: str
    target_user_id: Optional[str] = None
    target_resource: Optional[str] = None
    description: str
    parameters: Dict[str, Any] = {}
    result: str
    timestamp: datetime = Field(default_factory=datetime.now)
    ip_address: str
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


# Default role definitions
DEFAULT_ROLES = {
    UserRole.SUPER_ADMIN: RoleDefinition(
        role=UserRole.SUPER_ADMIN,
        name="Super Administrator",
        description="Full system access with all permissions",
        permissions=list(Permission),  # All permissions
        is_system_role=True
    ),
    UserRole.ADMIN: RoleDefinition(
        role=UserRole.ADMIN,
        name="Administrator",
        description="Platform administration with most permissions",
        permissions=[
            Permission.MANAGE_USERS,
            Permission.VIEW_USER_DETAILS,
            Permission.MODIFY_USER_ROLES,
            Permission.MANAGE_PRODUCTS,
            Permission.MODERATE_REVIEWS,
            Permission.MANAGE_CATEGORIES,
            Permission.ACCESS_ADMIN_PANEL,
            Permission.VIEW_SYSTEM_STATS,
            Permission.MANAGE_MARKETPLACES,
            Permission.VIEW_ANALYTICS,
            Permission.EXPORT_DATA,
            Permission.MANAGE_DEAL_ALERTS,
            Permission.TRIGGER_MANUAL_HUNTS
        ],
        is_system_role=True
    ),
    UserRole.MODERATOR: RoleDefinition(
        role=UserRole.MODERATOR,
        name="Moderator",
        description="Content and user moderation",
        permissions=[
            Permission.VIEW_USER_DETAILS,
            Permission.MODERATE_REVIEWS,
            Permission.MANAGE_CATEGORIES,
            Permission.ACCESS_ADMIN_PANEL,
            Permission.VIEW_ANALYTICS
        ],
        is_system_role=True
    ),
    UserRole.PREMIUM_USER: RoleDefinition(
        role=UserRole.PREMIUM_USER,
        name="Premium User",
        description="Premium features and enhanced limits",
        permissions=[
            Permission.UNLIMITED_WISHLISTS,
            Permission.PRIORITY_SUPPORT,
            Permission.ADVANCED_ANALYTICS,
            Permission.BULK_OPERATIONS,
            Permission.VIEW_ANALYTICS,
            Permission.EXPORT_DATA
        ],
        is_system_role=True
    ),
    UserRole.REGULAR_USER: RoleDefinition(
        role=UserRole.REGULAR_USER,
        name="Regular User",
        description="Standard user access",
        permissions=[],  # Basic permissions only
        is_system_role=True
    ),
    UserRole.GUEST: RoleDefinition(
        role=UserRole.GUEST,
        name="Guest",
        description="Limited read-only access",
        permissions=[],
        is_system_role=True
    )
}