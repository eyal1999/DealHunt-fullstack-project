"""
eBay Hot Products Service for Featured Deals
Simulates trending/hot products using eBay's Browse API with smart filtering
"""

import time
import random
from typing import List, Dict, Optional
import requests
from app.config import settings
from app.cache import search_cache
from app.services.ebay_service import _get_headers

def fetch_ebay_hot_products(
    page_no: int = 1,
    page_size: int = 20,
    category_id: Optional[int] = None
) -> List[Dict]:
    """
    Fetch hot/trending products from eBay using Browse API with trending strategies
    
    Args:
        page_no: Page number (default: 1)
        page_size: Number of products per page (default: 20, max: 200)
        category_id: Optional category filter
        
    Returns:
        List of hot product dictionaries
    """
    
    # Check cache first
    cache_key = f"ebay_hot_products:{category_id or 'all'}:{page_no}:{page_size}"
    cached_results = search_cache.get(cache_key)
    if cached_results is not None:
        print(f"✅ Cache hit for eBay hot products: {cache_key}")
        return cached_results
    
    try:
        # Trending search terms that typically have high engagement
        trending_terms = [
            "iPhone", "gaming", "vintage", "collectible", "rare",
            "sneakers", "jordans", "pokemon", "sports cards", "electronics",
            "designer", "luxury", "limited edition", "exclusive", "trending",
            "hot seller", "popular", "best seller", "top rated", "new arrival"
        ]
        
        # Popular categories that tend to have hot items
        hot_categories = [
            "Electronics",
            "Fashion", 
            "Collectibles",
            "Sporting Goods",
            "Home & Garden",
            "Toys & Hobbies",
            "Health & Beauty",
            "Automotive"
        ]
        
        # Use time-based rotation for variety
        hour = time.gmtime().tm_hour
        search_term = trending_terms[hour % len(trending_terms)]
        fallback_category = hot_categories[hour % len(hot_categories)]
        
        # Strategy 1: Search trending terms with high watch count sorting
        hot_products = []
        
        # Try multiple approaches to get diverse hot products
        strategies = [
            {
                "query": search_term,
                "sort": "watchCountHigh",  # Items with most watchers
                "description": "high watch count items"
            },
            {
                "query": fallback_category,
                "sort": "newlyListed", # Recently listed items
                "description": "newly listed trending items"
            },
            {
                "query": "trending OR popular OR hot",
                "sort": "bestMatch",  # Best match for trending
                "description": "trending keyword matches"
            }
        ]
        
        products_per_strategy = max(1, page_size // len(strategies))
        
        for strategy in strategies:
            strategy_products = _fetch_ebay_strategy(
                strategy["query"], 
                strategy["sort"],
                limit=products_per_strategy,
                offset=(page_no - 1) * products_per_strategy
            )
            
            if strategy_products:
                print(f"🔥 eBay strategy '{strategy['description']}': found {len(strategy_products)} products")
                hot_products.extend(strategy_products)
            
            # Stop if we have enough products
            if len(hot_products) >= page_size:
                break
        
        # Transform to our standard format and add hot product indicators
        transformed_products = []
        for product in hot_products[:page_size]:
            transformed = {
                'product_id': product.get('itemId', ''),
                'title': product.get('title', ''),
                'image': product.get('image', {}).get('imageUrl', ''),
                'detail_url': product.get('itemWebUrl', ''),
                'affiliate_link': product.get('itemAffiliateWebUrl', product.get('itemWebUrl', '')),
                'original_price': 0,
                'sale_price': 0,
                'marketplace': 'ebay',
                'is_hot_product': True,
                'sold_count': 0,
                'rating': 0,
                'shipping_cost': None,
            }
            
            # Parse price information
            price_info = product.get('price', {})
            if price_info:
                price_value = price_info.get('value', '0')
                try:
                    transformed['sale_price'] = float(price_value)
                    
                    # Check for original price (if item has discount)
                    original_price_info = product.get('originalPrice', {})
                    if original_price_info:
                        original_value = original_price_info.get('value', '0')
                        transformed['original_price'] = float(original_value)
                    else:
                        transformed['original_price'] = transformed['sale_price']
                        
                except (ValueError, TypeError):
                    transformed['sale_price'] = 0
                    transformed['original_price'] = 0
            
            # Add watch count as popularity indicator
            watch_count = product.get('watchCount', 0)
            transformed['watch_count'] = watch_count
            
            # Calculate engagement score (watch count + bidding activity)
            bid_count = product.get('bidCount', 0)
            transformed['bid_count'] = bid_count
            
            # eBay-specific hot indicators
            if watch_count > 10:  # Items with good watch count
                transformed['hot_indicator'] = 'popular'
            elif bid_count > 0:  # Active bidding
                transformed['hot_indicator'] = 'bidding'
            elif 'trending' in transformed['title'].lower():
                transformed['hot_indicator'] = 'trending'
            else:
                transformed['hot_indicator'] = 'featured'
            
            # Calculate savings if there's a discount
            if transformed['original_price'] > transformed['sale_price']:
                transformed['savings'] = transformed['original_price'] - transformed['sale_price']
                transformed['discount_percent'] = int((transformed['savings'] / transformed['original_price']) * 100)
            else:
                transformed['savings'] = 0
                transformed['discount_percent'] = 0
            
            # Calculate eBay-specific deal score
            watch_score = min(watch_count / 50, 1)  # Normalize watch count (50+ is high)
            bid_score = min(bid_count / 10, 1)  # Normalize bid count
            discount_score = transformed['discount_percent'] / 100
            
            # Weight watch count and bidding activity higher for eBay
            transformed['deal_score'] = (watch_score * 0.4) + (bid_score * 0.3) + (discount_score * 0.3)
            
            transformed_products.append(transformed)
        
        # Sort by deal score
        transformed_products.sort(key=lambda x: x.get('deal_score', 0), reverse=True)
        
        print(f"✅ eBay hot products: found {len(transformed_products)} trending items")
        
        # Cache results for 2 hours (eBay trending changes less frequently)
        if transformed_products:
            search_cache.set(cache_key, transformed_products, ttl=7200)
        
        return transformed_products
        
    except Exception as e:
        print(f"❌ Error fetching eBay hot products: {e}")
        import traceback
        traceback.print_exc()
        return []

def _fetch_ebay_strategy(query: str, sort: str, limit: int = 20, offset: int = 0) -> List[Dict]:
    """
    Fetch eBay products using a specific search strategy
    
    Args:
        query: Search query
        sort: Sort method
        limit: Number of results
        offset: Starting offset
        
    Returns:
        List of eBay product dictionaries
    """
    try:
        params = {
            "q": query,
            "limit": min(limit, 200),  # eBay max is 200
            "offset": offset,
            "sort": sort,
            "filter": "priceCurrency:USD,itemLocationCountry:US"  # USD prices, US items
        }
        
        resp = requests.get(
            f"{settings.ebay_base_url}/buy/browse/v1/item_summary/search",
            params=params, 
            headers=_get_headers(), 
            timeout=(5, 15)
        )
        
        # Handle token refresh if needed
        if resp.status_code in [401, 403]:
            from app.services.ebay_token_manager import ebay_token_manager
            ebay_token_manager.force_refresh()
            resp = requests.get(
                f"{settings.ebay_base_url}/buy/browse/v1/item_summary/search",
                params=params, 
                headers=_get_headers(), 
                timeout=(5, 15)
            )
        
        resp.raise_for_status()
        response_data = resp.json()
        
        items = response_data.get("itemSummaries", [])
        return items
        
    except Exception as e:
        print(f"❌ eBay strategy '{sort}' failed: {e}")
        return []

def get_ebay_featured_deals(limit: int = 12) -> List[Dict]:
    """
    Get eBay featured deals for homepage display
    
    Args:
        limit: Maximum number of deals to return
        
    Returns:
        List of eBay featured deal products
    """
    
    try:
        # Fetch hot products (get more than needed for filtering)
        all_hot_products = fetch_ebay_hot_products(page_size=min(50, limit * 2))
        
        if not all_hot_products:
            print("⚠️ No eBay hot products available for featured deals")
            return []
        
        # Filter and prioritize the best deals
        featured_deals = []
        seen_titles = set()
        
        # Sort by deal score and watch count
        all_hot_products.sort(key=lambda x: (x.get('deal_score', 0), x.get('watch_count', 0)), reverse=True)
        
        for product in all_hot_products:
            # Skip if we already have a similar product (avoid duplicates)
            title_words = set(product['title'].lower().split()[:5])
            if any(len(title_words & seen_words) >= 3 for seen_words in seen_titles):
                continue
                
            featured_deals.append(product)
            seen_titles.add(frozenset(title_words))
            
            if len(featured_deals) >= limit:
                break
        
        print(f"🎯 Selected {len(featured_deals)} eBay featured deals")
        return featured_deals
        
    except Exception as e:
        print(f"❌ Error getting eBay featured deals: {e}")
        return []