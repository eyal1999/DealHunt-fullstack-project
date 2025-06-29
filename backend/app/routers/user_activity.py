"""
User activity API endpoints for tracking and personalization.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Optional
from pydantic import BaseModel

from app.auth.jwt import get_current_user
from app.models.db_models import User
from app.models.user_activity import RecentlyViewedProduct, UserPreferences
from app.services.user_activity_service import user_activity_service

router = APIRouter(prefix="/activity", tags=["User Activity"])


class ProductViewRequest(BaseModel):
    """Request model for tracking product views."""
    product_id: str
    marketplace: str
    title: str
    price: float
    image_url: str = ""
    product_url: str = ""
    view_duration: Optional[int] = None


class SearchTrackingRequest(BaseModel):
    """Request model for tracking searches."""
    query: str
    results_count: int
    filters_used: Dict = {}
    clicked_products: List[str] = []


class PreferencesUpdateRequest(BaseModel):
    """Request model for updating user preferences."""
    preferred_sort_order: Optional[str] = None
    preferred_view_mode: Optional[str] = None
    deal_alerts_enabled: Optional[bool] = None
    email_frequency: Optional[str] = None


@router.post("/track/product-view")
async def track_product_view(
    request: ProductViewRequest,
    current_user: User = Depends(get_current_user)
):
    """Track when a user views a product."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        await user_activity_service.track_product_view(
            user_id=str(current_user.id),
            product_id=request.product_id,
            marketplace=request.marketplace,
            title=request.title,
            price=request.price,
            image_url=request.image_url,
            product_url=request.product_url,
            view_duration=request.view_duration
        )
        
        return {"message": "Product view tracked successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to track product view")


@router.post("/track/search")
async def track_search(
    request: SearchTrackingRequest,
    current_user: User = Depends(get_current_user)
):
    """Track when a user performs a search."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        await user_activity_service.track_search(
            user_id=str(current_user.id),
            query=request.query,
            results_count=request.results_count,
            filters_used=request.filters_used,
            clicked_products=request.clicked_products
        )
        
        return {"message": "Search tracked successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to track search")


@router.get("/recently-viewed", response_model=List[RecentlyViewedProduct])
async def get_recently_viewed(
    limit: int = Query(20, ge=1, le=50, description="Number of products to return"),
    current_user: User = Depends(get_current_user)
):
    """Get recently viewed products for the current user."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        products = await user_activity_service.get_recently_viewed(
            user_id=str(current_user.id),
            limit=limit
        )
        
        return products
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get recently viewed products")


@router.get("/search-suggestions")
async def get_search_suggestions(
    limit: int = Query(10, ge=1, le=20, description="Number of suggestions to return"),
    current_user: User = Depends(get_current_user)
):
    """Get search suggestions based on user history."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        suggestions = await user_activity_service.get_search_suggestions(
            user_id=str(current_user.id),
            limit=limit
        )
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get search suggestions")


@router.get("/preferences", response_model=UserPreferences)
async def get_user_preferences(current_user: User = Depends(get_current_user)):
    """Get user preferences."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        preferences = await user_activity_service.get_user_preferences(str(current_user.id))
        return preferences
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user preferences")


@router.put("/preferences")
async def update_user_preferences(
    request: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user preferences."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        # Convert request to dict, excluding None values
        updates = {k: v for k, v in request.dict().items() if v is not None}
        
        if not updates:
            raise HTTPException(status_code=400, detail="No preferences provided to update")
        
        await user_activity_service.update_user_preferences(
            user_id=str(current_user.id),
            preferences_update=updates
        )
        
        return {"message": "Preferences updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update preferences")


@router.get("/recommendations")
async def get_personalized_recommendations(
    limit: int = Query(10, ge=1, le=20, description="Number of recommendations to return"),
    current_user: User = Depends(get_current_user)
):
    """Get personalized product recommendations."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        recommendations = await user_activity_service.get_personalized_recommendations(
            user_id=str(current_user.id),
            limit=limit
        )
        
        return {"recommendations": recommendations}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get recommendations")


@router.get("/analytics")
async def get_user_analytics(current_user: User = Depends(get_current_user)):
    """Get analytics about user behavior."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        analytics = await user_activity_service.get_user_analytics(str(current_user.id))
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user analytics")


@router.delete("/cleanup")
async def cleanup_old_activity(
    days_to_keep: int = Query(90, ge=30, le=365, description="Days of activity to keep"),
    current_user: User = Depends(get_current_user)
):
    """Clean up old user activity data (admin endpoint)."""
    try:
        if not user_activity_service.db:
            await user_activity_service.initialize()
        
        await user_activity_service.cleanup_old_activity(days_to_keep=days_to_keep)
        return {"message": f"Cleaned up activity older than {days_to_keep} days"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to cleanup old activity")