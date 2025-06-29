"""
Advanced analytics models for user behavior, savings, and marketplace insights.
"""
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class SavingsMetrics(BaseModel):
    """User savings analytics."""
    total_savings: float = Field(0.0, description="Total money saved")
    potential_savings: float = Field(0.0, description="Potential savings from current wishlist")
    average_discount_percentage: float = Field(0.0, description="Average discount percentage")
    best_deal_savings: float = Field(0.0, description="Largest single saving")
    savings_this_month: float = Field(0.0, description="Savings in current month")
    savings_this_year: float = Field(0.0, description="Savings in current year")
    total_alerts_triggered: int = Field(0, description="Total price alerts triggered")
    successful_purchases: int = Field(0, description="Purchases made after price drops")


class ShoppingBehavior(BaseModel):
    """User shopping behavior analytics."""
    total_searches: int = Field(0, description="Total search queries")
    favorite_categories: List[str] = Field([], description="Most searched categories")
    favorite_marketplaces: List[str] = Field([], description="Most used marketplaces")
    average_price_range: Dict[str, float] = Field({}, description="Average price ranges by category")
    shopping_frequency: Dict[str, int] = Field({}, description="Shopping activity by day/hour")
    search_patterns: List[str] = Field([], description="Common search keywords")
    session_duration_avg: float = Field(0.0, description="Average session duration in minutes")
    bounce_rate: float = Field(0.0, description="Percentage of single-page sessions")


class WishlistAnalytics(BaseModel):
    """Wishlist usage analytics."""
    total_wishlists: int = Field(0, description="Total number of wishlists")
    total_products: int = Field(0, description="Total products across all wishlists")
    average_products_per_list: float = Field(0.0, description="Average products per wishlist")
    most_active_wishlist: Optional[str] = Field(None, description="Most frequently accessed wishlist")
    category_distribution: Dict[str, int] = Field({}, description="Products by category")
    price_distribution: Dict[str, int] = Field({}, description="Products by price range")
    staleness_metrics: Dict[str, int] = Field({}, description="Age distribution of wishlist items")
    conversion_rate: float = Field(0.0, description="Percentage of wishlist items purchased")


class MarketplacePerformance(BaseModel):
    """Marketplace comparison analytics."""
    marketplace: str = Field(..., description="Marketplace name")
    total_products_tracked: int = Field(0, description="Total products tracked")
    average_price: float = Field(0.0, description="Average product price")
    price_volatility: float = Field(0.0, description="Price change frequency")
    average_discount: float = Field(0.0, description="Average discount percentage")
    response_time: float = Field(0.0, description="Average API response time")
    success_rate: float = Field(0.0, description="API success rate")
    user_satisfaction: float = Field(0.0, description="User rating for this marketplace")


class PriceTrackingAnalytics(BaseModel):
    """Price tracking effectiveness analytics."""
    total_trackers: int = Field(0, description="Total active price trackers")
    alerts_sent: int = Field(0, description="Total alerts sent")
    alert_accuracy: float = Field(0.0, description="Percentage of accurate price drops")
    average_tracking_duration: float = Field(0.0, description="Average days tracking a product")
    fastest_price_drop: Dict[str, Any] = Field({}, description="Quickest price drop detected")
    biggest_price_drop: Dict[str, Any] = Field({}, description="Largest price drop detected")
    seasonal_trends: Dict[str, List[float]] = Field({}, description="Price trends by season")


class UserEngagement(BaseModel):
    """User engagement and retention analytics."""
    total_sessions: int = Field(0, description="Total user sessions")
    active_days: int = Field(0, description="Days with activity")
    daily_active_streak: int = Field(0, description="Current consecutive active days")
    feature_usage: Dict[str, int] = Field({}, description="Usage count by feature")
    notification_engagement: float = Field(0.0, description="Notification click-through rate")
    social_activity: Dict[str, int] = Field({}, description="Social feature usage")
    retention_score: float = Field(0.0, description="User retention prediction score")


class GlobalTrends(BaseModel):
    """Platform-wide trending analytics."""
    trending_products: List[Dict[str, Any]] = Field([], description="Currently trending products")
    trending_categories: List[str] = Field([], description="Most popular categories")
    trending_searches: List[str] = Field([], description="Popular search terms")
    marketplace_market_share: Dict[str, float] = Field({}, description="Marketplace usage distribution")
    average_savings_platform: float = Field(0.0, description="Platform average savings")
    peak_activity_hours: List[int] = Field([], description="Most active hours")
    seasonal_demand: Dict[str, Dict[str, float]] = Field({}, description="Seasonal category demand")


class UserDashboard(BaseModel):
    """Complete user analytics dashboard."""
    user_id: str = Field(..., description="User identifier")
    generated_at: datetime = Field(default_factory=datetime.now, description="Dashboard generation time")
    
    # Core metrics
    savings_metrics: SavingsMetrics
    shopping_behavior: ShoppingBehavior
    wishlist_analytics: WishlistAnalytics
    user_engagement: UserEngagement
    
    # Comparative metrics
    marketplace_performance: List[MarketplacePerformance]
    price_tracking_analytics: PriceTrackingAnalytics
    
    # Insights and recommendations
    personalized_insights: List[str] = Field([], description="AI-generated insights")
    recommendations: List[str] = Field([], description="Behavioral recommendations")
    achievements: List[Dict[str, Any]] = Field([], description="User achievements/badges")
    
    # Goals and targets
    savings_goal: Optional[float] = Field(None, description="User's savings goal")
    goal_progress: float = Field(0.0, description="Progress towards savings goal")
    next_milestone: Optional[str] = Field(None, description="Next achievement milestone")


class AdminAnalytics(BaseModel):
    """Platform analytics for administrators."""
    platform_overview: Dict[str, Any] = Field({}, description="High-level platform metrics")
    user_growth: Dict[str, int] = Field({}, description="User growth trends")
    feature_adoption: Dict[str, float] = Field({}, description="Feature adoption rates")
    system_performance: Dict[str, float] = Field({}, description="System performance metrics")
    revenue_metrics: Dict[str, float] = Field({}, description="Revenue and affiliate metrics")
    error_rates: Dict[str, float] = Field({}, description="Error rates by component")
    popular_products: List[Dict[str, Any]] = Field([], description="Most tracked products")
    marketplace_health: List[MarketplacePerformance] = Field([], description="Marketplace API health")


# MongoDB Document Models
class AnalyticsEvent(BaseModel):
    """Individual analytics event for tracking."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str = Field(..., description="User who triggered event")
    event_type: str = Field(..., description="Type of event")
    event_category: str = Field(..., description="Event category")
    event_data: Dict[str, Any] = Field({}, description="Event-specific data")
    session_id: Optional[str] = Field(None, description="Session identifier")
    timestamp: datetime = Field(default_factory=datetime.now)
    ip_address: Optional[str] = Field(None, description="User IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class DailyAnalyticsSummary(BaseModel):
    """Daily aggregated analytics."""
    id: Optional[str] = Field(None, alias="_id")
    date: datetime = Field(..., description="Date for this summary")
    user_id: Optional[str] = Field(None, description="User ID (None for platform-wide)")
    
    # Daily metrics
    total_searches: int = Field(0)
    total_price_checks: int = Field(0)
    total_alerts_sent: int = Field(0)
    total_savings: float = Field(0.0)
    new_products_tracked: int = Field(0)
    active_users: int = Field(0)
    
    # Behavioral metrics
    top_categories: List[str] = Field([])
    top_searches: List[str] = Field([])
    marketplace_usage: Dict[str, int] = Field({})
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }