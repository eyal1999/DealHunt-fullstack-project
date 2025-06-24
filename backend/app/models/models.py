# backend/app/models/models.py
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, AnyHttpUrl, Field, ConfigDict

# ── Pagination models ──────────────────────────────────────────
class PaginationInfo(BaseModel):
    """Pagination metadata for search results."""
    current_page: int = Field(..., description="Current page number (1-based)")
    page_size: int = Field(..., description="Number of items per page")
    total_items: int = Field(..., description="Total number of items available")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages after current")
    has_previous: bool = Field(..., description="Whether there are pages before current")

# ── Search / detail payloads ────────────────────────────────────
class ProductSummary(BaseModel):
    product_id: str
    title: str
    original_price: float
    sale_price: float
    image: AnyHttpUrl
    detail_url: AnyHttpUrl
    affiliate_link: AnyHttpUrl
    marketplace: str = "aliexpress"
    sold_count: Optional[int] = None
    rating: Optional[float] = None
    shipping_cost: Optional[float] = None
    cached_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )

class SearchResponse(BaseModel):
    """Response model for search results with pagination."""
    query: str
    results: List[ProductSummary]
    pagination: Optional[PaginationInfo] = None  # Made optional for backward compatibility

class ProductDetail(BaseModel):
    product_id: str
    title: str
    original_price: float
    sale_price: float
    main_image: AnyHttpUrl
    images: List[AnyHttpUrl]
    url: AnyHttpUrl
    affiliate_link: AnyHttpUrl
    marketplace: str = "aliexpress"
    sold_count: Optional[int] = None
    rating: Optional[float] = None
    shipping_cost: Optional[float] = None
    cached_at: Optional[datetime] = None
    
    # Additional product information
    description: Optional[str] = None
    condition: Optional[str] = None  # New, Used, Refurbished, etc.
    brand: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    
    # Seller information (eBay) or Shop information (AliExpress)
    seller: Optional[Dict[str, Any]] = None
    
    # Location information
    location: Optional[Dict[str, str]] = None
    
    # Shipping information
    shipping: Optional[List[Dict[str, Any]]] = None
    
    # Product specifications
    specifications: Optional[Dict[str, str]] = None
    
    # Return policy information
    return_policy: Optional[Dict[str, Any]] = None
    
    # Additional metadata
    item_creation_date: Optional[str] = None
    top_rated_seller: Optional[bool] = None
    
    # AliExpress-specific fields
    product_video_url: Optional[str] = None
    categories: Optional[Dict[str, Any]] = None
    discount_percentage: Optional[float] = None
    commission_rate: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )

# ── Affiliate links ─────────────────────────────────────────────
class PromotionLink(BaseModel):
    source_value: AnyHttpUrl
    promotion_link: AnyHttpUrl

class LinkResponse(BaseModel):
    tracking_id: str
    promotion_links: List[PromotionLink]