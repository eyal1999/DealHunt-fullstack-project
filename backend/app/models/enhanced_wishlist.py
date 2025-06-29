"""
Enhanced wishlist models with multiple lists, sharing, and analytics.
"""
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from bson import ObjectId


class WishlistProduct(BaseModel):
    """Enhanced product model for wishlists."""
    product_id: str = Field(..., description="Product identifier")
    marketplace: str = Field(..., description="Source marketplace")
    title: str = Field(..., description="Product title")
    image_url: str = Field("", description="Product image URL")
    product_url: str = Field(..., description="Product detail URL")
    
    # Price information
    original_price: float = Field(..., description="Original product price")
    sale_price: float = Field(..., description="Current sale price")
    target_price: Optional[float] = Field(None, description="User's target price for alerts")
    lowest_price_seen: Optional[float] = Field(None, description="Lowest price ever recorded")
    
    # Metadata
    added_at: datetime = Field(default_factory=datetime.now, description="When added to wishlist")
    last_price_check: Optional[datetime] = Field(None, description="Last price update")
    notes: str = Field("", description="User notes about this product")
    priority: int = Field(1, description="Priority level (1-5, 5 = highest)")
    
    # Tracking
    price_alerts_enabled: bool = Field(True, description="Enable price alerts for this item")
    availability_alerts_enabled: bool = Field(False, description="Alert when back in stock")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Wishlist(BaseModel):
    """Enhanced wishlist with multiple lists and sharing."""
    id: Optional[str] = Field(None, description="Wishlist ID")
    user_id: str = Field(..., description="Owner user ID")
    
    # Basic info
    name: str = Field(..., description="Wishlist name")
    description: str = Field("", description="Wishlist description")
    color: str = Field("#3B82F6", description="Color theme for the list")
    icon: str = Field("heart", description="Icon identifier")
    
    # Products
    products: List[WishlistProduct] = Field(default_factory=list, description="Products in wishlist")
    
    # Sharing and privacy
    is_public: bool = Field(False, description="Whether list is publicly viewable")
    is_shared: bool = Field(False, description="Whether list is shared with others")
    shared_with: List[str] = Field(default_factory=list, description="User IDs with access")
    share_token: Optional[str] = Field(None, description="Public sharing token")
    
    # Analytics
    total_value: float = Field(0.0, description="Total value of all products")
    potential_savings: float = Field(0.0, description="Potential savings from target prices")
    view_count: int = Field(0, description="Number of times viewed")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="When list was created")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update time")
    last_accessed: datetime = Field(default_factory=datetime.now, description="Last access time")
    
    # Organization
    tags: List[str] = Field(default_factory=list, description="Tags for organization")
    category: str = Field("general", description="List category")
    sort_order: str = Field("date_added", description="Default sort order")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def add_product(self, product: WishlistProduct):
        """Add a product to the wishlist."""
        # Remove if already exists (to avoid duplicates)
        self.products = [
            p for p in self.products 
            if not (p.product_id == product.product_id and p.marketplace == product.marketplace)
        ]
        
        # Add new product
        self.products.append(product)
        self.updated_at = datetime.now()
        self._update_analytics()
    
    def remove_product(self, product_id: str, marketplace: str):
        """Remove a product from the wishlist."""
        self.products = [
            p for p in self.products 
            if not (p.product_id == product_id and p.marketplace == marketplace)
        ]
        self.updated_at = datetime.now()
        self._update_analytics()
    
    def _update_analytics(self):
        """Update wishlist analytics."""
        if not self.products:
            self.total_value = 0.0
            self.potential_savings = 0.0
            return
        
        # Calculate total value
        self.total_value = sum(p.sale_price for p in self.products)
        
        # Calculate potential savings
        savings = 0.0
        for product in self.products:
            if product.target_price and product.sale_price > product.target_price:
                savings += product.sale_price - product.target_price
        self.potential_savings = savings
    
    def get_products_needing_price_check(self) -> List[WishlistProduct]:
        """Get products that need price updates."""
        cutoff_time = datetime.now().timestamp() - (24 * 60 * 60)  # 24 hours ago
        
        return [
            p for p in self.products
            if (p.last_price_check is None or 
                p.last_price_check.timestamp() < cutoff_time)
        ]


class WishlistShare(BaseModel):
    """Wishlist sharing configuration."""
    wishlist_id: str = Field(..., description="Wishlist being shared")
    owner_id: str = Field(..., description="Wishlist owner")
    shared_with_id: str = Field(..., description="User receiving access")
    permission_level: str = Field("view", description="Permission level: view, edit")
    shared_at: datetime = Field(default_factory=datetime.now, description="When shared")
    message: str = Field("", description="Optional message from sharer")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WishlistAnalytics(BaseModel):
    """Analytics for wishlist usage."""
    user_id: str = Field(..., description="User ID")
    
    # Overall stats
    total_wishlists: int = Field(0, description="Total number of wishlists")
    total_products: int = Field(0, description="Total products across all lists")
    total_value: float = Field(0.0, description="Total value of all products")
    
    # Price tracking stats
    products_with_alerts: int = Field(0, description="Products with price alerts enabled")
    alerts_triggered: int = Field(0, description="Total alerts triggered")
    money_saved: float = Field(0.0, description="Total money saved from alerts")
    
    # Sharing stats
    lists_shared: int = Field(0, description="Lists shared with others")
    lists_received: int = Field(0, description="Lists shared with user")
    
    # Category breakdown
    category_distribution: Dict[str, int] = Field(default_factory=dict, description="Products by category")
    marketplace_distribution: Dict[str, int] = Field(default_factory=dict, description="Products by marketplace")
    
    # Time-based stats
    most_active_day: Optional[str] = Field(None, description="Day of week with most activity")
    average_list_size: float = Field(0.0, description="Average products per list")
    
    last_updated: datetime = Field(default_factory=datetime.now, description="Last analytics update")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# MongoDB document models
class WishlistDocument(BaseModel):
    """MongoDB document structure for enhanced wishlists."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    name: str
    description: str = ""
    color: str = "#3B82F6"
    icon: str = "heart"
    products: List[dict]  # Serialized WishlistProduct objects
    is_public: bool = False
    is_shared: bool = False
    shared_with: List[str] = []
    share_token: Optional[str] = None
    total_value: float = 0.0
    potential_savings: float = 0.0
    view_count: int = 0
    created_at: datetime
    updated_at: datetime
    last_accessed: datetime
    tags: List[str] = []
    category: str = "general"
    sort_order: str = "date_added"
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }