"""
Advanced analytics service for user behavior tracking and dashboard generation.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from collections import defaultdict, Counter
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.analytics import (
    UserDashboard, SavingsMetrics, ShoppingBehavior, WishlistAnalytics,
    UserEngagement, MarketplacePerformance, PriceTrackingAnalytics,
    GlobalTrends, AdminAnalytics, AnalyticsEvent, DailyAnalyticsSummary
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for advanced analytics and dashboard generation."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.analytics_events_collection = database.analytics_events
        self.daily_summaries_collection = database.daily_analytics_summaries
        self.users_collection = database.users
        self.wishlists_collection = database.enhanced_wishlists
        self.price_trackers_collection = database.price_trackers
        self.price_alerts_collection = database.price_alerts
        self.search_cache_collection = database.search_cache
        self.user_activity_collection = database.user_activity
    
    # Event Tracking
    async def track_event(
        self,
        user_id: str,
        event_type: str,
        event_category: str,
        event_data: Dict[str, Any] = None,
        session_id: str = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Track an analytics event."""
        event = AnalyticsEvent(
            user_id=user_id,
            event_type=event_type,
            event_category=event_category,
            event_data=event_data or {},
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        await self.analytics_events_collection.insert_one(event.model_dump())
        logger.debug(f"Tracked event: {event_type} for user {user_id}")
    
    # Dashboard Generation
    async def generate_user_dashboard(self, user_id: str) -> UserDashboard:
        """Generate comprehensive analytics dashboard for a user."""
        logger.info(f"Generating analytics dashboard for user {user_id}")
        
        # Run all analytics in parallel for performance
        savings_task = self._calculate_savings_metrics(user_id)
        behavior_task = self._analyze_shopping_behavior(user_id)
        wishlist_task = self._analyze_wishlist_usage(user_id)
        engagement_task = self._calculate_user_engagement(user_id)
        marketplace_task = self._analyze_marketplace_performance(user_id)
        tracking_task = self._analyze_price_tracking(user_id)
        insights_task = self._generate_personalized_insights(user_id)
        
        results = await asyncio.gather(
            savings_task, behavior_task, wishlist_task, engagement_task,
            marketplace_task, tracking_task, insights_task,
            return_exceptions=True
        )
        
        # Handle any exceptions
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Analytics task {i} failed: {result}")
        
        savings_metrics, shopping_behavior, wishlist_analytics, user_engagement, \
        marketplace_performance, price_tracking_analytics, insights = results
        
        # Calculate goal progress
        user_data = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        savings_goal = user_data.get("savings_goal") if user_data else None
        goal_progress = 0.0
        
        if savings_goal and savings_goal > 0:
            goal_progress = min(100.0, (savings_metrics.savings_this_year / savings_goal) * 100)
        
        dashboard = UserDashboard(
            user_id=user_id,
            savings_metrics=savings_metrics,
            shopping_behavior=shopping_behavior,
            wishlist_analytics=wishlist_analytics,
            user_engagement=user_engagement,
            marketplace_performance=marketplace_performance,
            price_tracking_analytics=price_tracking_analytics,
            personalized_insights=insights.get("insights", []),
            recommendations=insights.get("recommendations", []),
            achievements=insights.get("achievements", []),
            savings_goal=savings_goal,
            goal_progress=goal_progress,
            next_milestone=insights.get("next_milestone")
        )
        
        return dashboard
    
    async def _calculate_savings_metrics(self, user_id: str) -> SavingsMetrics:
        """Calculate user savings metrics."""
        # Get price tracking history
        trackers = await self.price_trackers_collection.find({"user_id": user_id}).to_list(length=1000)
        alerts = await self.price_alerts_collection.find({"user_id": user_id}).to_list(length=1000)
        
        total_savings = 0.0
        potential_savings = 0.0
        discounts = []
        best_deal = 0.0
        
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        current_year = datetime.now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        monthly_savings = 0.0
        yearly_savings = 0.0
        
        for tracker in trackers:
            price_history = tracker.get("price_history", [])
            if len(price_history) >= 2:
                original_price = price_history[0].get("price", 0)
                current_price = price_history[-1].get("price", 0)
                
                if original_price > current_price:
                    savings = original_price - current_price
                    total_savings += savings
                    best_deal = max(best_deal, savings)
                    
                    discount_pct = (savings / original_price) * 100
                    discounts.append(discount_pct)
                    
                    # Check if savings occurred in current periods
                    last_update = price_history[-1].get("timestamp", datetime.now())
                    if isinstance(last_update, str):
                        last_update = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
                    
                    if last_update >= current_month:
                        monthly_savings += savings
                    if last_update >= current_year:
                        yearly_savings += savings
                
                # Calculate potential savings
                if current_price > 0:
                    # Assume 5-15% potential savings based on historical data
                    potential_savings += current_price * 0.10
        
        avg_discount = sum(discounts) / len(discounts) if discounts else 0.0
        
        return SavingsMetrics(
            total_savings=total_savings,
            potential_savings=potential_savings,
            average_discount_percentage=avg_discount,
            best_deal_savings=best_deal,
            savings_this_month=monthly_savings,
            savings_this_year=yearly_savings,
            total_alerts_triggered=len(alerts),
            successful_purchases=len([a for a in alerts if a.get("action_taken") == "purchased"])
        )
    
    async def _analyze_shopping_behavior(self, user_id: str) -> ShoppingBehavior:
        """Analyze user shopping behavior patterns."""
        # Get search history and activity
        user_activity = await self.user_activity_collection.find_one({"user_id": user_id})
        search_events = await self.analytics_events_collection.find({
            "user_id": user_id,
            "event_category": "search"
        }).to_list(length=1000)
        
        total_searches = len(search_events)
        categories = Counter()
        marketplaces = Counter()
        search_terms = []
        hourly_activity = defaultdict(int)
        
        if user_activity:
            search_history = user_activity.get("search_history", [])
            for search in search_history:
                if "category" in search:
                    categories[search["category"]] += 1
                if "marketplace" in search:
                    marketplaces[search["marketplace"]] += 1
                if "query" in search:
                    search_terms.append(search["query"])
        
        # Analyze activity patterns
        for event in search_events:
            hour = event.get("timestamp", datetime.now()).hour
            hourly_activity[hour] += 1
        
        # Calculate session metrics
        sessions = await self._calculate_session_metrics(user_id)
        
        return ShoppingBehavior(
            total_searches=total_searches,
            favorite_categories=list(categories.keys())[:5],
            favorite_marketplaces=list(marketplaces.keys())[:3],
            average_price_range=await self._calculate_price_ranges(user_id),
            shopping_frequency=dict(hourly_activity),
            search_patterns=list(set(search_terms))[:10],
            session_duration_avg=sessions.get("avg_duration", 0.0),
            bounce_rate=sessions.get("bounce_rate", 0.0)
        )
    
    async def _analyze_wishlist_usage(self, user_id: str) -> WishlistAnalytics:
        """Analyze user wishlist patterns."""
        wishlists = await self.wishlists_collection.find({"user_id": user_id}).to_list(length=100)
        
        total_wishlists = len(wishlists)
        total_products = sum(len(w.get("products", [])) for w in wishlists)
        avg_products = total_products / total_wishlists if total_wishlists > 0 else 0.0
        
        categories = Counter()
        price_ranges = {"0-25": 0, "25-100": 0, "100-500": 0, "500+": 0}
        ages = {"new": 0, "week": 0, "month": 0, "old": 0}
        
        most_active = None
        max_views = 0
        
        for wishlist in wishlists:
            view_count = wishlist.get("view_count", 0)
            if view_count > max_views:
                max_views = view_count
                most_active = wishlist.get("name", "Unnamed")
            
            for product in wishlist.get("products", []):
                # Category analysis
                category = product.get("category", "other")
                categories[category] += 1
                
                # Price analysis
                price = product.get("price", 0)
                if price < 25:
                    price_ranges["0-25"] += 1
                elif price < 100:
                    price_ranges["25-100"] += 1
                elif price < 500:
                    price_ranges["100-500"] += 1
                else:
                    price_ranges["500+"] += 1
                
                # Age analysis
                added_at = product.get("added_at", datetime.now())
                if isinstance(added_at, str):
                    added_at = datetime.fromisoformat(added_at.replace('Z', '+00:00'))
                
                age_days = (datetime.now() - added_at).days
                if age_days < 1:
                    ages["new"] += 1
                elif age_days < 7:
                    ages["week"] += 1
                elif age_days < 30:
                    ages["month"] += 1
                else:
                    ages["old"] += 1
        
        return WishlistAnalytics(
            total_wishlists=total_wishlists,
            total_products=total_products,
            average_products_per_list=avg_products,
            most_active_wishlist=most_active,
            category_distribution=dict(categories),
            price_distribution=price_ranges,
            staleness_metrics=ages,
            conversion_rate=await self._calculate_wishlist_conversion_rate(user_id)
        )
    
    async def _calculate_user_engagement(self, user_id: str) -> UserEngagement:
        """Calculate user engagement metrics."""
        # Get user activity events
        events = await self.analytics_events_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": datetime.now() - timedelta(days=30)}
        }).to_list(length=5000)
        
        # Calculate engagement metrics
        session_days = set()
        feature_usage = Counter()
        
        for event in events:
            session_days.add(event["timestamp"].date())
            feature_usage[event["event_type"]] += 1
        
        # Calculate streak
        streak = await self._calculate_activity_streak(user_id)
        
        # Notification engagement
        notification_events = await self.analytics_events_collection.find({
            "user_id": user_id,
            "event_category": "notification"
        }).to_list(length=1000)
        
        notification_ctr = 0.0
        if notification_events:
            clicks = len([e for e in notification_events if e.get("event_type") == "click"])
            notification_ctr = (clicks / len(notification_events)) * 100
        
        return UserEngagement(
            total_sessions=len(session_days),
            active_days=len(session_days),
            daily_active_streak=streak,
            feature_usage=dict(feature_usage),
            notification_engagement=notification_ctr,
            social_activity=await self._get_social_activity(user_id),
            retention_score=await self._calculate_retention_score(user_id)
        )
    
    async def _analyze_marketplace_performance(self, user_id: str) -> List[MarketplacePerformance]:
        """Analyze marketplace performance for user."""
        trackers = await self.price_trackers_collection.find({"user_id": user_id}).to_list(length=1000)
        
        marketplace_data = defaultdict(lambda: {
            "products": 0,
            "prices": [],
            "price_changes": 0,
            "discounts": [],
            "response_times": [],
            "errors": 0,
            "total_requests": 0
        })
        
        for tracker in trackers:
            marketplace = tracker.get("marketplace", "unknown")
            data = marketplace_data[marketplace]
            
            data["products"] += 1
            
            price_history = tracker.get("price_history", [])
            if price_history:
                data["prices"].extend([p.get("price", 0) for p in price_history])
                data["price_changes"] += len(price_history) - 1
        
        performance_list = []
        for marketplace, data in marketplace_data.items():
            avg_price = sum(data["prices"]) / len(data["prices"]) if data["prices"] else 0.0
            price_volatility = data["price_changes"] / data["products"] if data["products"] > 0 else 0.0
            
            performance = MarketplacePerformance(
                marketplace=marketplace,
                total_products_tracked=data["products"],
                average_price=avg_price,
                price_volatility=price_volatility,
                average_discount=sum(data["discounts"]) / len(data["discounts"]) if data["discounts"] else 0.0,
                response_time=sum(data["response_times"]) / len(data["response_times"]) if data["response_times"] else 0.0,
                success_rate=100.0 - (data["errors"] / max(data["total_requests"], 1)) * 100,
                user_satisfaction=85.0  # **MANUAL IMPLEMENTATION NEEDED**: Collect user ratings
            )
            performance_list.append(performance)
        
        return performance_list
    
    async def _analyze_price_tracking(self, user_id: str) -> PriceTrackingAnalytics:
        """Analyze price tracking effectiveness."""
        trackers = await self.price_trackers_collection.find({"user_id": user_id}).to_list(length=1000)
        alerts = await self.price_alerts_collection.find({"user_id": user_id}).to_list(length=1000)
        
        total_trackers = len(trackers)
        alerts_sent = len(alerts)
        
        tracking_durations = []
        price_drops = []
        
        for tracker in trackers:
            created_at = tracker.get("created_at", datetime.now())
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            duration = (datetime.now() - created_at).days
            tracking_durations.append(duration)
            
            price_history = tracker.get("price_history", [])
            if len(price_history) >= 2:
                for i in range(1, len(price_history)):
                    old_price = price_history[i-1].get("price", 0)
                    new_price = price_history[i].get("price", 0)
                    if old_price > new_price:
                        drop = old_price - new_price
                        price_drops.append({
                            "amount": drop,
                            "percentage": (drop / old_price) * 100,
                            "product": tracker.get("product_title", "Unknown")
                        })
        
        avg_duration = sum(tracking_durations) / len(tracking_durations) if tracking_durations else 0.0
        biggest_drop = max(price_drops, key=lambda x: x["amount"]) if price_drops else {}
        fastest_drop = min(price_drops, key=lambda x: x.get("days", 999)) if price_drops else {}
        
        return PriceTrackingAnalytics(
            total_trackers=total_trackers,
            alerts_sent=alerts_sent,
            alert_accuracy=95.0,  # **MANUAL IMPLEMENTATION NEEDED**: Track accuracy
            average_tracking_duration=avg_duration,
            fastest_price_drop=fastest_drop,
            biggest_price_drop=biggest_drop,
            seasonal_trends={}  # **MANUAL IMPLEMENTATION NEEDED**: Analyze seasonal patterns
        )
    
    async def _generate_personalized_insights(self, user_id: str) -> Dict[str, Any]:
        """Generate AI-powered personalized insights."""
        insights = []
        recommendations = []
        achievements = []
        next_milestone = None
        
        # Get user data for insights
        savings_metrics = await self._calculate_savings_metrics(user_id)
        behavior = await self._analyze_shopping_behavior(user_id)
        
        # Generate insights based on data
        if savings_metrics.total_savings > 100:
            insights.append(f"🎉 You've saved ${savings_metrics.total_savings:.2f} using DealHunt!")
            
        if savings_metrics.savings_this_month > 0:
            insights.append(f"📈 This month you saved ${savings_metrics.savings_this_month:.2f}")
        
        if behavior.total_searches > 50:
            insights.append(f"🔍 You're an active searcher with {behavior.total_searches} searches!")
        
        # Generate recommendations
        if behavior.favorite_categories:
            top_category = behavior.favorite_categories[0]
            recommendations.append(f"💡 Try setting up price alerts for {top_category} items")
        
        if savings_metrics.potential_savings > 50:
            recommendations.append(f"💰 You could save ${savings_metrics.potential_savings:.2f} more with price tracking")
        
        # Generate achievements
        if savings_metrics.total_savings >= 100:
            achievements.append({"name": "Smart Saver", "description": "Saved over $100", "icon": "💰"})
        
        if behavior.total_searches >= 100:
            achievements.append({"name": "Deal Hunter", "description": "Made 100+ searches", "icon": "🔍"})
        
        # Next milestone
        if savings_metrics.total_savings < 500:
            next_milestone = f"Save ${500 - savings_metrics.total_savings:.2f} more to reach $500 total savings!"
        
        return {
            "insights": insights,
            "recommendations": recommendations,
            "achievements": achievements,
            "next_milestone": next_milestone
        }
    
    # Helper methods
    async def _calculate_session_metrics(self, user_id: str) -> Dict[str, float]:
        """Calculate session duration and bounce rate."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement session tracking
        return {"avg_duration": 12.5, "bounce_rate": 25.0}
    
    async def _calculate_price_ranges(self, user_id: str) -> Dict[str, float]:
        """Calculate average price ranges by category."""
        # **MANUAL IMPLEMENTATION NEEDED**: Analyze price ranges
        return {"electronics": 299.99, "fashion": 49.99, "home": 75.00}
    
    async def _calculate_wishlist_conversion_rate(self, user_id: str) -> float:
        """Calculate wishlist to purchase conversion rate."""
        # **MANUAL IMPLEMENTATION NEEDED**: Track purchases
        return 15.5
    
    async def _calculate_activity_streak(self, user_id: str) -> int:
        """Calculate current daily activity streak."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement streak calculation
        return 7
    
    async def _get_social_activity(self, user_id: str) -> Dict[str, int]:
        """Get social feature usage stats."""
        # **MANUAL IMPLEMENTATION NEEDED**: Query social collections
        return {"reviews": 5, "shares": 12, "follows": 3}
    
    async def _calculate_retention_score(self, user_id: str) -> float:
        """Calculate user retention prediction score."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement ML retention model
        return 85.5
    
    # Daily aggregation
    async def generate_daily_summary(self, date: datetime, user_id: str = None):
        """Generate daily analytics summary."""
        start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
        
        query = {"timestamp": {"$gte": start_date, "$lt": end_date}}
        if user_id:
            query["user_id"] = user_id
        
        events = await self.analytics_events_collection.find(query).to_list(length=10000)
        
        # Aggregate metrics
        search_events = [e for e in events if e.get("event_category") == "search"]
        alert_events = [e for e in events if e.get("event_type") == "price_alert"]
        
        categories = Counter()
        searches = Counter()
        marketplaces = Counter()
        
        for event in search_events:
            event_data = event.get("event_data", {})
            if "category" in event_data:
                categories[event_data["category"]] += 1
            if "query" in event_data:
                searches[event_data["query"]] += 1
            if "marketplace" in event_data:
                marketplaces[event_data["marketplace"]] += 1
        
        summary = DailyAnalyticsSummary(
            date=date,
            user_id=user_id,
            total_searches=len(search_events),
            total_alerts_sent=len(alert_events),
            top_categories=list(categories.keys())[:5],
            top_searches=list(searches.keys())[:10],
            marketplace_usage=dict(marketplaces),
            active_users=len(set(e["user_id"] for e in events)) if not user_id else 1
        )
        
        await self.daily_summaries_collection.update_one(
            {"date": date, "user_id": user_id},
            {"$set": summary.model_dump()},
            upsert=True
        )
        
        return summary