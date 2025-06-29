"""
Automated deal hunting and alerts models.
"""
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum
from bson import ObjectId


class AlertType(str, Enum):
    """Types of deal alerts."""
    PRICE_DROP = "price_drop"
    PERCENTAGE_DISCOUNT = "percentage_discount"
    STOCK_AVAILABLE = "stock_available"
    NEW_DEAL = "new_deal"
    KEYWORD_MATCH = "keyword_match"
    CATEGORY_DEAL = "category_deal"


class DealSeverity(str, Enum):
    """Deal alert severity levels."""
    LOW = "low"          # 5-15% discount
    MEDIUM = "medium"    # 15-30% discount
    HIGH = "high"        # 30-50% discount
    CRITICAL = "critical" # 50%+ discount


class NotificationChannel(str, Enum):
    """Available notification channels."""
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"


class DealFilter(BaseModel):
    """Filters for automated deal hunting."""
    keywords: List[str] = Field([], description="Keywords to search for")
    categories: List[str] = Field([], description="Product categories")
    marketplaces: List[str] = Field([], description="Specific marketplaces")
    min_discount_percentage: float = Field(0.0, description="Minimum discount percentage")
    max_price: Optional[float] = Field(None, description="Maximum price threshold")
    min_price: Optional[float] = Field(None, description="Minimum price threshold")
    brands: List[str] = Field([], description="Preferred brands")
    exclude_brands: List[str] = Field([], description="Brands to exclude")
    exclude_keywords: List[str] = Field([], description="Keywords to exclude")
    rating_threshold: float = Field(0.0, description="Minimum product rating")
    reviews_threshold: int = Field(0, description="Minimum number of reviews")


class AlertConfig(BaseModel):
    """Configuration for deal alerts."""
    alert_id: str = Field(..., description="Unique alert identifier")
    user_id: str = Field(..., description="User who created the alert")
    name: str = Field(..., description="Alert name")
    description: Optional[str] = Field(None, description="Alert description")
    
    # Alert conditions
    alert_types: List[AlertType] = Field(..., description="Types of alerts to trigger")
    filters: DealFilter = Field(..., description="Deal filtering criteria")
    severity_threshold: DealSeverity = Field(DealSeverity.LOW, description="Minimum alert severity")
    
    # Notification settings
    notification_channels: List[NotificationChannel] = Field(..., description="How to notify user")
    frequency_limit: int = Field(5, description="Max alerts per day")
    quiet_hours_start: Optional[str] = Field(None, description="Start of quiet hours (HH:MM)")
    quiet_hours_end: Optional[str] = Field(None, description="End of quiet hours (HH:MM)")
    
    # Status and metadata
    is_active: bool = Field(True, description="Whether alert is active")
    created_at: datetime = Field(default_factory=datetime.now)
    last_triggered: Optional[datetime] = Field(None, description="Last time alert was triggered")
    triggers_today: int = Field(0, description="Number of triggers today")


class Deal(BaseModel):
    """Detected deal information."""
    deal_id: str = Field(..., description="Unique deal identifier")
    product_id: str = Field(..., description="Product identifier")
    marketplace: str = Field(..., description="Marketplace name")
    
    # Product details
    title: str = Field(..., description="Product title")
    description: Optional[str] = Field(None, description="Product description")
    image_url: Optional[str] = Field(None, description="Product image URL")
    product_url: str = Field(..., description="Product page URL")
    category: Optional[str] = Field(None, description="Product category")
    brand: Optional[str] = Field(None, description="Product brand")
    
    # Price information
    current_price: float = Field(..., description="Current price")
    original_price: float = Field(..., description="Original/previous price")
    discount_amount: float = Field(..., description="Discount amount")
    discount_percentage: float = Field(..., description="Discount percentage")
    currency: str = Field("USD", description="Price currency")
    
    # Deal metadata
    deal_type: AlertType = Field(..., description="Type of deal detected")
    severity: DealSeverity = Field(..., description="Deal severity")
    detected_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = Field(None, description="Deal expiration time")
    
    # Product quality indicators
    rating: Optional[float] = Field(None, description="Product rating")
    review_count: Optional[int] = Field(None, description="Number of reviews")
    in_stock: bool = Field(True, description="Product availability")
    
    # Additional data
    tags: List[str] = Field([], description="Deal tags")
    metadata: Dict[str, Any] = Field({}, description="Additional deal data")


class DealAlert(BaseModel):
    """Triggered deal alert."""
    alert_id: str = Field(..., description="Alert configuration ID")
    deal_id: str = Field(..., description="Deal that triggered alert")
    user_id: str = Field(..., description="User to notify")
    
    # Alert details
    alert_type: AlertType = Field(..., description="Type of alert")
    severity: DealSeverity = Field(..., description="Alert severity")
    message: str = Field(..., description="Alert message")
    
    # Notification status
    channels_sent: List[NotificationChannel] = Field([], description="Channels where alert was sent")
    sent_at: datetime = Field(default_factory=datetime.now)
    read_at: Optional[datetime] = Field(None, description="When user read the alert")
    clicked_at: Optional[datetime] = Field(None, description="When user clicked the alert")
    
    # Metadata
    metadata: Dict[str, Any] = Field({}, description="Additional alert data")


class DealHuntingStats(BaseModel):
    """Statistics for deal hunting performance."""
    user_id: str = Field(..., description="User identifier")
    period_start: datetime = Field(..., description="Stats period start")
    period_end: datetime = Field(..., description="Stats period end")
    
    # Alert statistics
    total_alerts_configured: int = Field(0, description="Number of active alerts")
    total_deals_found: int = Field(0, description="Total deals detected")
    total_alerts_sent: int = Field(0, description="Total alerts sent")
    
    # Deal quality metrics
    deals_by_severity: Dict[str, int] = Field({}, description="Deals grouped by severity")
    deals_by_category: Dict[str, int] = Field({}, description="Deals grouped by category")
    deals_by_marketplace: Dict[str, int] = Field({}, description="Deals grouped by marketplace")
    
    # User engagement
    alerts_clicked: int = Field(0, description="Alerts clicked by user")
    deals_saved: int = Field(0, description="Deals saved to wishlist")
    deals_purchased: int = Field(0, description="Deals that led to purchases")
    
    # Savings metrics
    total_potential_savings: float = Field(0.0, description="Total potential savings from all deals")
    average_discount_percentage: float = Field(0.0, description="Average discount percentage")
    best_deal_savings: float = Field(0.0, description="Largest single deal savings")


class HuntingPreferences(BaseModel):
    """User preferences for deal hunting."""
    user_id: str = Field(..., description="User identifier")
    
    # General preferences
    max_alerts_per_day: int = Field(10, description="Maximum alerts per day")
    preferred_notification_time: str = Field("09:00", description="Preferred notification time")
    timezone: str = Field("UTC", description="User timezone")
    
    # Deal preferences
    min_discount_threshold: float = Field(10.0, description="Minimum discount to consider")
    favorite_categories: List[str] = Field([], description="Favorite product categories")
    favorite_brands: List[str] = Field([], description="Favorite brands")
    price_range_min: Optional[float] = Field(None, description="Minimum price range")
    price_range_max: Optional[float] = Field(None, description="Maximum price range")
    
    # Notification preferences
    email_enabled: bool = Field(True, description="Enable email notifications")
    push_enabled: bool = Field(True, description="Enable push notifications")
    sms_enabled: bool = Field(False, description="Enable SMS notifications")
    
    # Advanced settings
    enable_ai_suggestions: bool = Field(True, description="Enable AI deal suggestions")
    track_competitor_prices: bool = Field(True, description="Track prices across marketplaces")
    exclude_flash_deals: bool = Field(False, description="Exclude very short-term deals")
    
    updated_at: datetime = Field(default_factory=datetime.now)


# MongoDB Document Models
class AlertConfigDocument(BaseModel):
    """MongoDB document for alert configurations."""
    id: Optional[str] = Field(None, alias="_id")
    alert_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    alert_types: List[str]
    filters: Dict[str, Any]
    severity_threshold: str
    notification_channels: List[str]
    frequency_limit: int = 5
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    last_triggered: Optional[datetime] = None
    triggers_today: int = 0
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class DealDocument(BaseModel):
    """MongoDB document for deals."""
    id: Optional[str] = Field(None, alias="_id")
    deal_id: str
    product_id: str
    marketplace: str
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    product_url: str
    category: Optional[str] = None
    brand: Optional[str] = None
    current_price: float
    original_price: float
    discount_amount: float
    discount_percentage: float
    currency: str = "USD"
    deal_type: str
    severity: str
    detected_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    in_stock: bool = True
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class DealAlertDocument(BaseModel):
    """MongoDB document for deal alerts."""
    id: Optional[str] = Field(None, alias="_id")
    alert_id: str
    deal_id: str
    user_id: str
    alert_type: str
    severity: str
    message: str
    channels_sent: List[str] = []
    sent_at: datetime = Field(default_factory=datetime.now)
    read_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    metadata: Dict[str, Any] = {}
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }