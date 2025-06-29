"""
API rate limiting and caching models.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum
from bson import ObjectId


class RateLimitType(str, Enum):
    """Types of rate limits."""
    REQUESTS_PER_MINUTE = "requests_per_minute"
    REQUESTS_PER_HOUR = "requests_per_hour"
    REQUESTS_PER_DAY = "requests_per_day"
    SEARCHES_PER_HOUR = "searches_per_hour"
    API_CALLS_PER_MINUTE = "api_calls_per_minute"
    CONCURRENT_REQUESTS = "concurrent_requests"


class RateLimitScope(str, Enum):
    """Scope of rate limiting."""
    GLOBAL = "global"          # System-wide limits
    USER = "user"              # Per-user limits
    IP_ADDRESS = "ip_address"  # Per-IP limits
    API_KEY = "api_key"        # Per-API key limits
    ENDPOINT = "endpoint"      # Per-endpoint limits


class CacheType(str, Enum):
    """Types of cache entries."""
    SEARCH_RESULTS = "search_results"
    PRODUCT_DATA = "product_data"
    PRICE_DATA = "price_data"
    USER_SESSION = "user_session"
    API_RESPONSE = "api_response"
    ANALYTICS_DATA = "analytics_data"
    EXCHANGE_RATES = "exchange_rates"
    GEOLOCATION = "geolocation"


class CacheStatus(str, Enum):
    """Cache entry status."""
    ACTIVE = "active"
    EXPIRED = "expired"
    INVALIDATED = "invalidated"
    WARMING = "warming"


class RateLimitRule(BaseModel):
    """Rate limiting rule definition."""
    rule_id: str = Field(..., description="Unique rule identifier")
    name: str = Field(..., description="Rule name")
    description: Optional[str] = Field(None, description="Rule description")
    
    # Rule configuration
    limit_type: RateLimitType = Field(..., description="Type of rate limit")
    scope: RateLimitScope = Field(..., description="Scope of the limit")
    limit_value: int = Field(..., description="Maximum allowed requests")
    window_seconds: int = Field(..., description="Time window in seconds")
    
    # Rule targeting
    endpoints: List[str] = Field([], description="Endpoint patterns to apply limit")
    user_roles: List[str] = Field([], description="User roles this applies to")
    ip_whitelist: List[str] = Field([], description="IP addresses exempt from limit")
    
    # Behavior configuration
    block_on_exceed: bool = Field(True, description="Block requests when limit exceeded")
    reset_on_window: bool = Field(True, description="Reset counter on window expiry")
    error_message: str = Field("Rate limit exceeded", description="Error message to return")
    
    # Metadata
    is_active: bool = Field(True, description="Whether rule is active")
    priority: int = Field(100, description="Rule priority (lower = higher priority)")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class RateLimitEntry(BaseModel):
    """Rate limit tracking entry."""
    entry_id: str = Field(..., description="Unique entry identifier")
    rule_id: str = Field(..., description="Associated rule ID")
    
    # Tracking identifiers
    scope_value: str = Field(..., description="Value being tracked (user_id, ip, etc)")
    endpoint: str = Field(..., description="Endpoint being accessed")
    
    # Limit tracking
    request_count: int = Field(0, description="Number of requests in current window")
    window_start: datetime = Field(default_factory=datetime.now, description="Window start time")
    window_end: datetime = Field(..., description="Window end time")
    
    # Request details
    last_request_at: datetime = Field(default_factory=datetime.now)
    requests_blocked: int = Field(0, description="Number of blocked requests")
    first_violation_at: Optional[datetime] = Field(None, description="First time limit was exceeded")
    
    # Metadata
    metadata: Dict[str, Any] = Field({}, description="Additional tracking data")


class CacheEntry(BaseModel):
    """Cache entry definition."""
    cache_key: str = Field(..., description="Unique cache key")
    cache_type: CacheType = Field(..., description="Type of cached data")
    
    # Cache data
    data: Dict[str, Any] = Field({}, description="Cached data")
    data_size: int = Field(0, description="Size of cached data in bytes")
    
    # Cache metadata
    ttl_seconds: int = Field(3600, description="Time to live in seconds")
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime = Field(..., description="Cache expiration time")
    last_accessed: datetime = Field(default_factory=datetime.now)
    access_count: int = Field(0, description="Number of times accessed")
    
    # Cache management
    status: CacheStatus = Field(CacheStatus.ACTIVE, description="Cache entry status")
    tags: List[str] = Field([], description="Cache tags for invalidation")
    priority: int = Field(100, description="Cache priority for eviction")
    
    # Performance metrics
    generation_time_ms: float = Field(0.0, description="Time to generate data")
    hit_ratio: float = Field(0.0, description="Cache hit ratio")


class CacheStats(BaseModel):
    """Cache performance statistics."""
    cache_type: CacheType = Field(..., description="Cache type")
    
    # Hit/miss statistics
    total_requests: int = Field(0, description="Total cache requests")
    cache_hits: int = Field(0, description="Number of cache hits")
    cache_misses: int = Field(0, description="Number of cache misses")
    hit_ratio: float = Field(0.0, description="Cache hit ratio")
    
    # Size statistics
    total_entries: int = Field(0, description="Number of cache entries")
    total_size_bytes: int = Field(0, description="Total cache size in bytes")
    average_entry_size: float = Field(0.0, description="Average entry size")
    
    # Performance statistics
    average_generation_time: float = Field(0.0, description="Average data generation time")
    average_access_time: float = Field(0.0, description="Average cache access time")
    
    # Time-based statistics
    last_updated: datetime = Field(default_factory=datetime.now)
    oldest_entry: Optional[datetime] = Field(None, description="Oldest cache entry")
    newest_entry: Optional[datetime] = Field(None, description="Newest cache entry")


class RateLimitStats(BaseModel):
    """Rate limiting statistics."""
    rule_id: str = Field(..., description="Rate limit rule ID")
    
    # Request statistics
    total_requests: int = Field(0, description="Total requests processed")
    allowed_requests: int = Field(0, description="Requests that were allowed")
    blocked_requests: int = Field(0, description="Requests that were blocked")
    block_ratio: float = Field(0.0, description="Percentage of requests blocked")
    
    # Time-based statistics
    requests_last_hour: int = Field(0, description="Requests in last hour")
    requests_last_day: int = Field(0, description="Requests in last day")
    peak_requests_per_minute: int = Field(0, description="Peak requests per minute")
    
    # Violation statistics
    unique_violators: int = Field(0, description="Number of unique violators")
    repeat_violators: int = Field(0, description="Number of repeat violators")
    first_violation: Optional[datetime] = Field(None, description="First violation time")
    last_violation: Optional[datetime] = Field(None, description="Last violation time")
    
    last_updated: datetime = Field(default_factory=datetime.now)


class APIQuota(BaseModel):
    """API usage quota definition."""
    quota_id: str = Field(..., description="Unique quota identifier")
    user_id: Optional[str] = Field(None, description="User ID (if user-specific)")
    api_key: Optional[str] = Field(None, description="API key (if key-specific)")
    
    # Quota limits
    daily_limit: int = Field(1000, description="Daily request limit")
    monthly_limit: int = Field(30000, description="Monthly request limit")
    burst_limit: int = Field(100, description="Burst request limit")
    
    # Current usage
    daily_usage: int = Field(0, description="Current daily usage")
    monthly_usage: int = Field(0, description="Current monthly usage")
    burst_usage: int = Field(0, description="Current burst usage")
    
    # Reset times
    daily_reset: datetime = Field(..., description="Daily quota reset time")
    monthly_reset: datetime = Field(..., description="Monthly quota reset time")
    burst_reset: datetime = Field(..., description="Burst quota reset time")
    
    # Quota metadata
    is_active: bool = Field(True, description="Whether quota is active")
    grace_requests: int = Field(0, description="Grace requests after limit")
    warning_threshold: float = Field(0.8, description="Warning threshold ratio")
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# MongoDB Document Models
class RateLimitRuleDocument(BaseModel):
    """MongoDB document for rate limit rules."""
    id: Optional[str] = Field(None, alias="_id")
    rule_id: str
    name: str
    description: Optional[str] = None
    limit_type: str
    scope: str
    limit_value: int
    window_seconds: int
    endpoints: List[str] = []
    user_roles: List[str] = []
    ip_whitelist: List[str] = []
    block_on_exceed: bool = True
    reset_on_window: bool = True
    error_message: str = "Rate limit exceeded"
    is_active: bool = True
    priority: int = 100
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class RateLimitEntryDocument(BaseModel):
    """MongoDB document for rate limit entries."""
    id: Optional[str] = Field(None, alias="_id")
    entry_id: str
    rule_id: str
    scope_value: str
    endpoint: str
    request_count: int = 0
    window_start: datetime = Field(default_factory=datetime.now)
    window_end: datetime
    last_request_at: datetime = Field(default_factory=datetime.now)
    requests_blocked: int = 0
    first_violation_at: Optional[datetime] = None
    metadata: Dict[str, Any] = {}
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class CacheEntryDocument(BaseModel):
    """MongoDB document for cache entries."""
    id: Optional[str] = Field(None, alias="_id")
    cache_key: str
    cache_type: str
    data: Dict[str, Any] = {}
    data_size: int = 0
    ttl_seconds: int = 3600
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime
    last_accessed: datetime = Field(default_factory=datetime.now)
    access_count: int = 0
    status: str = "active"
    tags: List[str] = []
    priority: int = 100
    generation_time_ms: float = 0.0
    hit_ratio: float = 0.0
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class APIQuotaDocument(BaseModel):
    """MongoDB document for API quotas."""
    id: Optional[str] = Field(None, alias="_id")
    quota_id: str
    user_id: Optional[str] = None
    api_key: Optional[str] = None
    daily_limit: int = 1000
    monthly_limit: int = 30000
    burst_limit: int = 100
    daily_usage: int = 0
    monthly_usage: int = 0
    burst_usage: int = 0
    daily_reset: datetime
    monthly_reset: datetime
    burst_reset: datetime
    is_active: bool = True
    grace_requests: int = 0
    warning_threshold: float = 0.8
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


# Default rate limit rules
DEFAULT_RATE_LIMITS = [
    RateLimitRule(
        rule_id="global_api_limit",
        name="Global API Rate Limit",
        description="Global rate limit for all API endpoints",
        limit_type=RateLimitType.REQUESTS_PER_MINUTE,
        scope=RateLimitScope.GLOBAL,
        limit_value=1000,
        window_seconds=60,
        endpoints=["*"],
        priority=1
    ),
    RateLimitRule(
        rule_id="user_search_limit",
        name="User Search Rate Limit",
        description="Rate limit for search endpoints per user",
        limit_type=RateLimitType.SEARCHES_PER_HOUR,
        scope=RateLimitScope.USER,
        limit_value=100,
        window_seconds=3600,
        endpoints=["/api/search/*"],
        priority=10
    ),
    RateLimitRule(
        rule_id="ip_general_limit",
        name="IP General Rate Limit",
        description="General rate limit per IP address",
        limit_type=RateLimitType.REQUESTS_PER_MINUTE,
        scope=RateLimitScope.IP_ADDRESS,
        limit_value=60,
        window_seconds=60,
        endpoints=["*"],
        priority=20
    ),
    RateLimitRule(
        rule_id="price_tracking_limit",
        name="Price Tracking Rate Limit",
        description="Rate limit for price tracking endpoints",
        limit_type=RateLimitType.REQUESTS_PER_HOUR,
        scope=RateLimitScope.USER,
        limit_value=200,
        window_seconds=3600,
        endpoints=["/api/price-tracking/*"],
        priority=15
    )
]