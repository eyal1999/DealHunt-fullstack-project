"""
Smart Recommendations Router
Provides endpoints for AliExpress Smart Match API and enhanced recommendations
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.services.smart_match_service import (
    fetch_smart_match_products,
    get_smart_recommendations,
    get_category_smart_match
)

router = APIRouter()


@router.get("/smart-match")
async def smart_match_products(
    keywords: str = Query(..., description="Keywords for smart matching"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Number of products per page"),
    country: str = Query("US", description="Target country code"),
    device_id: Optional[str] = Query(None, description="Device ID for personalization")
):
    """
    Get smart match products using AliExpress Advanced API
    
    This endpoint provides highly relevant and dynamic product recommendations
    based on keywords and optional device ID for personalization.
    """
    try:
        products = fetch_smart_match_products(
            keywords=keywords,
            page_no=page,
            page_size=limit,
            country=country,
            device_id=device_id
        )
        
        return {
            "query": keywords,
            "page": page,
            "limit": limit,
            "total_results": len(products),
            "products": products
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch smart match products: {str(e)}")


@router.get("/recommendations")
async def smart_recommendations(
    query: str = Query(..., description="Search query for recommendations"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of recommendations"),
    device_id: Optional[str] = Query(None, description="Device ID for personalization")
):
    """
    Get smart product recommendations for a query
    
    Returns high-quality, relevant products sorted by smart match score,
    rating, and sales volume with duplicate filtering.
    """
    try:
        recommendations = get_smart_recommendations(
            query=query,
            limit=limit,
            device_id=device_id
        )
        
        return {
            "query": query,
            "recommendations": recommendations,
            "count": len(recommendations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get smart recommendations: {str(e)}")


@router.get("/category-smart-match")
async def category_smart_match(
    category_id: str = Query(..., description="AliExpress category ID"),
    keywords: Optional[str] = Query(None, description="Optional keywords to refine search"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of products")
):
    """
    Get smart match products for a specific category
    
    Combines category filtering with smart matching for highly relevant
    category-specific product recommendations.
    """
    try:
        products = get_category_smart_match(
            category_id=category_id,
            keywords=keywords,
            limit=limit
        )
        
        return {
            "category_id": category_id,
            "keywords": keywords,
            "products": products,
            "count": len(products)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get category smart match: {str(e)}")


@router.get("/categories")
async def get_available_categories():
    """
    Get available categories for smart matching
    
    Returns a list of popular AliExpress categories that can be used
    with the category smart match endpoint.
    """
    # Popular AliExpress categories for smart matching
    categories = [
        {"id": "2", "name": "Home & Garden", "description": "Home improvement and garden supplies"},
        {"id": "3", "name": "Consumer Electronics", "description": "Electronics and gadgets"},
        {"id": "5", "name": "Computer & Office", "description": "Computer hardware and office supplies"},
        {"id": "6", "name": "Phones & Telecommunications", "description": "Mobile phones and accessories"},
        {"id": "7", "name": "Automobiles & Motorcycles", "description": "Auto parts and motorcycle accessories"},
        {"id": "13", "name": "Apparel & Accessories", "description": "Clothing and fashion accessories"},
        {"id": "15", "name": "Jewelry & Accessories", "description": "Jewelry and fashion accessories"},
        {"id": "18", "name": "Beauty & Health", "description": "Cosmetics and health products"},
        {"id": "21", "name": "Watches", "description": "Watches and timepieces"},
        {"id": "26", "name": "Toys & Hobbies", "description": "Toys and hobby items"},
        {"id": "30", "name": "Sports & Entertainment", "description": "Sports equipment and entertainment"},
        {"id": "34", "name": "Lights & Lighting", "description": "LED lights and lighting fixtures"},
        {"id": "36", "name": "Tools", "description": "Hand tools and power tools"},
        {"id": "39", "name": "Security & Protection", "description": "Security systems and safety equipment"},
        {"id": "42", "name": "Mother & Kids", "description": "Baby and children's products"},
        {"id": "44", "name": "Bags & Luggage", "description": "Handbags, backpacks, and luggage"},
        {"id": "46", "name": "Shoes", "description": "Footwear for all occasions"}
    ]
    
    return {
        "categories": categories,
        "count": len(categories)
    }