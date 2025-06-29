"""
AI-powered product recommendation service.
"""
import asyncio
import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple
from collections import defaultdict, Counter
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.recommendations import (
    ProductRecommendation, RecommendationSet, UserPreferenceProfile,
    RecommendationFeedback, TrendingProduct, RecommendationType,
    RecommendationReason, RecommendationAnalytics
)


class RecommendationService:
    """AI-powered recommendation service."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.recommendations_collection = database.recommendations
        self.user_profiles_collection = database.user_profiles
        self.feedback_collection = database.recommendation_feedback
        self.trending_collection = database.trending_products
        self.analytics_collection = database.recommendation_analytics
        
        # Cache for frequently accessed data
        self._trending_cache = {}
        self._profile_cache = {}
        self._cache_ttl = 3600  # 1 hour
    
    async def get_recommendations(
        self, 
        user_id: str, 
        recommendation_type: RecommendationType = RecommendationType.PERSONAL,
        limit: int = 10,
        context: Dict[str, Any] = None
    ) -> RecommendationSet:
        """Get personalized recommendations for a user."""
        context = context or {}
        
        # Get user profile
        user_profile = await self.get_user_profile(user_id)
        
        # Generate recommendations based on type
        if recommendation_type == RecommendationType.PERSONAL:
            recommendations = await self._generate_personal_recommendations(user_id, user_profile, limit, context)
        elif recommendation_type == RecommendationType.TRENDING:
            recommendations = await self._generate_trending_recommendations(user_profile, limit, context)
        elif recommendation_type == RecommendationType.SIMILAR_PRODUCTS:
            recommendations = await self._generate_similar_product_recommendations(user_id, user_profile, limit, context)
        elif recommendation_type == RecommendationType.PRICE_BASED:
            recommendations = await self._generate_price_based_recommendations(user_profile, limit, context)
        elif recommendation_type == RecommendationType.CATEGORY_BASED:
            recommendations = await self._generate_category_based_recommendations(user_profile, limit, context)
        elif recommendation_type == RecommendationType.WISHLIST_BASED:
            recommendations = await self._generate_wishlist_based_recommendations(user_id, user_profile, limit, context)
        elif recommendation_type == RecommendationType.SEARCH_BASED:
            recommendations = await self._generate_search_based_recommendations(user_id, user_profile, limit, context)
        else:
            recommendations = await self._generate_fallback_recommendations(limit, context)
        
        # Calculate set metrics
        recommendation_set = RecommendationSet(
            user_id=user_id,
            recommendations=recommendations,
            recommendation_type=recommendation_type,
            context=context,
            total_score=sum(r.relevance_score for r in recommendations) / len(recommendations) if recommendations else 0,
            diversity_score=self._calculate_diversity_score(recommendations),
            freshness_score=self._calculate_freshness_score(recommendations)
        )
        
        # Store recommendations for tracking
        await self._store_recommendation_set(recommendation_set)
        
        return recommendation_set
    
    async def _generate_personal_recommendations(
        self, 
        user_id: str, 
        profile: UserPreferenceProfile, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate personalized recommendations based on user profile."""
        recommendations = []
        
        # Combine multiple recommendation strategies
        strategies = [
            (self._generate_category_based_recommendations, 0.3),
            (self._generate_wishlist_based_recommendations, 0.3),
            (self._generate_trending_recommendations, 0.2),
            (self._generate_price_based_recommendations, 0.2)
        ]
        
        for strategy_func, weight in strategies:
            strategy_limit = max(1, int(limit * weight))
            
            if strategy_func.__name__ in ['_generate_wishlist_based_recommendations']:
                strategy_recs = await strategy_func(user_id, profile, strategy_limit, context)
            else:
                strategy_recs = await strategy_func(profile, strategy_limit, context)
            
            recommendations.extend(strategy_recs)
        
        # Re-rank and deduplicate
        recommendations = self._deduplicate_recommendations(recommendations)
        recommendations = self._rerank_recommendations(recommendations, profile)
        
        return recommendations[:limit]
    
    async def _generate_trending_recommendations(
        self, 
        profile: UserPreferenceProfile, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate recommendations based on trending products."""
        # Get trending products
        trending_products = await self.get_trending_products(limit * 2)
        
        recommendations = []
        for trending in trending_products:
            if len(recommendations) >= limit:
                break
            
            # Calculate relevance based on user preferences
            relevance = self._calculate_trending_relevance(trending, profile)
            
            if relevance > 0.3:  # Minimum relevance threshold
                recommendation = ProductRecommendation(
                    product_id=trending.product_id,
                    marketplace=trending.marketplace,
                    title=trending.title,
                    image_url="",  # Would be filled from product data
                    product_url=f"/product/{trending.marketplace}/{trending.product_id}",
                    current_price=random.uniform(10, 500),  # Mock price
                    recommendation_type=RecommendationType.TRENDING,
                    recommendation_reason=RecommendationReason.TRENDING_NOW,
                    confidence_score=trending.trending_score,
                    relevance_score=relevance,
                    category=trending.category
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _generate_similar_product_recommendations(
        self, 
        user_id: str, 
        profile: UserPreferenceProfile, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate recommendations for similar products."""
        recommendations = []
        
        # Get recently viewed products
        recently_viewed = await self._get_recently_viewed_products(user_id, 5)
        
        for viewed_product in recently_viewed:
            if len(recommendations) >= limit:
                break
            
            # Find similar products (mock implementation)
            similar_products = await self._find_similar_products(viewed_product, limit // len(recently_viewed) + 1)
            
            for similar in similar_products:
                if len(recommendations) >= limit:
                    break
                
                recommendation = ProductRecommendation(
                    product_id=similar["product_id"],
                    marketplace=similar["marketplace"],
                    title=similar["title"],
                    image_url=similar.get("image_url", ""),
                    product_url=f"/product/{similar['marketplace']}/{similar['product_id']}",
                    current_price=similar["price"],
                    recommendation_type=RecommendationType.SIMILAR_PRODUCTS,
                    recommendation_reason=RecommendationReason.SIMILAR_PRODUCTS,
                    confidence_score=similar["similarity_score"],
                    relevance_score=similar["similarity_score"] * self._calculate_category_preference(similar.get("category", ""), profile),
                    category=similar.get("category", "")
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _generate_category_based_recommendations(
        self, 
        profile: UserPreferenceProfile, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate recommendations based on preferred categories."""
        recommendations = []
        
        # Get top preferred categories
        top_categories = sorted(
            profile.preferred_categories.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:3]
        
        for category, preference_score in top_categories:
            category_limit = max(1, int(limit * preference_score / sum(score for _, score in top_categories)))
            
            # Get products from this category
            category_products = await self._get_products_by_category(category, category_limit * 2)
            
            for product in category_products:
                if len(recommendations) >= limit:
                    break
                
                relevance = preference_score * self._calculate_price_fit(product["price"], profile)
                
                recommendation = ProductRecommendation(
                    product_id=product["product_id"],
                    marketplace=product["marketplace"],
                    title=product["title"],
                    image_url=product.get("image_url", ""),
                    product_url=f"/product/{product['marketplace']}/{product['product_id']}",
                    current_price=product["price"],
                    original_price=product.get("original_price"),
                    recommendation_type=RecommendationType.CATEGORY_BASED,
                    recommendation_reason=RecommendationReason.CATEGORY_MATCH,
                    confidence_score=preference_score,
                    relevance_score=relevance,
                    category=category
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _generate_price_based_recommendations(
        self, 
        profile: UserPreferenceProfile, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate recommendations based on price drops and deals."""
        recommendations = []
        
        # Get products with recent price drops
        price_drop_products = await self._get_price_drop_products(limit * 2)
        
        for product in price_drop_products:
            if len(recommendations) >= limit:
                break
            
            # Check if price fits user's range and preferences
            price_fit = self._calculate_price_fit(product["current_price"], profile)
            category_fit = self._calculate_category_preference(product.get("category", ""), profile)
            
            if price_fit > 0.3 and category_fit > 0.2:
                discount_pct = ((product["original_price"] - product["current_price"]) / product["original_price"]) * 100
                
                recommendation = ProductRecommendation(
                    product_id=product["product_id"],
                    marketplace=product["marketplace"],
                    title=product["title"],
                    image_url=product.get("image_url", ""),
                    product_url=f"/product/{product['marketplace']}/{product['product_id']}",
                    current_price=product["current_price"],
                    original_price=product["original_price"],
                    discount_percentage=discount_pct,
                    recommendation_type=RecommendationType.PRICE_BASED,
                    recommendation_reason=RecommendationReason.PRICE_DROP,
                    confidence_score=min(1.0, discount_pct / 50),  # Higher confidence for bigger discounts
                    relevance_score=price_fit * category_fit,
                    category=product.get("category", "")
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _generate_wishlist_based_recommendations(
        self, 
        user_id: str, 
        profile: UserPreferenceProfile, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate recommendations based on wishlist items."""
        recommendations = []
        
        # Get user's wishlist items
        wishlist_items = await self._get_user_wishlist_items(user_id)
        
        for wishlist_item in wishlist_items:
            if len(recommendations) >= limit:
                break
            
            # Find similar products to wishlist items
            similar_products = await self._find_similar_products(wishlist_item, 2)
            
            for similar in similar_products:
                if len(recommendations) >= limit:
                    break
                
                recommendation = ProductRecommendation(
                    product_id=similar["product_id"],
                    marketplace=similar["marketplace"],
                    title=similar["title"],
                    image_url=similar.get("image_url", ""),
                    product_url=f"/product/{similar['marketplace']}/{similar['product_id']}",
                    current_price=similar["price"],
                    recommendation_type=RecommendationType.WISHLIST_BASED,
                    recommendation_reason=RecommendationReason.WISHLIST_SIMILAR,
                    confidence_score=similar["similarity_score"],
                    relevance_score=similar["similarity_score"],
                    category=similar.get("category", "")
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _generate_search_based_recommendations(
        self, 
        user_id: str, 
        profile: UserPreferenceProfile, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate recommendations based on search history."""
        recommendations = []
        
        # Get recent search queries
        search_history = await self._get_user_search_history(user_id, 10)
        
        for search_query in search_history:
            if len(recommendations) >= limit:
                break
            
            # Get products related to search query
            related_products = await self._get_products_by_search_query(search_query, limit // len(search_history) + 1)
            
            for product in related_products:
                if len(recommendations) >= limit:
                    break
                
                relevance = self._calculate_search_relevance(product, search_query, profile)
                
                recommendation = ProductRecommendation(
                    product_id=product["product_id"],
                    marketplace=product["marketplace"],
                    title=product["title"],
                    image_url=product.get("image_url", ""),
                    product_url=f"/product/{product['marketplace']}/{product['product_id']}",
                    current_price=product["price"],
                    recommendation_type=RecommendationType.SEARCH_BASED,
                    recommendation_reason=RecommendationReason.SEARCH_HISTORY,
                    confidence_score=0.7,
                    relevance_score=relevance,
                    category=product.get("category", "")
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    async def _generate_fallback_recommendations(
        self, 
        limit: int, 
        context: Dict[str, Any]
    ) -> List[ProductRecommendation]:
        """Generate fallback recommendations when no personalization is available."""
        # Get popular/trending products as fallback
        popular_products = await self._get_popular_products(limit)
        
        recommendations = []
        for product in popular_products:
            recommendation = ProductRecommendation(
                product_id=product["product_id"],
                marketplace=product["marketplace"],
                title=product["title"],
                image_url=product.get("image_url", ""),
                product_url=f"/product/{product['marketplace']}/{product['product_id']}",
                current_price=product["price"],
                recommendation_type=RecommendationType.TRENDING,
                recommendation_reason=RecommendationReason.TRENDING_NOW,
                confidence_score=0.5,
                relevance_score=0.5,
                category=product.get("category", "")
            )
            recommendations.append(recommendation)
        
        return recommendations
    
    # Helper methods for data retrieval (mock implementations)
    async def _get_recently_viewed_products(self, user_id: str, limit: int) -> List[Dict]:
        """Get recently viewed products for a user."""
        # Mock implementation - would query user activity
        return [
            {
                "product_id": f"viewed_{i}",
                "marketplace": "aliexpress",
                "title": f"Recently Viewed Product {i}",
                "price": random.uniform(10, 100),
                "category": random.choice(["electronics", "fashion", "home"])
            }
            for i in range(min(limit, 3))
        ]
    
    async def _find_similar_products(self, reference_product: Dict, limit: int) -> List[Dict]:
        """Find products similar to a reference product."""
        # Mock implementation - would use ML similarity
        return [
            {
                "product_id": f"similar_{i}_{reference_product.get('product_id', 'unknown')}",
                "marketplace": random.choice(["aliexpress", "ebay", "walmart"]),
                "title": f"Similar to {reference_product.get('title', 'Product')} - Variant {i}",
                "price": reference_product.get("price", 50) * random.uniform(0.8, 1.2),
                "category": reference_product.get("category", "general"),
                "similarity_score": random.uniform(0.6, 0.9)
            }
            for i in range(limit)
        ]
    
    async def _get_products_by_category(self, category: str, limit: int) -> List[Dict]:
        """Get products from a specific category."""
        return [
            {
                "product_id": f"{category}_{i}",
                "marketplace": random.choice(["aliexpress", "ebay", "walmart"]),
                "title": f"{category.title()} Product {i}",
                "price": random.uniform(20, 200),
                "category": category
            }
            for i in range(limit)
        ]
    
    async def _get_price_drop_products(self, limit: int) -> List[Dict]:
        """Get products with recent price drops."""
        return [
            {
                "product_id": f"deal_{i}",
                "marketplace": random.choice(["aliexpress", "ebay", "walmart"]),
                "title": f"Great Deal Product {i}",
                "current_price": random.uniform(20, 100),
                "original_price": random.uniform(120, 200),
                "category": random.choice(["electronics", "fashion", "home"])
            }
            for i in range(limit)
        ]
    
    async def _get_user_wishlist_items(self, user_id: str) -> List[Dict]:
        """Get user's wishlist items."""
        # Query the actual wishlist collection
        cursor = self.db.wishlist.find({"user_id": user_id})
        items = await cursor.to_list(length=20)
        return items
    
    async def _get_user_search_history(self, user_id: str, limit: int) -> List[str]:
        """Get user's search history."""
        # Mock implementation
        return ["laptop", "phone case", "headphones"][:limit]
    
    async def _get_products_by_search_query(self, query: str, limit: int) -> List[Dict]:
        """Get products related to a search query."""
        return [
            {
                "product_id": f"search_{query}_{i}",
                "marketplace": random.choice(["aliexpress", "ebay", "walmart"]),
                "title": f"{query.title()} Product {i}",
                "price": random.uniform(25, 150),
                "category": "electronics" if "phone" in query or "laptop" in query else "general"
            }
            for i in range(limit)
        ]
    
    async def _get_popular_products(self, limit: int) -> List[Dict]:
        """Get popular products as fallback."""
        return [
            {
                "product_id": f"popular_{i}",
                "marketplace": random.choice(["aliexpress", "ebay", "walmart"]),
                "title": f"Popular Product {i}",
                "price": random.uniform(30, 120),
                "category": random.choice(["electronics", "fashion", "home"])
            }
            for i in range(limit)
        ]
    
    # Utility methods
    def _calculate_trending_relevance(self, trending: TrendingProduct, profile: UserPreferenceProfile) -> float:
        """Calculate relevance of trending product to user."""
        category_score = self._calculate_category_preference(trending.category, profile)
        trending_score = min(1.0, trending.trending_score)
        return (category_score + trending_score) / 2
    
    def _calculate_category_preference(self, category: str, profile: UserPreferenceProfile) -> float:
        """Calculate user's preference for a category."""
        return profile.preferred_categories.get(category, 0.1)
    
    def _calculate_price_fit(self, price: float, profile: UserPreferenceProfile) -> float:
        """Calculate how well price fits user's preferences."""
        price_range = profile.avg_price_range
        if price_range["min"] <= price <= price_range["max"]:
            return 1.0
        elif price < price_range["min"]:
            return 0.8  # Cheaper is usually OK
        else:
            # Price is higher than usual range
            overage = (price - price_range["max"]) / price_range["max"]
            return max(0.1, 1.0 - overage * profile.price_sensitivity)
    
    def _calculate_search_relevance(self, product: Dict, search_query: str, profile: UserPreferenceProfile) -> float:
        """Calculate relevance of product to search query."""
        # Simple text matching (would use better ML in production)
        title_words = product["title"].lower().split()
        query_words = search_query.lower().split()
        
        matches = sum(1 for word in query_words if any(word in title_word for title_word in title_words))
        text_score = matches / len(query_words) if query_words else 0
        
        price_score = self._calculate_price_fit(product["price"], profile)
        category_score = self._calculate_category_preference(product.get("category", ""), profile)
        
        return (text_score * 0.5 + price_score * 0.3 + category_score * 0.2)
    
    def _deduplicate_recommendations(self, recommendations: List[ProductRecommendation]) -> List[ProductRecommendation]:
        """Remove duplicate recommendations."""
        seen = set()
        unique_recs = []
        
        for rec in recommendations:
            key = (rec.product_id, rec.marketplace)
            if key not in seen:
                seen.add(key)
                unique_recs.append(rec)
        
        return unique_recs
    
    def _rerank_recommendations(self, recommendations: List[ProductRecommendation], profile: UserPreferenceProfile) -> List[ProductRecommendation]:
        """Re-rank recommendations based on user profile."""
        def score_function(rec):
            base_score = rec.relevance_score * rec.confidence_score
            category_boost = self._calculate_category_preference(rec.category or "", profile)
            price_boost = self._calculate_price_fit(rec.current_price, profile)
            
            return base_score + category_boost * 0.2 + price_boost * 0.2
        
        return sorted(recommendations, key=score_function, reverse=True)
    
    def _calculate_diversity_score(self, recommendations: List[ProductRecommendation]) -> float:
        """Calculate diversity score of recommendations."""
        if not recommendations:
            return 0.0
        
        categories = [rec.category for rec in recommendations if rec.category]
        marketplaces = [rec.marketplace for rec in recommendations]
        
        category_diversity = len(set(categories)) / len(categories) if categories else 0
        marketplace_diversity = len(set(marketplaces)) / len(marketplaces)
        
        return (category_diversity + marketplace_diversity) / 2
    
    def _calculate_freshness_score(self, recommendations: List[ProductRecommendation]) -> float:
        """Calculate freshness score of recommendations."""
        # For now, return a static score - would calculate based on product age/trending
        return 0.7
    
    async def _store_recommendation_set(self, recommendation_set: RecommendationSet):
        """Store recommendation set for tracking."""
        await self.recommendations_collection.insert_one(recommendation_set.model_dump())
    
    # Public methods for user profile management
    async def get_user_profile(self, user_id: str) -> UserPreferenceProfile:
        """Get or create user preference profile."""
        profile_doc = await self.user_profiles_collection.find_one({"user_id": user_id})
        
        if profile_doc:
            return UserPreferenceProfile(**profile_doc)
        else:
            # Create new profile with defaults
            profile = UserPreferenceProfile(user_id=user_id)
            await self.user_profiles_collection.insert_one(profile.model_dump())
            return profile
    
    async def update_user_profile(self, user_id: str, updates: Dict[str, Any]):
        """Update user preference profile."""
        updates["last_updated"] = datetime.now()
        await self.user_profiles_collection.update_one(
            {"user_id": user_id},
            {"$set": updates},
            upsert=True
        )
    
    async def get_trending_products(self, limit: int = 20) -> List[TrendingProduct]:
        """Get trending products."""
        cursor = self.trending_collection.find().sort("trending_score", -1).limit(limit)
        trending_docs = await cursor.to_list(length=limit)
        
        if not trending_docs:
            # Mock trending products if none exist
            return [
                TrendingProduct(
                    product_id=f"trending_{i}",
                    marketplace=random.choice(["aliexpress", "ebay", "walmart"]),
                    title=f"Trending Product {i}",
                    view_count=random.randint(100, 1000),
                    trending_score=random.uniform(0.5, 1.0),
                    category=random.choice(["electronics", "fashion", "home"])
                )
                for i in range(limit)
            ]
        
        return [TrendingProduct(**doc) for doc in trending_docs]
    
    async def _update_profile_from_feedback(self, user_id: str, feedback: RecommendationFeedback):
        """Update user profile based on feedback."""
        profile = await self.get_user_profile(user_id)
        
        # Update preferences based on feedback
        updates = {}
        
        if feedback.clicked or feedback.viewed_details or feedback.added_to_wishlist:
            # Positive feedback - increase preferences
            if feedback.product_id:
                # Get product details to extract category/brand
                # This would query your product database
                product_category = "electronics"  # Mock
                
                if product_category:
                    current_pref = profile.preferred_categories.get(product_category, 0.1)
                    new_pref = min(1.0, current_pref + 0.1)
                    updates[f"preferred_categories.{product_category}"] = new_pref
        
        elif feedback.dismissed:
            # Negative feedback - decrease preferences slightly
            product_category = "electronics"  # Mock
            if product_category:
                current_pref = profile.preferred_categories.get(product_category, 0.1)
                new_pref = max(0.0, current_pref - 0.05)
                updates[f"preferred_categories.{product_category}"] = new_pref
        
        if updates:
            await self.update_user_profile(user_id, updates)
    
    async def _refresh_user_profile_from_activity(self, user_id: str):
        """Refresh user profile from recent activity."""
        # Analyze recent user activity and update preferences
        # This would look at:
        # - Recently viewed products
        # - Search queries
        # - Wishlist additions
        # - Purchase patterns
        
        # For now, just update the last_updated timestamp
        await self.update_user_profile(user_id, {"last_updated": datetime.now()})