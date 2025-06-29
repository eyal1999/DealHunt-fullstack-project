"""
AI-powered product recommendation models.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class RecommendationType(str, Enum):
    """Types of recommendations."""
    SIMILAR_PRODUCTS = "similar_products"
    PRICE_BASED = "price_based"
    CATEGORY_BASED = "category_based"
    TRENDING = "trending"
    PERSONAL = "personal"
    WISHLIST_BASED = "wishlist_based"
    SEARCH_BASED = "search_based"
    SEASONAL = "seasonal"


class RecommendationReason(str, Enum):
    """Reasons for recommendations."""
    FREQUENTLY_VIEWED = "frequently_viewed"
    SIMILAR_PRODUCTS = "similar_products"
    PRICE_DROP = "price_drop"
    TRENDING_NOW = "trending_now"
    CATEGORY_MATCH = "category_match"
    BRAND_PREFERENCE = "brand_preference"
    WISHLIST_SIMILAR = "wishlist_similar"
    SEARCH_HISTORY = "search_history"
    SEASONAL_TREND = "seasonal_trend"
    ABANDONED_CART = "abandoned_cart"


class ProductRecommendation(BaseModel):
    """Individual product recommendation."""
    product_id: str = Field(..., description="Product identifier")
    marketplace: str = Field(..., description="Source marketplace")
    title: str = Field(..., description="Product title")
    image_url: str = Field("", description="Product image URL")
    product_url: str = Field(..., description="Product detail URL")
    
    # Pricing
    current_price: float = Field(..., description="Current product price")
    original_price: Optional[float] = Field(None, description="Original price if on sale")
    discount_percentage: Optional[float] = Field(None, description="Discount percentage")
    
    # Recommendation metadata
    recommendation_type: RecommendationType = Field(..., description="Type of recommendation")
    recommendation_reason: RecommendationReason = Field(..., description="Reason for recommendation")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Relevance score (0-1)")
    
    # Additional metadata
    category: Optional[str] = Field(None, description="Product category")
    brand: Optional[str] = Field(None, description="Product brand")
    rating: Optional[float] = Field(None, description="Product rating")
    review_count: Optional[int] = Field(None, description="Number of reviews")
    
    # Tracking
    created_at: datetime = Field(default_factory=datetime.now, description="When recommendation was created")
    expires_at: Optional[datetime] = Field(None, description="When recommendation expires")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RecommendationSet(BaseModel):
    """Set of recommendations for a user."""
    user_id: str = Field(..., description="User ID")
    recommendations: List[ProductRecommendation] = Field(..., description="List of recommendations")
    
    # Metadata
    recommendation_type: RecommendationType = Field(..., description="Primary recommendation type")
    generated_at: datetime = Field(default_factory=datetime.now, description="When recommendations were generated")
    context: Dict[str, Any] = Field(default_factory=dict, description="Context used for recommendations")
    
    # Performance tracking
    total_score: float = Field(0.0, description="Combined relevance score")
    diversity_score: float = Field(0.0, description="Diversity across categories/brands")
    freshness_score: float = Field(0.0, description="How recent/trending the recommendations are")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserPreferenceProfile(BaseModel):
    """User preference profile for recommendations."""
    user_id: str = Field(..., description="User ID")
    
    # Category preferences (weighted)
    preferred_categories: Dict[str, float] = Field(default_factory=dict, description="Category preferences with weights")
    preferred_brands: Dict[str, float] = Field(default_factory=dict, description="Brand preferences with weights")
    preferred_marketplaces: Dict[str, float] = Field(default_factory=dict, description="Marketplace preferences")
    
    # Price preferences
    avg_price_range: Dict[str, float] = Field(
        default_factory=lambda: {"min": 0.0, "max": 1000.0}, 
        description="Average price range user shops in"
    )
    price_sensitivity: float = Field(0.5, ge=0.0, le=1.0, description="Price sensitivity (0=not sensitive, 1=very sensitive)")
    
    # Behavioral patterns
    shopping_frequency: float = Field(0.0, description="How often user shops (interactions per week)")
    session_duration_avg: float = Field(0.0, description="Average session duration in minutes")
    conversion_rate: float = Field(0.0, description="Rate of adding to wishlist or buying")
    
    # Product preferences
    prefers_deals: bool = Field(True, description="Prefers discounted items")
    prefers_popular: bool = Field(False, description="Prefers popular/trending items")
    prefers_new: bool = Field(False, description="Prefers new/recently added items")
    quality_focus: float = Field(0.5, ge=0.0, le=1.0, description="Focus on quality vs price (0=price, 1=quality)")
    
    # Seasonal patterns
    seasonal_preferences: Dict[str, List[str]] = Field(
        default_factory=dict, 
        description="Seasonal category preferences"
    )
    
    # Update tracking
    last_updated: datetime = Field(default_factory=datetime.now, description="Last profile update")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Profile confidence based on data amount")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RecommendationFeedback(BaseModel):
    """User feedback on recommendations."""
    user_id: str = Field(..., description="User ID")
    product_id: str = Field(..., description="Product ID")
    marketplace: str = Field(..., description="Marketplace")
    recommendation_type: RecommendationType = Field(..., description="Type of recommendation")
    
    # Feedback types
    clicked: bool = Field(False, description="User clicked on recommendation")
    viewed_details: bool = Field(False, description="User viewed product details")
    added_to_wishlist: bool = Field(False, description="User added to wishlist")
    dismissed: bool = Field(False, description="User dismissed recommendation")
    
    # Explicit feedback
    rating: Optional[int] = Field(None, ge=1, le=5, description="User rating (1-5)")
    helpful: Optional[bool] = Field(None, description="User found recommendation helpful")
    
    # Context
    position_in_list: int = Field(..., description="Position in recommendation list")
    page_context: str = Field("", description="Page where recommendation was shown")
    
    # Timing
    feedback_at: datetime = Field(default_factory=datetime.now, description="When feedback was given")
    time_to_action: Optional[float] = Field(None, description="Time from show to action (seconds)")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TrendingProduct(BaseModel):
    """Trending product data."""
    product_id: str = Field(..., description="Product identifier")
    marketplace: str = Field(..., description="Source marketplace")
    title: str = Field(..., description="Product title")
    
    # Trending metrics
    view_count: int = Field(0, description="Total views")
    view_growth_rate: float = Field(0.0, description="View growth rate")
    wishlist_count: int = Field(0, description="Times added to wishlist")
    search_mentions: int = Field(0, description="Times found in searches")
    
    # Time-based metrics
    daily_views: Dict[str, int] = Field(default_factory=dict, description="Daily view counts")
    weekly_growth: float = Field(0.0, description="Weekly growth percentage")
    trending_score: float = Field(0.0, description="Overall trending score")
    
    # Category and timing
    category: str = Field("", description="Product category")
    trend_started: datetime = Field(default_factory=datetime.now, description="When trend started")
    trend_peak: Optional[datetime] = Field(None, description="Peak trending time")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RecommendationAnalytics(BaseModel):
    """Analytics for recommendation performance."""
    recommendation_type: RecommendationType = Field(..., description="Type of recommendation")
    
    # Performance metrics
    total_shown: int = Field(0, description="Total recommendations shown")
    total_clicked: int = Field(0, description="Total clicks")
    total_conversions: int = Field(0, description="Total conversions (wishlist adds)")
    
    # Rates
    click_through_rate: float = Field(0.0, description="CTR percentage")
    conversion_rate: float = Field(0.0, description="Conversion percentage")
    average_position: float = Field(0.0, description="Average position in recommendation list")
    
    # Quality metrics
    average_rating: float = Field(0.0, description="Average user rating")
    helpfulness_rate: float = Field(0.0, description="Percentage marked as helpful")
    dismissal_rate: float = Field(0.0, description="Percentage dismissed")
    
    # Time-based metrics
    date_range_start: datetime = Field(..., description="Analytics period start")
    date_range_end: datetime = Field(..., description="Analytics period end")
    last_updated: datetime = Field(default_factory=datetime.now, description="Last update")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }