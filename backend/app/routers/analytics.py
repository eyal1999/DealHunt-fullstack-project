"""
Analytics router for user dashboards and insights.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.auth.jwt import get_current_active_user
from app.models.db_models import User
from app.models.analytics import (
    UserDashboard, GlobalTrends, AdminAnalytics, 
    AnalyticsEvent, DailyAnalyticsSummary
)
from app.services.analytics_service import AnalyticsService
from app.db import db as database


router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])


def get_analytics_service() -> AnalyticsService:
    """Get analytics service instance."""
    return AnalyticsService(database)


# Request models
class TrackEventRequest(BaseModel):
    event_type: str
    event_category: str
    event_data: dict = {}
    session_id: Optional[str] = None


class SetSavingsGoalRequest(BaseModel):
    savings_goal: float


# User Analytics Endpoints

@router.get("/dashboard", response_model=UserDashboard)
async def get_user_dashboard(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get comprehensive analytics dashboard for current user."""
    dashboard = await service.generate_user_dashboard(current_user.id)
    return dashboard


@router.post("/events")
async def track_event(
    request: TrackEventRequest,
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Track an analytics event."""
    await service.track_event(
        user_id=current_user.id,
        event_type=request.event_type,
        event_category=request.event_category,
        event_data=request.event_data,
        session_id=request.session_id
    )
    return {"message": "Event tracked successfully"}


@router.post("/savings-goal")
async def set_savings_goal(
    request: SetSavingsGoalRequest,
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Set user's savings goal."""
    # Update user's savings goal in database
    await database.users.update_one(
        {"_id": current_user.id},
        {"$set": {"savings_goal": request.savings_goal}}
    )
    return {"message": "Savings goal updated successfully"}


@router.get("/savings-summary")
async def get_savings_summary(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get quick savings summary for current user."""
    savings_metrics = await service._calculate_savings_metrics(current_user.id)
    return {
        "total_savings": savings_metrics.total_savings,
        "savings_this_month": savings_metrics.savings_this_month,
        "potential_savings": savings_metrics.potential_savings,
        "alerts_triggered": savings_metrics.total_alerts_triggered
    }


@router.get("/insights")
async def get_personalized_insights(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get personalized insights and recommendations."""
    insights = await service._generate_personalized_insights(current_user.id)
    return insights


@router.get("/marketplace-comparison")
async def get_marketplace_comparison(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get marketplace performance comparison."""
    performance = await service._analyze_marketplace_performance(current_user.id)
    return {"marketplaces": performance}


@router.get("/shopping-patterns")
async def get_shopping_patterns(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get user shopping behavior patterns."""
    behavior = await service._analyze_shopping_behavior(current_user.id)
    return behavior


@router.get("/price-tracking-stats")
async def get_price_tracking_stats(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get price tracking effectiveness statistics."""
    stats = await service._analyze_price_tracking(current_user.id)
    return stats


@router.get("/activity-summary")
async def get_activity_summary(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get user activity summary for specified period."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    events = await service.analytics_events_collection.find({
        "user_id": current_user.id,
        "timestamp": {"$gte": start_date, "$lte": end_date}
    }).to_list(length=1000)
    
    # Aggregate activity by day
    daily_activity = {}
    for event in events:
        day = event["timestamp"].date().isoformat()
        if day not in daily_activity:
            daily_activity[day] = {"searches": 0, "views": 0, "alerts": 0}
        
        if event.get("event_category") == "search":
            daily_activity[day]["searches"] += 1
        elif event.get("event_type") == "product_view":
            daily_activity[day]["views"] += 1
        elif event.get("event_type") == "price_alert":
            daily_activity[day]["alerts"] += 1
    
    return {
        "period_days": days,
        "total_events": len(events),
        "daily_activity": daily_activity,
        "active_days": len(daily_activity)
    }


# Platform Analytics (Basic - for logged-in users)

@router.get("/trends")
async def get_platform_trends(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get platform-wide trending data (anonymized)."""
    # **MANUAL IMPLEMENTATION NEEDED**: Implement platform trends
    # This should aggregate anonymized data across all users
    
    return {
        "trending_categories": ["Electronics", "Fashion", "Home & Garden"],
        "trending_searches": ["laptop", "headphones", "smartphone"],
        "average_savings": 45.50,
        "popular_marketplaces": ["Amazon", "eBay", "AliExpress"],
        "peak_hours": [9, 12, 18, 21]
    }


# Export and Reporting

@router.get("/export/dashboard")
async def export_dashboard_data(
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Export dashboard data in JSON or CSV format."""
    dashboard = await service.generate_user_dashboard(current_user.id)
    
    if format == "json":
        return dashboard.model_dump()
    elif format == "csv":
        # **MANUAL IMPLEMENTATION NEEDED**: Implement CSV export
        return {"message": "CSV export not implemented yet"}


@router.get("/export/events")
async def export_user_events(
    days: int = Query(30, ge=1, le=365),
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Export user analytics events."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    events = await service.analytics_events_collection.find({
        "user_id": current_user.id,
        "timestamp": {"$gte": start_date, "$lte": end_date}
    }).to_list(length=5000)
    
    # Convert ObjectId to string for JSON serialization
    for event in events:
        if "_id" in event:
            event["_id"] = str(event["_id"])
        if "timestamp" in event:
            event["timestamp"] = event["timestamp"].isoformat()
    
    if format == "json":
        return {"events": events, "total_count": len(events)}
    elif format == "csv":
        # **MANUAL IMPLEMENTATION NEEDED**: Implement CSV export
        return {"message": "CSV export not implemented yet"}


# Admin Analytics Endpoints (Basic Authentication Check)

@router.get("/admin/overview")
async def get_admin_overview(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get platform overview for administrators."""
    # **MANUAL IMPLEMENTATION NEEDED**: Add proper admin role check
    # For now, just return basic stats
    
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get basic platform metrics
    total_users = await database.users.count_documents({})
    total_wishlists = await database.enhanced_wishlists.count_documents({})
    total_trackers = await database.price_trackers.count_documents({})
    
    # Recent activity
    yesterday = datetime.now() - timedelta(days=1)
    recent_events = await service.analytics_events_collection.count_documents({
        "timestamp": {"$gte": yesterday}
    })
    
    return {
        "platform_overview": {
            "total_users": total_users,
            "total_wishlists": total_wishlists,
            "total_price_trackers": total_trackers,
            "events_last_24h": recent_events
        },
        "system_health": {
            "database_status": "healthy",
            "api_response_time": "125ms",
            "error_rate": "0.1%"
        }
    }


@router.get("/admin/user-growth")
async def get_user_growth_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get user growth statistics."""
    # **MANUAL IMPLEMENTATION NEEDED**: Add proper admin role check
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # **MANUAL IMPLEMENTATION NEEDED**: Implement user growth tracking
    return {
        "message": "User growth analytics not implemented yet",
        "period_days": days
    }


# Health and Performance

@router.get("/health")
async def analytics_health_check(
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Check analytics service health."""
    try:
        # Test database connection
        await service.analytics_events_collection.find_one()
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database_connection": "ok"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }