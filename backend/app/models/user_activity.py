"""
User activity models for tracking user interactions and preferences.
"""
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from bson import ObjectId


class RecentlyViewedProduct(BaseModel):
    """Track recently viewed products for personalization."""
    product_id: str = Field(..., description="Product identifier")
    marketplace: str = Field(..., description="Source marketplace")
    title: str = Field(..., description="Product title")
    price: float = Field(..., description="Price when viewed")
    image_url: str = Field("", description="Product image URL")
    product_url: str = Field(..., description="Product detail URL")
    viewed_at: datetime = Field(default_factory=datetime.now, description="When product was viewed")
    view_duration: Optional[int] = Field(None, description="Seconds spent viewing (if tracked)")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SearchHistory(BaseModel):
    """Track user search history for improvements and personalization."""
    query: str = Field(..., description="Search query")
    results_count: int = Field(..., description="Number of results returned")
    clicked_products: List[str] = Field(default_factory=list, description="Product IDs that were clicked")
    filters_used: Dict = Field(default_factory=dict, description="Filters applied during search")
    searched_at: datetime = Field(default_factory=datetime.now, description="When search was performed")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserPreferences(BaseModel):
    """User preferences and behavior patterns."""
    user_id: str = Field(..., description="User identifier")
    
    # Category preferences (learned from behavior)
    preferred_categories: List[str] = Field(default_factory=list, description="Frequently viewed categories")
    price_ranges: Dict[str, Dict] = Field(default_factory=dict, description="Typical price ranges by category")
    favorite_marketplaces: List[str] = Field(default_factory=list, description="Preferred marketplaces")
    
    # Search behavior
    common_search_terms: List[str] = Field(default_factory=list, description="Frequently used search terms")
    typical_search_time: Optional[int] = Field(None, description="Typical hour of day for searching (0-23)")
    
    # Interaction patterns
    average_session_duration: Optional[float] = Field(None, description="Average session length in minutes")
    products_per_session: Optional[float] = Field(None, description="Average products viewed per session")
    
    # UI preferences
    preferred_sort_order: str = Field("price_low", description="Default sort preference")
    preferred_view_mode: str = Field("grid", description="Grid or list view preference")
    
    # Notification preferences
    deal_alerts_enabled: bool = Field(True, description="Receive deal notifications")
    email_frequency: str = Field("daily", description="Email notification frequency")
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserActivity(BaseModel):
    """Complete user activity tracking."""
    user_id: str = Field(..., description="User identifier")
    
    # Recently viewed products (limit to last 50)
    recently_viewed: List[RecentlyViewedProduct] = Field(
        default_factory=list, 
        description="Recently viewed products",
        max_items=50
    )
    
    # Search history (limit to last 100)
    search_history: List[SearchHistory] = Field(
        default_factory=list,
        description="Recent search history",
        max_items=100
    )
    
    # User preferences (learned and explicit)
    preferences: UserPreferences = Field(..., description="User preferences")
    
    # Session tracking
    last_active: datetime = Field(default_factory=datetime.now, description="Last activity timestamp")
    total_sessions: int = Field(0, description="Total number of sessions")
    total_products_viewed: int = Field(0, description="Total products viewed")
    total_searches: int = Field(0, description="Total searches performed")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def add_viewed_product(self, product: RecentlyViewedProduct):
        """Add a product to recently viewed list."""
        # Remove if already exists (to move to front)
        self.recently_viewed = [
            p for p in self.recently_viewed 
            if not (p.product_id == product.product_id and p.marketplace == product.marketplace)
        ]
        
        # Add to front
        self.recently_viewed.insert(0, product)
        
        # Keep only last 50
        self.recently_viewed = self.recently_viewed[:50]
        
        # Update counters
        self.total_products_viewed += 1
        self.last_active = datetime.now()
    
    def add_search(self, search: SearchHistory):
        """Add a search to history."""
        self.search_history.insert(0, search)
        self.search_history = self.search_history[:100]  # Keep only last 100
        
        # Update counters
        self.total_searches += 1
        self.last_active = datetime.now()
        
        # Update preferences based on search
        self._update_preferences_from_search(search)
    
    def _update_preferences_from_search(self, search: SearchHistory):
        """Update user preferences based on search behavior."""
        # Add search term to common terms
        query_lower = search.query.lower()
        if query_lower not in self.preferences.common_search_terms:
            self.preferences.common_search_terms.append(query_lower)
        
        # Keep only top 20 common terms
        self.preferences.common_search_terms = self.preferences.common_search_terms[:20]
        
        # Update search time pattern
        hour = search.searched_at.hour
        if self.preferences.typical_search_time is None:
            self.preferences.typical_search_time = hour
        else:
            # Simple running average
            self.preferences.typical_search_time = int(
                (self.preferences.typical_search_time + hour) / 2
            )
        
        self.preferences.updated_at = datetime.now()
    
    def get_category_preferences(self) -> Dict[str, int]:
        """Get category preferences based on viewing history."""
        category_counts = {}
        
        for product in self.recently_viewed:
            # Extract category from product (this would need to be enhanced)
            # For now, we'll use marketplace as a proxy
            category = product.marketplace
            category_counts[category] = category_counts.get(category, 0) + 1
        
        return category_counts
    
    def get_price_preferences(self) -> Dict[str, float]:
        """Get price range preferences based on viewing history."""
        if not self.recently_viewed:
            return {"min": 0, "max": 1000, "average": 50}
        
        prices = [p.price for p in self.recently_viewed if p.price > 0]
        if not prices:
            return {"min": 0, "max": 1000, "average": 50}
        
        return {
            "min": min(prices),
            "max": max(prices),
            "average": sum(prices) / len(prices)
        }


# MongoDB document models
class UserActivityDocument(BaseModel):
    """MongoDB document for user activity."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    recently_viewed: List[dict]  # Serialized RecentlyViewedProduct objects
    search_history: List[dict]   # Serialized SearchHistory objects
    preferences: dict            # Serialized UserPreferences object
    last_active: datetime
    total_sessions: int = 0
    total_products_viewed: int = 0
    total_searches: int = 0
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }