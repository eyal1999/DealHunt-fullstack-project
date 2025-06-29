"""
Price tracking API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime

from app.auth.jwt import get_current_user
from app.models.price_tracking import PriceAlert, PriceHistoryEntry
from app.models.db_models import User
from app.services.price_tracking_service import price_tracking_service

router = APIRouter(prefix="/price-tracking", tags=["Price Tracking"])


@router.post("/alerts", response_model=PriceAlert)
async def create_price_alert(
    product_id: str,
    marketplace: str,
    alert_type: str,
    target_price: Optional[float] = None,
    percentage_threshold: Optional[float] = None,
    current_user: User = Depends(get_current_user)
):
    """Create a new price alert for a product."""
    try:
        # Validate alert type
        valid_types = ["target_price", "percentage_drop", "availability"]
        if alert_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid alert type. Must be one of: {valid_types}"
            )
        
        # Validate required parameters based on alert type
        if alert_type == "target_price" and not target_price:
            raise HTTPException(
                status_code=400,
                detail="target_price is required for target_price alerts"
            )
        
        if alert_type == "percentage_drop" and not percentage_threshold:
            raise HTTPException(
                status_code=400,
                detail="percentage_threshold is required for percentage_drop alerts"
            )
        
        # Initialize service if needed
        if not price_tracking_service.db:
            await price_tracking_service.initialize()
        
        alert = await price_tracking_service.create_price_alert(
            user_id=str(current_user.id),
            product_id=product_id,
            marketplace=marketplace,
            alert_type=alert_type,
            target_price=target_price,
            percentage_threshold=percentage_threshold
        )
        
        return alert
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create price alert")


@router.get("/alerts", response_model=List[PriceAlert])
async def get_user_alerts(current_user: User = Depends(get_current_user)):
    """Get all active price alerts for the current user."""
    try:
        if not price_tracking_service.db:
            await price_tracking_service.initialize()
        
        alerts = await price_tracking_service.get_user_alerts(str(current_user.id))
        return alerts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get price alerts")


@router.delete("/alerts/{alert_id}")
async def delete_price_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a price alert."""
    try:
        if not price_tracking_service.db:
            await price_tracking_service.initialize()
        
        # Update alert to inactive (soft delete)
        result = await price_tracking_service.price_alerts_collection.update_one(
            {"_id": alert_id, "user_id": str(current_user.id)},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete price alert")


@router.get("/history/{marketplace}/{product_id}", response_model=List[PriceHistoryEntry])
async def get_price_history(
    marketplace: str,
    product_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days of history to retrieve")
):
    """Get price history for a product."""
    try:
        if not price_tracking_service.db:
            await price_tracking_service.initialize()
        
        history = await price_tracking_service.get_price_history(
            product_id=product_id,
            marketplace=marketplace,
            days=days
        )
        
        return history
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get price history")


@router.post("/track")
async def start_tracking_product(
    product_id: str,
    marketplace: str,
    current_user: User = Depends(get_current_user)
):
    """Start tracking a product's price."""
    try:
        if not price_tracking_service.db:
            await price_tracking_service.initialize()
        
        # Get product details to initialize tracking
        from app.providers import detail as provider_detail
        
        product_data = provider_detail(marketplace, product_id)
        if not product_data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        tracker = await price_tracking_service.add_product_tracker(
            product_id=product_id,
            marketplace=marketplace,
            product_title=product_data.get('title', 'Unknown Product'),
            product_url=product_data.get('url', ''),
            initial_price=product_data.get('sale_price', 0)
        )
        
        return {
            "message": "Product tracking started",
            "product_id": tracker.product_id,
            "marketplace": tracker.marketplace,
            "current_price": tracker.current_price
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to start tracking product")


@router.get("/trending-drops")
async def get_trending_price_drops(
    limit: int = Query(10, ge=1, le=50, description="Number of trending drops to return")
):
    """Get products with the biggest recent price drops."""
    try:
        if not price_tracking_service.db:
            await price_tracking_service.initialize()
        
        trending = await price_tracking_service.get_trending_price_drops(limit=limit)
        return {
            "trending_drops": trending,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get trending price drops")


@router.post("/update-prices")
async def trigger_price_update():
    """Manually trigger a price update cycle (admin/debug endpoint)."""
    try:
        if not price_tracking_service.db:
            await price_tracking_service.initialize()
        
        await price_tracking_service.run_price_update_cycle()
        return {"message": "Price update cycle completed"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update prices")