"""
AliExpress-specific Product Recommendations Service

This service integrates with the existing AliExpress API to provide real-time
product recommendations using actual API data. It complements the existing
AI-powered recommendation service by providing immediate, API-based suggestions.
"""

from typing import List, Dict, Optional
import requests
import re
from collections import defaultdict

# Try to import dependencies, set flags for availability
HAS_DEPENDENCIES = True
try:
    from app.config import settings
    from app.core.utils import timestamp_shanghai, make_signature
    from app.errors import AliexpressError
    from app.models.models import ProductSummary
except ImportError as e:
    # Handle missing dependencies gracefully
    HAS_DEPENDENCIES = False
    settings = None
    print(f"Warning: Core dependencies not available for recommendations service: {e}")
    
    # Create stub classes/functions
    class AliexpressError(Exception):
        pass
    
    class ProductSummary:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
        def model_dump(self):
            return self.__dict__
    
    def timestamp_shanghai():
        return "stub_timestamp"
    
    def make_signature(params, secret):
        return "stub_signature"

# Constants for recommendation service
MAX_RECOMMENDATIONS = 20
DEFAULT_RECOMMENDATIONS = 8
SIMILAR_PRODUCTS_LIMIT = 12

# Headers for API requests
_HEADERS = {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}

def _base_params(method: str) -> dict[str, str]:
    """Set the common AliExpress param block for recommendations."""
    if not HAS_DEPENDENCIES or not settings:
        return {}
    
    return {
        "app_key": settings.app_key,
        "method": method,
        "sign_method": settings.sign_method,
        "timestamp": timestamp_shanghai(),
        "v": settings.v,
        "format": "json",
        "target_currency": settings.target_currency,
        "target_language": settings.target_language,
    }

class AliExpressRecommendationService:
    """Service for generating product recommendations using AliExpress API."""
    
    @staticmethod
    def extract_keywords_from_title(title: str) -> List[str]:
        """Extract meaningful keywords from product title for similarity matching."""
        if not title:
            return []
        
        # Remove common stop words and extract meaningful terms
        stop_words = {
            'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'new', 'free', 'shipping', 'hot', 'sale'
        }
        
        # Clean and split title
        clean_title = re.sub(r'[^\w\s]', ' ', title.lower())
        words = [word.strip() for word in clean_title.split() if len(word) > 2]
        
        # Filter out stop words and return meaningful keywords
        keywords = [word for word in words if word not in stop_words]
        return keywords[:5]  # Return top 5 keywords
    
    @staticmethod
    def get_similar_products(product_id: str, product_title: str, category: str = None, limit: int = SIMILAR_PRODUCTS_LIMIT) -> List[dict]:
        """
        Get products similar to the given product using keyword matching and category filtering.
        
        Args:
            product_id: The ID of the current product
            product_title: Title of the current product for keyword extraction
            category: Product category for better matching
            limit: Maximum number of similar products to return
            
        Returns:
            List of similar ProductSummary dicts
        """
        try:
            # Check if dependencies are available
            if not HAS_DEPENDENCIES:
                print("⚠️ Dependencies not available for recommendations")
                return []
            
            print(f"🔍 Finding similar products for: {product_title[:50]}...")
            
            # Extract keywords from product title
            keywords = AliExpressRecommendationService.extract_keywords_from_title(product_title)
            
            if not keywords:
                print("⚠️ No keywords extracted from title, using category search")
                if category:
                    keywords = [category]
                else:
                    return []
            
            # Create search query from keywords
            search_query = " ".join(keywords[:3])  # Use top 3 keywords
            print(f"🔍 Search query for similar products: '{search_query}'")
            
            # Dynamic import to avoid circular dependencies
            try:
                from app.services.search_service import search_products
                # Search for products with extracted keywords
                similar_products = search_products(
                    query=search_query,
                    page_no=1,
                    page_size=min(limit * 2, 50)  # Get more to filter out the original product
                )
            except ImportError as e:
                print(f"Failed to import search_products: {e}")
                return []
            
            # Filter out the original product and limit results
            filtered_products = [
                product for product in similar_products 
                if str(product.get('product_id', '')) != str(product_id)
            ]
            
            # Sort by relevance (sold count and rating)
            filtered_products.sort(
                key=lambda x: (
                    x.get('sold_count', 0) * 0.7 + 
                    (x.get('rating', 0) or 0) * 100 * 0.3
                ), 
                reverse=True
            )
            
            result = filtered_products[:limit]
            print(f"✅ Found {len(result)} similar products")
            return result
            
        except Exception as e:
            print(f"❌ Error getting similar products: {e}")
            return []
    
    @staticmethod
    def get_trending_in_category(category_name: str, limit: int = DEFAULT_RECOMMENDATIONS) -> List[dict]:
        """
        Get trending products in a specific category using hot products API.
        
        Args:
            category_name: Name of the category
            limit: Maximum number of products to return
            
        Returns:
            List of trending ProductSummary dicts in the category
        """
        try:
            # Check if dependencies are available
            if not HAS_DEPENDENCIES:
                print("⚠️ Dependencies not available for trending recommendations")
                return []
            
            print(f"🔥 Getting trending products in category: {category_name}")
            
            # Dynamic import to avoid circular dependencies
            try:
                from app.services.hot_products_service import get_aliexpress_hot_products
                # Use hot products API with category filtering
                hot_products = get_aliexpress_hot_products(
                    category=category_name,
                    limit=limit * 2  # Get more to ensure we have enough after filtering
                )
            except ImportError as e:
                print(f"Failed to import get_aliexpress_hot_products: {e}")
                return []
            
            # Sort by deal score and limit results
            trending_products = sorted(
                hot_products,
                key=lambda x: x.get('deal_score', 0),
                reverse=True
            )[:limit]
            
            print(f"✅ Found {len(trending_products)} trending products in {category_name}")
            return trending_products
            
        except Exception as e:
            print(f"❌ Error getting trending products in category: {e}")
            return []
    
    @staticmethod
    def get_price_alternatives(current_price: float, product_title: str, price_range_percent: float = 0.3, limit: int = DEFAULT_RECOMMENDATIONS) -> List[dict]:
        """
        Get products with similar functionality but different price points.
        
        Args:
            current_price: Price of the current product
            product_title: Title for keyword extraction
            price_range_percent: How much price variance to allow (0.3 = 30%)
            limit: Maximum number of alternatives to return
            
        Returns:
            List of price alternative ProductSummary dicts
        """
        try:
            # Check if dependencies are available
            if not HAS_DEPENDENCIES:
                print("⚠️ Dependencies not available for price alternatives")
                return []
            
            print(f"💰 Finding price alternatives for ${current_price}")
            
            # Calculate price ranges
            lower_bound = current_price * (1 - price_range_percent)
            upper_bound = current_price * (1 + price_range_percent)
            
            # Extract keywords from title
            keywords = AliExpressRecommendationService.extract_keywords_from_title(product_title)
            if not keywords:
                return []
            
            search_query = " ".join(keywords[:2])  # Use top 2 keywords for broader search
            
            # Dynamic import to avoid circular dependencies
            try:
                from app.services.search_service import search_products
                # Search with price filtering
                alternatives = search_products(
                    query=search_query,
                    page_no=1,
                    page_size=limit * 2,
                    min_price=lower_bound,
                    max_price=upper_bound
                )
            except ImportError as e:
                print(f"Failed to import search_products for price alternatives: {e}")
                return []
            
            # Sort by best value (price vs rating vs sold count)
            def value_score(product):
                price = product.get('sale_price', 0) or product.get('original_price', 0)
                rating = product.get('rating', 0) or 0
                sold_count = product.get('sold_count', 0)
                
                if price <= 0:
                    return 0
                
                # Calculate value score: (rating * sold_count) / price
                return (rating * (sold_count + 1)) / price
            
            alternatives.sort(key=value_score, reverse=True)
            
            result = alternatives[:limit]
            print(f"✅ Found {len(result)} price alternatives")
            return result
            
        except Exception as e:
            print(f"❌ Error getting price alternatives: {e}")
            return []
    
    @staticmethod
    def get_comprehensive_recommendations(product_id: str, product_title: str, current_price: float, category: str = None, limit_per_type: int = 4) -> Dict[str, List[dict]]:
        """
        Get comprehensive recommendations including similar products, trending items, and price alternatives.
        
        Args:
            product_id: Current product ID
            product_title: Current product title
            current_price: Current product price
            category: Product category
            limit_per_type: Number of recommendations per type
            
        Returns:
            Dictionary with different types of recommendations
        """
        recommendations = {
            'similar_products': [],
            'trending_in_category': [],
            'price_alternatives': []
        }
        
        try:
            print(f"🎯 Getting comprehensive recommendations for product {product_id}")
            
            # Get similar products
            recommendations['similar_products'] = AliExpressRecommendationService.get_similar_products(
                product_id=product_id,
                product_title=product_title,
                category=category,
                limit=limit_per_type
            )
            
            # Get trending products in category (if category available)
            if category:
                recommendations['trending_in_category'] = AliExpressRecommendationService.get_trending_in_category(
                    category_name=category,
                    limit=limit_per_type
                )
            
            # Get price alternatives
            recommendations['price_alternatives'] = AliExpressRecommendationService.get_price_alternatives(
                current_price=current_price,
                product_title=product_title,
                limit=limit_per_type
            )
            
            # Remove duplicates across recommendation types
            all_product_ids = set()
            for rec_type, products in recommendations.items():
                unique_products = []
                for product in products:
                    pid = product.get('product_id')
                    if pid and pid not in all_product_ids and str(pid) != str(product_id):
                        all_product_ids.add(pid)
                        unique_products.append(product)
                recommendations[rec_type] = unique_products
            
            total_recommendations = sum(len(products) for products in recommendations.values())
            print(f"✅ Generated {total_recommendations} total recommendations across all types")
            
            return recommendations
            
        except Exception as e:
            print(f"❌ Error getting comprehensive recommendations: {e}")
            return recommendations

# Convenience functions for easy integration
def get_similar_products(product_id: str, product_title: str, category: str = None, limit: int = SIMILAR_PRODUCTS_LIMIT) -> List[dict]:
    """Convenience function for getting similar products."""
    return AliExpressRecommendationService.get_similar_products(product_id, product_title, category, limit)

def get_trending_in_category(category_name: str, limit: int = DEFAULT_RECOMMENDATIONS) -> List[dict]:
    """Convenience function for getting trending products in category."""
    return AliExpressRecommendationService.get_trending_in_category(category_name, limit)

def get_price_alternatives(current_price: float, product_title: str, limit: int = DEFAULT_RECOMMENDATIONS) -> List[dict]:
    """Convenience function for getting price alternatives."""
    return AliExpressRecommendationService.get_price_alternatives(current_price, product_title, limit=limit)

def get_comprehensive_recommendations(product_id: str, product_title: str, current_price: float, category: str = None) -> Dict[str, List[dict]]:
    """Convenience function for getting all types of recommendations."""
    return AliExpressRecommendationService.get_comprehensive_recommendations(product_id, product_title, current_price, category)