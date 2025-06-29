"""
AI-powered product recommendations router.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.auth.jwt import get_current_active_user
from app.models.db_models import User
from app.models.recommendations import (
    RecommendationSet, ProductRecommendation, UserPreferenceProfile,
    RecommendationFeedback, TrendingProduct, RecommendationType,
    RecommendationReason
)
from app.services.recommendation_service import RecommendationService
from app.db import db as database


router = APIRouter(prefix="/recommendations", tags=["AI Recommendations"])


def get_recommendation_service() -> RecommendationService:
    """Get recommendation service instance."""
    return RecommendationService(database)


# Request/Response models
class RecommendationRequest(BaseModel):
    recommendation_type: Optional[RecommendationType] = RecommendationType.PERSONAL
    limit: int = 10
    context: Dict[str, Any] = {}


class FeedbackRequest(BaseModel):
    product_id: str
    marketplace: str
    recommendation_type: RecommendationType
    clicked: bool = False
    viewed_details: bool = False
    added_to_wishlist: bool = False
    dismissed: bool = False
    rating: Optional[int] = None
    helpful: Optional[bool] = None
    position_in_list: int
    page_context: str = ""


class ProfileUpdateRequest(BaseModel):
    preferred_categories: Optional[Dict[str, float]] = None
    preferred_brands: Optional[Dict[str, float]] = None
    preferred_marketplaces: Optional[Dict[str, float]] = None
    avg_price_range: Optional[Dict[str, float]] = None
    price_sensitivity: Optional[float] = None
    prefers_deals: Optional[bool] = None
    prefers_popular: Optional[bool] = None
    prefers_new: Optional[bool] = None
    quality_focus: Optional[float] = None


@router.get("/", response_model=RecommendationSet)
async def get_recommendations(
    recommendation_type: RecommendationType = Query(RecommendationType.PERSONAL),
    limit: int = Query(10, le=50),
    page_context: str = Query("", description="Context where recommendations are shown"),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get personalized product recommendations."""
    context = {
        "page_context": page_context,
        "timestamp": "now"  # Would be actual timestamp
    }
    
    recommendations = await service.get_recommendations(
        user_id=current_user.id,
        recommendation_type=recommendation_type,
        limit=limit,
        context=context
    )
    
    return recommendations


@router.get("/similar/{marketplace}/{product_id}", response_model=List[ProductRecommendation])
async def get_similar_products(
    marketplace: str,
    product_id: str,
    limit: int = Query(8, le=20),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get products similar to a specific product."""
    context = {
        "reference_product": {
            "product_id": product_id,
            "marketplace": marketplace
        },
        "page_context": "product_detail"
    }
    
    recommendations = await service.get_recommendations(
        user_id=current_user.id,
        recommendation_type=RecommendationType.SIMILAR_PRODUCTS,
        limit=limit,
        context=context
    )
    
    return recommendations.recommendations


@router.get("/trending", response_model=List[ProductRecommendation])
async def get_trending_recommendations(
    limit: int = Query(20, le=50),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get trending product recommendations."""
    context = {
        "page_context": "trending",
        "category_filter": category
    }
    
    recommendations = await service.get_recommendations(
        user_id=current_user.id,
        recommendation_type=RecommendationType.TRENDING,
        limit=limit,
        context=context
    )
    
    return recommendations.recommendations


@router.get("/deals", response_model=List[ProductRecommendation])
async def get_deal_recommendations(
    limit: int = Query(15, le=30),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get deal and price drop recommendations."""
    context = {
        "page_context": "deals",
        "max_price": max_price
    }
    
    recommendations = await service.get_recommendations(
        user_id=current_user.id,
        recommendation_type=RecommendationType.PRICE_BASED,
        limit=limit,
        context=context
    )
    
    return recommendations.recommendations


@router.get("/for-you", response_model=List[ProductRecommendation])
async def get_personalized_recommendations(
    limit: int = Query(12, le=25),
    exclude_categories: List[str] = Query([], description="Categories to exclude"),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get highly personalized 'For You' recommendations."""
    context = {
        "page_context": "for_you",
        "exclude_categories": exclude_categories
    }
    
    recommendations = await service.get_recommendations(
        user_id=current_user.id,
        recommendation_type=RecommendationType.PERSONAL,
        limit=limit,
        context=context
    )
    
    return recommendations.recommendations


@router.get("/wishlist-based", response_model=List[ProductRecommendation])
async def get_wishlist_recommendations(
    limit: int = Query(10, le=20),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get recommendations based on wishlist items."""
    context = {
        "page_context": "wishlist_recommendations"
    }
    
    recommendations = await service.get_recommendations(
        user_id=current_user.id,
        recommendation_type=RecommendationType.WISHLIST_BASED,
        limit=limit,
        context=context
    )
    
    return recommendations.recommendations


@router.get("/search-based", response_model=List[ProductRecommendation])
async def get_search_based_recommendations(
    limit: int = Query(8, le=15),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get recommendations based on search history."""
    context = {
        "page_context": "search_recommendations"
    }
    
    recommendations = await service.get_recommendations(
        user_id=current_user.id,
        recommendation_type=RecommendationType.SEARCH_BASED,
        limit=limit,
        context=context
    )
    
    return recommendations.recommendations


@router.post("/feedback", response_model=dict)
async def submit_recommendation_feedback(
    feedback: FeedbackRequest,
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Submit feedback on a recommendation."""
    feedback_obj = RecommendationFeedback(
        user_id=current_user.id,
        **feedback.model_dump()
    )
    
    # Store feedback in database
    await service.db.recommendation_feedback.insert_one(feedback_obj.model_dump())
    
    # Update user profile based on feedback
    await service._update_profile_from_feedback(current_user.id, feedback_obj)
    
    return {"message": "Feedback recorded successfully"}


@router.get("/profile", response_model=UserPreferenceProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get user's recommendation preference profile."""
    profile = await service.get_user_profile(current_user.id)
    return profile


@router.put("/profile", response_model=dict)
async def update_user_profile(
    updates: ProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Update user's recommendation preferences."""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if update_data:
        await service.update_user_profile(current_user.id, update_data)
        return {"message": "Profile updated successfully"}
    else:
        return {"message": "No updates provided"}


@router.get("/trending-products", response_model=List[TrendingProduct])
async def get_trending_products_list(
    limit: int = Query(20, le=50),
    category: Optional[str] = Query(None, description="Filter by category"),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get list of trending products (public endpoint)."""
    trending_products = await service.get_trending_products(limit)
    
    if category:
        trending_products = [p for p in trending_products if p.category == category]
    
    return trending_products


@router.get("/categories", response_model=List[str])
async def get_recommendation_categories(
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get available product categories for recommendations."""
    # This would typically come from your product catalog
    categories = [
        "electronics",
        "fashion",
        "home",
        "books",
        "sports",
        "beauty",
        "toys",
        "automotive",
        "garden",
        "health"
    ]
    
    return categories


@router.post("/refresh-profile", response_model=dict)
async def refresh_user_profile(
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Refresh user profile based on recent activity."""
    # This would analyze recent user activity and update preferences
    await service._refresh_user_profile_from_activity(current_user.id)
    
    return {"message": "Profile refreshed from recent activity"}


@router.get("/insights", response_model=dict)
async def get_recommendation_insights(
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """Get insights about user's recommendation patterns."""
    profile = await service.get_user_profile(current_user.id)
    
    # Calculate insights
    top_categories = sorted(
        profile.preferred_categories.items(), 
        key=lambda x: x[1], 
        reverse=True
    )[:5]
    
    top_brands = sorted(
        profile.preferred_brands.items(), 
        key=lambda x: x[1], 
        reverse=True
    )[:5]
    
    insights = {
        "profile_completeness": min(1.0, profile.confidence),
        "top_categories": [{"category": cat, "score": score} for cat, score in top_categories],
        "top_brands": [{"brand": brand, "score": score} for brand, score in top_brands],
        "price_range": profile.avg_price_range,
        "shopping_patterns": {
            "frequency": profile.shopping_frequency,
            "avg_session_duration": profile.session_duration_avg,
            "conversion_rate": profile.conversion_rate,
            "prefers_deals": profile.prefers_deals,
            "quality_focus": profile.quality_focus
        },
        "recommendations_summary": {
            "last_generated": "recent",  # Would be actual timestamp
            "total_shown": 0,  # Would be calculated from analytics
            "click_rate": 0.0,  # Would be calculated from feedback
            "conversion_rate": 0.0  # Would be calculated from feedback
        }
    }
    
    return insights