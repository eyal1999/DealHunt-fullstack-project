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

# Dynamic import for AliExpress recommendations to avoid circular dependencies
def get_aliexpress_service():
    try:
        from app.services.aliexpress_recommendations import AliExpressRecommendationService
        return AliExpressRecommendationService
    except Exception as e:
        print(f"AliExpress recommendations service not available: {e}")
        import traceback
        traceback.print_exc()
        return None

# Fallback function if service is not available
def get_mock_recommendations(product_id: str, product_title: str, rec_type: str = "similar", limit: int = 4):
    """Return empty recommendations if service is unavailable."""
    return {
        "success": True,
        "count": 0,
        "recommendations": []
    }

def get_mock_comprehensive_recommendations(product_id: str):
    """Return empty comprehensive recommendations if service is unavailable."""
    return {
        "success": True,
        "product_id": product_id,
        "total_count": 0,
        "recommendations": {
            "similar_products": {
                "count": 0,
                "products": []
            },
            "trending_in_category": {
                "count": 0,
                "products": []
            },
            "price_alternatives": {
                "count": 0,
                "products": []
            }
        }
    }


router = APIRouter(prefix="/recommendations", tags=["AI Recommendations"])


# Simple test endpoint to verify router is working
@router.get("/test")
async def test_router():
    """Simple test to verify the recommendations router is working."""
    return {
        "status": "success",
        "message": "Recommendations router is working!",
        "timestamp": "2024-01-01"
    }


# Debug endpoint to check service status
@router.get("/debug/status")
async def get_recommendations_debug_status():
    """Debug endpoint to check the status of the recommendations service."""
    try:
        AliExpressService = get_aliexpress_service()
        service_available = AliExpressService is not None
        
        # Try to get dependency status
        dependency_status = {}
        try:
            from app.services.aliexpress_recommendations import HAS_DEPENDENCIES
            dependency_status["HAS_DEPENDENCIES"] = HAS_DEPENDENCIES
        except Exception as e:
            dependency_status["import_error"] = str(e)
        
        # Test keyword extraction
        test_results = {}
        if service_available:
            try:
                keywords = AliExpressService.extract_keywords_from_title("Test Wireless Bluetooth Earbuds")
                test_results["keyword_extraction"] = {
                    "success": True,
                    "keywords": keywords
                }
            except Exception as e:
                test_results["keyword_extraction"] = {
                    "success": False,
                    "error": str(e)
                }
        
        return {
            "service_available": service_available,
            "dependency_status": dependency_status,
            "test_results": test_results,
            "debug_info": {
                "python_path": "/recommendations service status",
                "timestamp": "debug_check"
            }
        }
    except Exception as e:
        return {
            "service_available": False,
            "error": str(e),
            "debug_info": {
                "error_type": type(e).__name__
            }
        }


@router.get("/debug/test-simple")
async def test_simple_recommendations():
    """Simple test endpoint for recommendations without authentication."""
    try:
        AliExpressService = get_aliexpress_service()
        
        if not AliExpressService:
            return {
                "success": False,
                "error": "Service not available",
                "fallback_used": True
            }
        
        # Try to get simple similar products
        test_title = "Wireless Bluetooth Headphones"
        test_products = AliExpressService.get_similar_products(
            product_id="test_123",
            product_title=test_title,
            category="electronics",
            limit=2
        )
        
        return {
            "success": True,
            "test_title": test_title,
            "results_count": len(test_products),
            "sample_results": test_products[:2] if test_products else [],
            "message": "This is a test of the recommendations service"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }


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


# NEW: AliExpress-specific real-time recommendations endpoints
@router.get("/aliexpress/similar/{product_id}")
async def get_aliexpress_similar_products(
    product_id: str,
    product_title: str = Query(..., description="Product title for keyword extraction"),
    category: Optional[str] = Query(None, description="Product category"),
    limit: int = Query(8, le=15, description="Number of similar products to return")
):
    """Get AliExpress products similar to the given product using real API data."""
    try:
        AliExpressService = get_aliexpress_service()
        if not AliExpressService:
            return get_mock_recommendations(product_id, product_title, "similar", limit)
        
        similar_products = AliExpressService.get_similar_products(
            product_id=product_id,
            product_title=product_title,
            category=category,
            limit=limit
        )
        
        return {
            "success": True,
            "count": len(similar_products),
            "recommendations": similar_products
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get similar products: {str(e)}"
        )


@router.get("/aliexpress/trending/{category}")
async def get_aliexpress_trending_in_category(
    category: str,
    limit: int = Query(8, le=20, description="Number of trending products to return")
):
    """Get trending AliExpress products in a specific category using hot products API."""
    try:
        AliExpressService = get_aliexpress_service()
        if not AliExpressService:
            return get_mock_recommendations(category, category, "trending", limit)
        
        trending_products = AliExpressService.get_trending_in_category(
            category_name=category,
            limit=limit
        )
        
        return {
            "success": True,
            "category": category,
            "count": len(trending_products),
            "recommendations": trending_products
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trending products: {str(e)}"
        )


@router.get("/aliexpress/price-alternatives")
async def get_aliexpress_price_alternatives(
    current_price: float = Query(..., description="Current product price"),
    product_title: str = Query(..., description="Product title for keyword extraction"),
    price_range_percent: float = Query(0.3, le=0.5, description="Price variance (0.3 = 30%)"),
    limit: int = Query(8, le=15, description="Number of alternatives to return")
):
    """Get AliExpress products with similar functionality but different price points."""
    try:
        AliExpressService = get_aliexpress_service()
        if not AliExpressService:
            return get_mock_recommendations("", product_title, "alternatives", limit)
        
        price_alternatives = AliExpressService.get_price_alternatives(
            current_price=current_price,
            product_title=product_title,
            price_range_percent=price_range_percent,
            limit=limit
        )
        
        return {
            "success": True,
            "price_range": {
                "original": current_price,
                "min": current_price * (1 - price_range_percent),
                "max": current_price * (1 + price_range_percent)
            },
            "count": len(price_alternatives),
            "recommendations": price_alternatives
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get price alternatives: {str(e)}"
        )


@router.get("/aliexpress/comprehensive/{product_id}")
async def get_aliexpress_comprehensive_recommendations(
    product_id: str,
    product_title: str = Query(..., description="Product title for keyword extraction"),
    current_price: float = Query(..., description="Current product price"),
    category: Optional[str] = Query(None, description="Product category"),
    limit_per_type: int = Query(4, le=8, description="Number of recommendations per type")
):
    """Get comprehensive AliExpress recommendations including similar products, trending items, and price alternatives."""
    try:
        AliExpressService = get_aliexpress_service()
        if not AliExpressService:
            return get_mock_comprehensive_recommendations(product_id)
        
        recommendations = AliExpressService.get_comprehensive_recommendations(
            product_id=product_id,
            product_title=product_title,
            current_price=current_price,
            category=category,
            limit_per_type=limit_per_type
        )
        
        total_recommendations = sum(len(products) for products in recommendations.values())
        
        return {
            "success": True,
            "product_id": product_id,
            "total_count": total_recommendations,
            "recommendations": {
                "similar_products": {
                    "count": len(recommendations['similar_products']),
                    "products": recommendations['similar_products']
                },
                "trending_in_category": {
                    "count": len(recommendations['trending_in_category']),
                    "products": recommendations['trending_in_category']
                },
                "price_alternatives": {
                    "count": len(recommendations['price_alternatives']),
                    "products": recommendations['price_alternatives']
                }
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comprehensive recommendations: {str(e)}"
        )