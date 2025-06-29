"""
User activity service for tracking user behavior and preferences.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import db
from app.models.user_activity import (
    UserActivity,
    RecentlyViewedProduct,
    SearchHistory,
    UserPreferences,
    UserActivityDocument
)

logger = logging.getLogger(__name__)


class UserActivityService:
    """Service for managing user activity and preferences."""
    
    def __init__(self):
        self.db: AsyncIOMotorDatabase = None
        self.user_activity_collection = None
    
    async def initialize(self):
        """Initialize database connections."""
        self.db = db
        self.user_activity_collection = self.db.user_activity
        
        # Create indexes
        await self._create_indexes()
    
    async def _create_indexes(self):
        """Create database indexes for optimal performance."""
        try:
            await self.user_activity_collection.create_index("user_id", unique=True)
            await self.user_activity_collection.create_index("last_active")
            logger.info("User activity indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating user activity indexes: {e}")
    
    async def get_or_create_user_activity(self, user_id: str) -> UserActivity:
        """Get existing user activity or create new one."""
        try:
            # Try to find existing activity
            activity_doc = await self.user_activity_collection.find_one({"user_id": user_id})
            
            if activity_doc:
                # Convert from document format
                preferences = UserPreferences(**activity_doc["preferences"])
                activity = UserActivity(
                    user_id=user_id,
                    preferences=preferences,
                    last_active=activity_doc["last_active"],
                    total_sessions=activity_doc.get("total_sessions", 0),
                    total_products_viewed=activity_doc.get("total_products_viewed", 0),
                    total_searches=activity_doc.get("total_searches", 0)
                )
                
                # Reconstruct recently viewed
                for rv_dict in activity_doc.get("recently_viewed", []):
                    product = RecentlyViewedProduct(**rv_dict)
                    activity.recently_viewed.append(product)
                
                # Reconstruct search history
                for sh_dict in activity_doc.get("search_history", []):
                    search = SearchHistory(**sh_dict)
                    activity.search_history.append(search)
                
                return activity
            else:
                # Create new activity
                preferences = UserPreferences(user_id=user_id)
                activity = UserActivity(user_id=user_id, preferences=preferences)
                await self._save_user_activity(activity)
                return activity
                
        except Exception as e:
            logger.error(f"Error getting user activity: {e}")
            # Return default activity on error
            preferences = UserPreferences(user_id=user_id)
            return UserActivity(user_id=user_id, preferences=preferences)
    
    async def _save_user_activity(self, activity: UserActivity):
        """Save user activity to database."""
        try:
            activity_doc = UserActivityDocument(
                user_id=activity.user_id,
                recently_viewed=[rv.dict() for rv in activity.recently_viewed],
                search_history=[sh.dict() for sh in activity.search_history],
                preferences=activity.preferences.dict(),
                last_active=activity.last_active,
                total_sessions=activity.total_sessions,
                total_products_viewed=activity.total_products_viewed,
                total_searches=activity.total_searches
            )
            
            await self.user_activity_collection.replace_one(
                {"user_id": activity.user_id},
                activity_doc.dict(exclude={"_id"}),
                upsert=True
            )
            
        except Exception as e:
            logger.error(f"Error saving user activity: {e}")
    
    async def track_product_view(self,
                                user_id: str,
                                product_id: str,
                                marketplace: str,
                                title: str,
                                price: float,
                                image_url: str = "",
                                product_url: str = "",
                                view_duration: Optional[int] = None):
        """Track when a user views a product."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            
            viewed_product = RecentlyViewedProduct(
                product_id=product_id,
                marketplace=marketplace,
                title=title,
                price=price,
                image_url=image_url,
                product_url=product_url,
                view_duration=view_duration
            )
            
            activity.add_viewed_product(viewed_product)
            await self._save_user_activity(activity)
            
            logger.info(f"Tracked product view for user {user_id}: {title}")
            
        except Exception as e:
            logger.error(f"Error tracking product view: {e}")
    
    async def track_search(self,
                          user_id: str,
                          query: str,
                          results_count: int,
                          filters_used: Dict = None,
                          clicked_products: List[str] = None):
        """Track when a user performs a search."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            
            search = SearchHistory(
                query=query,
                results_count=results_count,
                filters_used=filters_used or {},
                clicked_products=clicked_products or []
            )
            
            activity.add_search(search)
            await self._save_user_activity(activity)
            
            logger.info(f"Tracked search for user {user_id}: {query}")
            
        except Exception as e:
            logger.error(f"Error tracking search: {e}")
    
    async def get_recently_viewed(self, user_id: str, limit: int = 20) -> List[RecentlyViewedProduct]:
        """Get recently viewed products for a user."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            return activity.recently_viewed[:limit]
            
        except Exception as e:
            logger.error(f"Error getting recently viewed: {e}")
            return []
    
    async def get_search_suggestions(self, user_id: str, limit: int = 10) -> List[str]:
        """Get search suggestions based on user history."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            
            # Get unique search terms from history
            suggestions = []
            seen_terms = set()
            
            for search in activity.search_history:
                query_lower = search.query.lower()
                if query_lower not in seen_terms and len(query_lower) > 2:
                    suggestions.append(search.query)
                    seen_terms.add(query_lower)
                    
                    if len(suggestions) >= limit:
                        break
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error getting search suggestions: {e}")
            return []
    
    async def get_user_preferences(self, user_id: str) -> UserPreferences:
        """Get user preferences."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            return activity.preferences
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return UserPreferences(user_id=user_id)
    
    async def update_user_preferences(self, user_id: str, preferences_update: Dict):
        """Update user preferences."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            
            # Update specific fields
            for key, value in preferences_update.items():
                if hasattr(activity.preferences, key):
                    setattr(activity.preferences, key, value)
            
            activity.preferences.updated_at = datetime.now()
            await self._save_user_activity(activity)
            
            logger.info(f"Updated preferences for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error updating user preferences: {e}")
    
    async def get_personalized_recommendations(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get personalized product recommendations based on user activity."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            
            # Simple recommendation algorithm based on:
            # 1. Categories of recently viewed products
            # 2. Price ranges user typically views
            # 3. Common search terms
            
            recommendations = []
            
            # Get category preferences
            category_prefs = activity.get_category_preferences()
            price_prefs = activity.get_price_preferences()
            
            # Create recommendation metadata
            for marketplace, count in category_prefs.items():
                recommendations.append({
                    "type": "category_based",
                    "marketplace": marketplace,
                    "reason": f"You've viewed {count} products from {marketplace}",
                    "suggested_price_range": {
                        "min": price_prefs["min"],
                        "max": price_prefs["max"]
                    }
                })
            
            # Add search-based recommendations
            for term in activity.preferences.common_search_terms[:5]:
                recommendations.append({
                    "type": "search_based",
                    "suggested_query": term,
                    "reason": f"Based on your search for '{term}'"
                })
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return []
    
    async def get_user_analytics(self, user_id: str) -> Dict:
        """Get analytics about user behavior."""
        try:
            activity = await self.get_or_create_user_activity(user_id)
            
            # Calculate analytics
            total_viewed = len(activity.recently_viewed)
            total_searches = len(activity.search_history)
            
            # Price analytics
            price_prefs = activity.get_price_preferences()
            
            # Category analytics
            category_prefs = activity.get_category_preferences()
            
            # Time-based analytics
            recent_activity = [
                rv for rv in activity.recently_viewed 
                if rv.viewed_at >= datetime.now() - timedelta(days=30)
            ]
            
            return {
                "total_products_viewed": activity.total_products_viewed,
                "total_searches": activity.total_searches,
                "total_sessions": activity.total_sessions,
                "recent_products_viewed": len(recent_activity),
                "favorite_categories": dict(sorted(category_prefs.items(), key=lambda x: x[1], reverse=True)),
                "price_preferences": price_prefs,
                "most_common_searches": activity.preferences.common_search_terms[:10],
                "last_active": activity.last_active,
                "account_age_days": (datetime.now() - activity.preferences.created_at).days
            }
            
        except Exception as e:
            logger.error(f"Error getting user analytics: {e}")
            return {}
    
    async def cleanup_old_activity(self, days_to_keep: int = 90):
        """Clean up old user activity data."""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            # Update all users to remove old recently viewed and search history
            await self.user_activity_collection.update_many(
                {},
                {
                    "$pull": {
                        "recently_viewed": {"viewed_at": {"$lt": cutoff_date}},
                        "search_history": {"searched_at": {"$lt": cutoff_date}}
                    }
                }
            )
            
            logger.info(f"Cleaned up user activity older than {days_to_keep} days")
            
        except Exception as e:
            logger.error(f"Error cleaning up old activity: {e}")


# Global service instance
user_activity_service = UserActivityService()