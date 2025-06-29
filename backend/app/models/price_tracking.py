"""
Price tracking models for monitoring product price changes over time.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId


class PriceHistoryEntry(BaseModel):
    """Individual price point in history."""
    price: float = Field(..., description="Product price at this point in time")
    original_price: Optional[float] = Field(None, description="Original/MSRP price")
    currency: str = Field("USD", description="Price currency")
    marketplace: str = Field(..., description="Source marketplace")
    timestamp: datetime = Field(default_factory=datetime.now, description="When this price was recorded")
    available: bool = Field(True, description="Whether product was in stock")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProductPriceTracker(BaseModel):
    """Track price history for a specific product across marketplaces."""
    product_id: str = Field(..., description="Unique product identifier")
    marketplace: str = Field(..., description="Source marketplace (aliexpress, ebay, etc.)")
    product_title: str = Field(..., description="Product title for reference")
    product_url: str = Field(..., description="Product detail URL")
    
    # Current price info
    current_price: float = Field(..., description="Current product price")
    lowest_price: float = Field(..., description="Lowest price ever recorded")
    highest_price: float = Field(..., description="Highest price recorded")
    average_price: float = Field(..., description="Average price over time")
    
    # Tracking metadata
    first_seen: datetime = Field(default_factory=datetime.now, description="When tracking started")
    last_updated: datetime = Field(default_factory=datetime.now, description="Last price check")
    check_frequency: int = Field(24, description="Hours between price checks")
    is_active: bool = Field(True, description="Whether to continue tracking")
    
    # Price history
    price_history: List[PriceHistoryEntry] = Field(default_factory=list, description="Historical price data")
    
    # Alert settings
    target_price: Optional[float] = Field(None, description="Alert when price drops below this")
    price_drop_threshold: float = Field(0.10, description="Alert on drops >= this percentage (0.10 = 10%)")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def add_price_point(self, price: float, original_price: Optional[float] = None, available: bool = True):
        """Add a new price point to history."""
        entry = PriceHistoryEntry(
            price=price,
            original_price=original_price,
            marketplace=self.marketplace,
            available=available
        )
        
        self.price_history.append(entry)
        self.current_price = price
        self.last_updated = datetime.now()
        
        # Update price statistics
        prices = [p.price for p in self.price_history if p.available]
        if prices:
            self.lowest_price = min(prices)
            self.highest_price = max(prices)
            self.average_price = sum(prices) / len(prices)
    
    def get_price_change_percentage(self, days: int = 30) -> Optional[float]:
        """Calculate price change percentage over specified days."""
        if len(self.price_history) < 2:
            return None
        
        cutoff_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_date = cutoff_date.timestamp() - (days * 24 * 60 * 60)
        
        # Find price from 'days' ago
        old_prices = [p for p in self.price_history if p.timestamp.timestamp() <= cutoff_date]
        if not old_prices:
            return None
        
        old_price = old_prices[-1].price  # Most recent price from the period
        current_price = self.current_price
        
        if old_price == 0:
            return None
        
        return ((current_price - old_price) / old_price) * 100
    
    def should_trigger_alert(self) -> bool:
        """Check if current price should trigger an alert."""
        if not self.is_active or len(self.price_history) < 2:
            return False
        
        # Check target price
        if self.target_price and self.current_price <= self.target_price:
            return True
        
        # Check percentage drop
        if len(self.price_history) >= 2:
            previous_price = self.price_history[-2].price
            if previous_price > 0:
                drop_percentage = (previous_price - self.current_price) / previous_price
                if drop_percentage >= self.price_drop_threshold:
                    return True
        
        return False


class PriceAlert(BaseModel):
    """Price alert configuration for users."""
    id: Optional[str] = Field(None, description="Alert ID")
    user_id: str = Field(..., description="User who created the alert")
    product_tracker_id: str = Field(..., description="Associated price tracker")
    
    alert_type: str = Field(..., description="target_price, percentage_drop, or availability")
    target_price: Optional[float] = Field(None, description="Alert when price drops below this")
    percentage_threshold: Optional[float] = Field(None, description="Alert on drops >= this percentage")
    
    is_active: bool = Field(True, description="Whether alert is active")
    created_at: datetime = Field(default_factory=datetime.now)
    triggered_at: Optional[datetime] = Field(None, description="When alert was last triggered")
    notification_sent: bool = Field(False, description="Whether notification was sent")
    
    # Notification preferences
    email_notification: bool = Field(True, description="Send email alerts")
    push_notification: bool = Field(False, description="Send push notifications")
    frequency_limit: int = Field(24, description="Minimum hours between alerts for same product")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserPricePreferences(BaseModel):
    """User's price tracking preferences."""
    user_id: str = Field(..., description="User ID")
    
    # Default alert settings
    default_price_drop_threshold: float = Field(0.15, description="Default drop percentage for alerts (15%)")
    max_alerts_per_day: int = Field(10, description="Maximum alerts per day")
    quiet_hours_start: int = Field(22, description="No alerts after this hour (24h format)")
    quiet_hours_end: int = Field(8, description="No alerts before this hour (24h format)")
    
    # Tracking preferences
    auto_track_wishlist: bool = Field(True, description="Auto-track wishlist items")
    auto_track_viewed: bool = Field(False, description="Auto-track recently viewed items")
    default_check_frequency: int = Field(24, description="Default hours between checks")
    
    # Categories of interest for deal discovery
    preferred_categories: List[str] = Field(default_factory=list, description="Categories for deal alerts")
    price_range_min: Optional[float] = Field(None, description="Minimum price for deal alerts")
    price_range_max: Optional[float] = Field(None, description="Maximum price for deal alerts")
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Database collection models for MongoDB
class PriceTrackerDocument(BaseModel):
    """MongoDB document structure for price trackers."""
    id: Optional[str] = Field(None, alias="_id")
    product_id: str
    marketplace: str
    product_title: str
    product_url: str
    current_price: float
    lowest_price: float
    highest_price: float
    average_price: float
    first_seen: datetime
    last_updated: datetime
    check_frequency: int
    is_active: bool
    price_history: List[dict]  # Serialized PriceHistoryEntry objects
    target_price: Optional[float] = None
    price_drop_threshold: float = 0.10
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class PriceAlertDocument(BaseModel):
    """MongoDB document structure for price alerts."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    product_tracker_id: str
    alert_type: str
    target_price: Optional[float] = None
    percentage_threshold: Optional[float] = None
    is_active: bool = True
    created_at: datetime
    triggered_at: Optional[datetime] = None
    notification_sent: bool = False
    email_notification: bool = True
    push_notification: bool = False
    frequency_limit: int = 24
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }