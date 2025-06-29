"""
Automated deal hunting and alerts API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from app.auth.jwt import get_current_user
from app.db import db
from app.services.deal_hunting_service import DealHuntingService
from app.models.deal_hunting import (
    AlertConfig, Deal, DealAlert, DealHuntingStats, HuntingPreferences,
    AlertType, DealSeverity, NotificationChannel, DealFilter
)
from app.models.db_models import User

router = APIRouter(prefix="/api/deal-hunting", tags=["deal-hunting"])


async def get_deal_hunting_service():
    """Dependency to get deal hunting service."""
    return DealHuntingService(db)


@router.post("/alerts", response_model=dict)
async def create_alert_config(
    alert_data: dict,
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Create a new deal alert configuration."""
    try:
        # Parse alert configuration
        alert_config = AlertConfig(
            alert_id="",  # Will be generated
            user_id=str(current_user.id),
            name=alert_data["name"],
            description=alert_data.get("description"),
            alert_types=[AlertType(t) for t in alert_data["alert_types"]],
            filters=DealFilter(**alert_data["filters"]),
            severity_threshold=DealSeverity(alert_data.get("severity_threshold", "low")),
            notification_channels=[NotificationChannel(c) for c in alert_data["notification_channels"]],
            frequency_limit=alert_data.get("frequency_limit", 5),
            quiet_hours_start=alert_data.get("quiet_hours_start"),
            quiet_hours_end=alert_data.get("quiet_hours_end"),
            is_active=alert_data.get("is_active", True)
        )
        
        alert_id = await service.create_alert_config(str(current_user.id), alert_config)
        return {"message": "Alert configuration created successfully", "alert_id": alert_id}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid alert configuration: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


@router.get("/alerts", response_model=List[dict])
async def get_user_alerts(
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get all alert configurations for the current user."""
    try:
        configs = await service.get_user_alert_configs(str(current_user.id))
        return [config.model_dump() for config in configs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")


@router.put("/alerts/{alert_id}")
async def update_alert_config(
    alert_id: str,
    updates: dict,
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Update an alert configuration."""
    try:
        # Verify ownership by checking if alert exists for user
        user_alerts = await service.get_user_alert_configs(str(current_user.id))
        alert_exists = any(alert.alert_id == alert_id for alert in user_alerts)
        
        if not alert_exists:
            raise HTTPException(status_code=404, detail="Alert configuration not found")
        
        success = await service.update_alert_config(alert_id, updates)
        if success:
            return {"message": "Alert configuration updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update alert configuration")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update alert: {str(e)}")


@router.delete("/alerts/{alert_id}")
async def delete_alert_config(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Delete an alert configuration."""
    try:
        success = await service.delete_alert_config(alert_id, str(current_user.id))
        if success:
            return {"message": "Alert configuration deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Alert configuration not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete alert: {str(e)}")


@router.get("/deals", response_model=List[dict])
async def get_user_deals(
    limit: int = Query(50, le=100, description="Maximum number of deals to return"),
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get deals relevant to the current user."""
    try:
        deals = await service.get_user_deals(str(current_user.id), limit)
        return [deal.model_dump() for deal in deals]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deals: {str(e)}")


@router.get("/deals/trending", response_model=List[dict])
async def get_trending_deals(
    limit: int = Query(20, le=50, description="Maximum number of trending deals"),
    category: Optional[str] = Query(None, description="Filter by category"),
    marketplace: Optional[str] = Query(None, description="Filter by marketplace"),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get trending deals across all users."""
    try:
        # **MANUAL IMPLEMENTATION NEEDED**: Implement trending deals logic
        # For now, return recent high-severity deals
        
        filter_query = {"severity": {"$in": ["high", "critical"]}}
        if category:
            filter_query["category"] = category
        if marketplace:
            filter_query["marketplace"] = marketplace
        
        cursor = service.deals_collection.find(filter_query).sort("detected_at", -1).limit(limit)
        deals = []
        
        async for deal_doc in cursor:
            deal = Deal(
                deal_id=deal_doc["deal_id"],
                product_id=deal_doc["product_id"],
                marketplace=deal_doc["marketplace"],
                title=deal_doc["title"],
                description=deal_doc.get("description"),
                image_url=deal_doc.get("image_url"),
                product_url=deal_doc["product_url"],
                category=deal_doc.get("category"),
                brand=deal_doc.get("brand"),
                current_price=deal_doc["current_price"],
                original_price=deal_doc["original_price"],
                discount_amount=deal_doc["discount_amount"],
                discount_percentage=deal_doc["discount_percentage"],
                currency=deal_doc.get("currency", "USD"),
                deal_type=AlertType(deal_doc["deal_type"]),
                severity=DealSeverity(deal_doc["severity"]),
                detected_at=deal_doc.get("detected_at", datetime.now()),
                expires_at=deal_doc.get("expires_at"),
                rating=deal_doc.get("rating"),
                review_count=deal_doc.get("review_count"),
                in_stock=deal_doc.get("in_stock", True),
                tags=deal_doc.get("tags", []),
                metadata=deal_doc.get("metadata", {})
            )
            deals.append(deal.model_dump())
        
        return deals
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending deals: {str(e)}")


@router.get("/deals/{deal_id}", response_model=dict)
async def get_deal_details(
    deal_id: str,
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get detailed information about a specific deal."""
    try:
        deal_doc = await service.deals_collection.find_one({"deal_id": deal_id})
        if not deal_doc:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        deal = Deal(
            deal_id=deal_doc["deal_id"],
            product_id=deal_doc["product_id"],
            marketplace=deal_doc["marketplace"],
            title=deal_doc["title"],
            description=deal_doc.get("description"),
            image_url=deal_doc.get("image_url"),
            product_url=deal_doc["product_url"],
            category=deal_doc.get("category"),
            brand=deal_doc.get("brand"),
            current_price=deal_doc["current_price"],
            original_price=deal_doc["original_price"],
            discount_amount=deal_doc["discount_amount"],
            discount_percentage=deal_doc["discount_percentage"],
            currency=deal_doc.get("currency", "USD"),
            deal_type=AlertType(deal_doc["deal_type"]),
            severity=DealSeverity(deal_doc["severity"]),
            detected_at=deal_doc.get("detected_at", datetime.now()),
            expires_at=deal_doc.get("expires_at"),
            rating=deal_doc.get("rating"),
            review_count=deal_doc.get("review_count"),
            in_stock=deal_doc.get("in_stock", True),
            tags=deal_doc.get("tags", []),
            metadata=deal_doc.get("metadata", {})
        )
        
        return deal.model_dump()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deal details: {str(e)}")


@router.post("/hunt")
async def trigger_deal_hunt(
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Manually trigger a deal hunting scan."""
    try:
        deals = await service.hunt_for_deals()
        return {
            "message": "Deal hunt completed successfully",
            "deals_found": len(deals),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger deal hunt: {str(e)}")


@router.get("/alerts/history", response_model=List[dict])
async def get_alert_history(
    limit: int = Query(50, le=100, description="Maximum number of alerts to return"),
    days: int = Query(30, le=365, description="Number of days to look back"),
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get alert history for the current user."""
    try:
        start_date = datetime.now() - timedelta(days=days)
        
        cursor = service.deal_alerts_collection.find({
            "user_id": str(current_user.id),
            "sent_at": {"$gte": start_date}
        }).sort("sent_at", -1).limit(limit)
        
        alerts = []
        async for alert_doc in cursor:
            alert = DealAlert(
                alert_id=alert_doc["alert_id"],
                deal_id=alert_doc["deal_id"],
                user_id=alert_doc["user_id"],
                alert_type=AlertType(alert_doc["alert_type"]),
                severity=DealSeverity(alert_doc["severity"]),
                message=alert_doc["message"],
                channels_sent=[NotificationChannel(c) for c in alert_doc["channels_sent"]],
                sent_at=alert_doc["sent_at"],
                read_at=alert_doc.get("read_at"),
                clicked_at=alert_doc.get("clicked_at"),
                metadata=alert_doc.get("metadata", {})
            )
            alerts.append(alert.model_dump())
        
        return alerts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alert history: {str(e)}")


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Mark an alert as read."""
    try:
        success = await service.mark_alert_read(alert_id, str(current_user.id))
        if success:
            return {"message": "Alert marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark alert as read: {str(e)}")


@router.post("/alerts/{alert_id}/click")
async def mark_alert_clicked(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Mark an alert as clicked."""
    try:
        success = await service.mark_alert_clicked(alert_id, str(current_user.id))
        if success:
            return {"message": "Alert marked as clicked"}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark alert as clicked: {str(e)}")


@router.get("/stats", response_model=dict)
async def get_hunting_stats(
    days: int = Query(30, le=365, description="Number of days for statistics"),
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get deal hunting statistics for the current user."""
    try:
        stats = await service.get_hunting_stats(str(current_user.id), days)
        return stats.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get hunting stats: {str(e)}")


@router.get("/categories")
async def get_deal_categories(
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get available deal categories."""
    try:
        # Get unique categories from deals collection
        categories = await service.deals_collection.distinct("category")
        return {"categories": [cat for cat in categories if cat]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get categories: {str(e)}")


@router.get("/marketplaces")
async def get_deal_marketplaces(
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Get available marketplaces."""
    try:
        # Get unique marketplaces from deals collection
        marketplaces = await service.deals_collection.distinct("marketplace")
        return {"marketplaces": [mp for mp in marketplaces if mp]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get marketplaces: {str(e)}")


# Admin endpoints (require admin role)
@router.post("/admin/hunt")
async def admin_trigger_hunt(
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Admin endpoint to trigger system-wide deal hunt."""
    # **MANUAL IMPLEMENTATION NEEDED**: Add admin role check
    try:
        deals = await service.hunt_for_deals()
        return {
            "message": "System-wide deal hunt completed",
            "deals_found": len(deals),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger hunt: {str(e)}")


@router.post("/admin/cleanup")
async def admin_cleanup_old_data(
    days: int = Query(30, description="Days of data to keep"),
    current_user: User = Depends(get_current_user),
    service: DealHuntingService = Depends(get_deal_hunting_service)
):
    """Admin endpoint to clean up old deals and alerts."""
    # **MANUAL IMPLEMENTATION NEEDED**: Add admin role check
    try:
        await service.cleanup_old_deals(days)
        return {"message": f"Cleaned up data older than {days} days"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup data: {str(e)}")


# Utility endpoints
@router.get("/alert-types")
async def get_alert_types():
    """Get available alert types."""
    return {
        "alert_types": [
            {"value": alert_type.value, "name": alert_type.value.replace("_", " ").title()}
            for alert_type in AlertType
        ]
    }


@router.get("/severity-levels")
async def get_severity_levels():
    """Get available severity levels."""
    return {
        "severity_levels": [
            {"value": severity.value, "name": severity.value.title()}
            for severity in DealSeverity
        ]
    }


@router.get("/notification-channels")
async def get_notification_channels():
    """Get available notification channels."""
    return {
        "notification_channels": [
            {"value": channel.value, "name": channel.value.replace("_", " ").title()}
            for channel in NotificationChannel
        ]
    }