"""
AliExpress Smart Match Service for Advanced Product Recommendations
Uses AliExpress Advanced API to provide highly relevant and dynamic product recommendations
"""

import time
import requests
from typing import List, Dict, Optional
from app.config import settings
from app.cache import search_cache
from app.services.search_service import _base_params, make_signature, _HEADERS, generate_affiliate_links_batch


def fetch_smart_match_products(
    keywords: str,
    page_no: int = 1,
    page_size: int = 20,
    country: str = "US",
    device_id: Optional[str] = None,
    target_currency: str = "USD",
    target_language: str = "EN"
) -> List[Dict]:
    """
    Fetch smart match products from AliExpress using the Advanced API
    
    Args:
        keywords: Search keywords for smart matching
        page_no: Page number (default: 1)
        page_size: Number of products per page (default: 20, max: 50)
        country: Target country code
        device_id: Optional device ID for personalized recommendations
        target_currency: Currency for pricing
        target_language: Language for product info
        
    Returns:
        List of smart match product dictionaries
    """
    
    # Check cache first
    cache_key = f"smart_match:{keywords}:{page_no}:{page_size}:{country}"
    cached_results = search_cache.get(cache_key)
    if cached_results is not None:
        print(f"✅ Cache hit for smart match: {cache_key}")
        return cached_results
    
    try:
        # Build API parameters for smart match query
        params = _base_params("aliexpress.affiliate.smartmatch.query")
        params.update({
            'keywords': keywords,
            'page_no': str(page_no),
            'page_size': str(min(page_size, 50)),  # API max is 50
            'tracking_id': settings.tracking_id,
            'country': country,
            'target_currency': target_currency,
            'target_language': target_language,
            'fields': 'commission_rate,sale_price,sale_price_currency,shop_id,shop_url,' + 
                     'product_id,product_title,product_main_image_url,product_detail_url,' +
                     'original_price,original_price_currency,discount,lastest_volume,' +
                     'evaluate_rate,first_level_category_id,first_level_category_name,' +
                     'second_level_category_id,second_level_category_name,smart_match_score'
        })
        
        # Add device ID if provided (for personalized recommendations)
        if device_id:
            params['device_id'] = device_id
        
        # Generate signature
        params['sign'] = make_signature(params, settings.app_secret)
        
        # Make API request using POST like other AliExpress endpoints
        print(f"🎯 Fetching smart match products from AliExpress for '{keywords}' (page {page_no})")
        response = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(5, 15))
        
        if response.status_code != 200:
            print(f"❌ Smart match API error: HTTP {response.status_code}")
            return []
        
        data = response.json()
        
        # Check for API errors
        if 'error_response' in data:
            error_info = data['error_response']
            print(f"❌ API Error: {error_info.get('msg', 'Unknown error')} (code: {error_info.get('code')})")
            return []
        
        # Extract products from response
        products = []
        if 'aliexpress_affiliate_smartmatch_query_response' in data:
            resp_data = data['aliexpress_affiliate_smartmatch_query_response']
            if 'resp_result' in resp_data and resp_data['resp_result']:
                result = resp_data.get('resp_result', {})
                if result.get('resp_code') == 200:
                    products_data = result.get('result', {}).get('products', {}).get('product', [])
                    
                    # Extract detail URLs for affiliate link generation
                    detail_urls = [p.get('product_detail_url') for p in products_data if p.get('product_detail_url')]
                    
                    # Generate affiliate links in batch
                    affiliate_links = generate_affiliate_links_batch(detail_urls)
                    link_map = {link.source_value: link.promotion_link for link in affiliate_links}
                    print(f"🔗 Generated {len(affiliate_links)} affiliate links for smart match products")
                    
                    # Transform products to our standard format
                    for product in products_data:
                        detail_url = product.get('product_detail_url', '')
                        transformed = {
                            'product_id': str(product.get('product_id', '')),
                            'title': product.get('product_title', ''),
                            'image': product.get('product_main_image_url', ''),
                            'detail_url': detail_url,
                            'affiliate_link': link_map.get(detail_url, detail_url),
                            'original_price': float(product.get('original_price', 0)),
                            'sale_price': float(product.get('sale_price', 0)),
                            'discount': product.get('discount', 0),
                            'sold_count': product.get('lastest_volume', 0),
                            'rating': float(product.get('evaluate_rate', 0)) / 20 if product.get('evaluate_rate') else None,
                            'commission_rate': product.get('commission_rate', 0),
                            'marketplace': 'aliexpress',
                            'is_smart_match': True,
                            'smart_match_score': product.get('smart_match_score', 0),
                            'categories': {
                                "first_level": product.get('first_level_category_name', ''),
                                "second_level": product.get('second_level_category_name', ''),
                                "first_level_id": product.get('first_level_category_id', ''),
                                "second_level_id": product.get('second_level_category_id', ''),
                            },
                            'shop_url': product.get('shop_url', ''),
                            'shop_id': product.get('shop_id', '')
                        }
                        
                        # Calculate savings and discount percentage
                        if transformed['original_price'] > transformed['sale_price']:
                            transformed['savings'] = transformed['original_price'] - transformed['sale_price']
                            transformed['discount_percent'] = int((transformed['savings'] / transformed['original_price']) * 100)
                        else:
                            transformed['savings'] = 0
                            transformed['discount_percent'] = 0
                        
                        products.append(transformed)
                    
                    print(f"🎯 Smart match: found {len(products)} relevant products for '{keywords}'")
                else:
                    print(f"❌ Smart match API error: {result.get('resp_msg', 'Unknown error')}")
        
        # Cache results for 1 hour (smart match results can change frequently)
        if products:
            search_cache.set(cache_key, products, ttl=3600)
        
        return products
        
    except Exception as e:
        print(f"❌ Error fetching smart match products: {e}")
        import traceback
        traceback.print_exc()
        return []


def get_smart_recommendations(
    query: str,
    limit: int = 10,
    device_id: Optional[str] = None
) -> List[Dict]:
    """
    Get smart product recommendations for a query
    
    Args:
        query: Search query for recommendations
        limit: Maximum number of recommendations to return
        device_id: Optional device ID for personalization
        
    Returns:
        List of recommended products with smart match scores
    """
    
    try:
        # Fetch smart match products (get more than needed for filtering)
        all_smart_products = fetch_smart_match_products(
            keywords=query,
            page_size=min(50, limit * 2),
            device_id=device_id
        )
        
        if not all_smart_products:
            print(f"⚠️ No smart match products available for query: {query}")
            return []
        
        # Sort by smart match score and other quality indicators
        filtered_products = []
        seen_titles = set()
        
        # Sort by smart match score, rating, and sales volume
        all_smart_products.sort(key=lambda x: (
            x.get('smart_match_score', 0),
            x.get('rating', 0),
            x.get('sold_count', 0)
        ), reverse=True)
        
        for product in all_smart_products:
            # Skip if we already have a similar product (avoid duplicates)
            title_words = set(product['title'].lower().split()[:5])
            if any(len(title_words & seen_words) >= 3 for seen_words in seen_titles):
                continue
            
            # Add quality filters
            if (product.get('rating', 0) > 0 or product.get('sold_count', 0) > 0) and \
               product.get('sale_price', 0) > 0:
                filtered_products.append(product)
                seen_titles.add(title_words)
            
            # Stop when we have enough products
            if len(filtered_products) >= limit:
                break
        
        print(f"✅ Smart recommendations: selected {len(filtered_products)} high-quality products")
        return filtered_products
        
    except Exception as e:
        print(f"❌ Error getting smart recommendations: {e}")
        return []


def get_category_smart_match(
    category_id: str,
    keywords: Optional[str] = None,
    limit: int = 20
) -> List[Dict]:
    """
    Get smart match products for a specific category
    
    Args:
        category_id: AliExpress category ID
        keywords: Optional keywords to refine the search
        limit: Maximum number of products to return
        
    Returns:
        List of category-specific smart match products
    """
    
    try:
        # Build search keywords based on category and optional keywords
        search_terms = keywords if keywords else ""
        
        # Fetch smart match products
        smart_products = fetch_smart_match_products(
            keywords=search_terms,
            page_size=min(50, limit)
        )
        
        # Filter by category if we have category data
        if category_id and smart_products:
            category_filtered = []
            for product in smart_products:
                product_categories = product.get('categories', {})
                if (product_categories.get('first_level_id') == category_id or 
                    product_categories.get('second_level_id') == category_id):
                    category_filtered.append(product)
            
            if category_filtered:
                smart_products = category_filtered
                print(f"🎯 Filtered to {len(category_filtered)} products in category {category_id}")
        
        return smart_products[:limit]
        
    except Exception as e:
        print(f"❌ Error getting category smart match: {e}")
        return []