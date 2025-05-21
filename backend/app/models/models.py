from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, AnyHttpUrl, Field, ConfigDict

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
    sold_count: Optional[int] = None        # added for multi‑provider
    rating: Optional[float] = None
    shipping_cost: Optional[float] = None
    cached_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )

class SearchResponse(BaseModel):
    query: str
    results: List[ProductSummary]

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