"""
Hot Products Service for Featured Deals
Uses AliExpress Advanced API to fetch trending/hot products
"""

import time
import json
from typing import List, Dict, Optional
import requests
from app.config import settings
from app.cache import search_cache
from app.services.search_service import _base_params, make_signature, _HEADERS, generate_affiliate_links_batch
from app.services.ebay_hot_products_service import get_ebay_featured_deals


def fetch_hot_products(
    category_id: Optional[int] = None,
    page_no: int = 1,
    page_size: int = 20,
    country: str = "US",
    target_currency: str = "USD",
    target_language: str = "EN"
) -> List[Dict]:
    """
    Fetch hot/trending products from AliExpress using the Advanced API
    
    Args:
        category_id: Optional category filter
        page_no: Page number (default: 1)
        page_size: Number of products per page (default: 20, max: 50)
        country: Target country code
        target_currency: Currency for prices
        target_language: Language for product info
        
    Returns:
        List of hot product dictionaries
    """
    
    # Check cache first
    cache_key = f"hot_products:{category_id or 'all'}:{page_no}:{page_size}"
    cached_results = search_cache.get(cache_key)
    if cached_results is not None:
        print(f"✅ Cache hit for hot products: {cache_key}")
        return cached_results
    
    try:
        # Build API parameters for hot products query
        params = _base_params("aliexpress.affiliate.hotproduct.query")
        params.update({
            'page_no': str(page_no),
            'page_size': str(min(page_size, 50)),  # API max is 50
            'platform_product_type': 'ALL',
            'tracking_id': settings.tracking_id,
            'fields': 'commission_rate,sale_price,sale_price_currency,shop_id,shop_url,' + 
                     'product_id,product_title,product_main_image_url,product_detail_url,' +
                     'original_price,original_price_currency,discount,lastest_volume,' +
                     'hot_product_commission_rate,evaluate_rate,first_level_category_id,' +
                     'first_level_category_name,second_level_category_id,second_level_category_name'
        })
        
        # Add category filter if specified
        if category_id:
            params['category_ids'] = str(category_id)
        
        # Generate signature
        params['sign'] = make_signature(params, settings.app_secret)
        
        # Make API request using POST like other AliExpress endpoints
        print(f"🔥 Fetching hot products from AliExpress (page {page_no})")
        response = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(5, 15))
        
        if response.status_code != 200:
            print(f"❌ Hot products API error: HTTP {response.status_code}")
            return []
        
        data = response.json()
        
        # Check for API errors
        if 'error_response' in data:
            error_info = data['error_response']
            print(f"❌ API Error: {error_info.get('msg', 'Unknown error')} (code: {error_info.get('code')})")
            return []
        
        # Extract products from response
        products = []
        if 'aliexpress_affiliate_hotproduct_query_response' in data:
            resp_data = data['aliexpress_affiliate_hotproduct_query_response']
            if 'resp_result' in resp_data and resp_data['resp_result']:
                result = resp_data.get('resp_result', {})
                if result.get('resp_code') == 200:
                    products_data = result.get('result', {}).get('products', {}).get('product', [])
                    
                    # Extract detail URLs for affiliate link generation
                    detail_urls = [p.get('product_detail_url') for p in products_data if p.get('product_detail_url')]
                    
                    # Generate affiliate links in batch
                    affiliate_links = generate_affiliate_links_batch(detail_urls)
                    link_map = {link.source_value: link.promotion_link for link in affiliate_links}
                    print(f"🔗 Generated {len(affiliate_links)} affiliate links for hot products")
                    
                    # Transform products to our standard format
                    for product in products_data:
                        detail_url = product.get('product_detail_url', '')
                        transformed = {
                            'product_id': str(product.get('product_id', '')),
                            'title': product.get('product_title', ''),
                            'image': product.get('product_main_image_url', ''),
                            'detail_url': detail_url,
                            'affiliate_link': link_map.get(detail_url, detail_url),  # Add affiliate link with fallback
                            'original_price': float(product.get('original_price', 0)),
                            'sale_price': float(product.get('sale_price', 0)),
                            'discount': product.get('discount', 0),
                            'sold_count': product.get('lastest_volume', 0),
                            'rating': float(product.get('evaluate_rate', 0)) / 20 if product.get('evaluate_rate') else None,  # Convert to 5-star scale
                            'commission_rate': product.get('hot_product_commission_rate', product.get('commission_rate', 0)),
                            'marketplace': 'aliexpress',
                            'is_hot_product': True,
                            'categories': {
                                "first_level": product.get('first_level_category_name', ''),
                                "second_level": product.get('second_level_category_name', ''),
                                "first_level_id": product.get('first_level_category_id', ''),
                                "second_level_id": product.get('second_level_category_id', ''),
                            },
                            'shop_url': product.get('shop_url', ''),
                            'shop_id': product.get('shop_id', '')
                        }
                        
                        # Calculate savings
                        if transformed['original_price'] > transformed['sale_price']:
                            transformed['savings'] = transformed['original_price'] - transformed['sale_price']
                            # Handle discount that might include % sign
                            discount_str = str(transformed['discount'])
                            if discount_str.endswith('%'):
                                transformed['discount_percent'] = int(float(discount_str.rstrip('%')))
                            elif discount_str.isdigit():
                                transformed['discount_percent'] = int(discount_str)
                            else:
                                transformed['discount_percent'] = int((transformed['savings'] / transformed['original_price']) * 100)
                        else:
                            transformed['savings'] = 0
                            transformed['discount_percent'] = 0
                        
                        products.append(transformed)
                    
                    print(f"✅ Found {len(products)} hot products")
                else:
                    print(f"❌ API returned error code: {result.get('resp_code')}")
        
        # Cache results for 1 hour (hot products change less frequently)
        if products:
            search_cache.set(cache_key, products, ttl=3600)
        
        return products
        
    except Exception as e:
        print(f"❌ Error fetching hot products: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_featured_deals(limit: int = 12) -> List[Dict]:
    """
    Get featured deals for homepage display
    Combines hot products with best discounts
    
    Args:
        limit: Maximum number of deals to return
        
    Returns:
        List of featured deal products
    """
    
    # Fetch hot products (start with 1 page for now)
    all_hot_products = []
    
    try:
        # Start with page 1 only to avoid timeouts
        products = fetch_hot_products(page_no=1, page_size=min(50, limit * 3))
        all_hot_products.extend(products)
        print(f"🔥 Fetched {len(products)} hot products for featured deals")
    except Exception as e:
        print(f"❌ Error fetching hot products for featured deals: {e}")
        return []
    
    if not all_hot_products:
        print("⚠️ No hot products available for featured deals")
        return []
    
    # Sort by combination of discount and popularity
    # Prioritize high discount + high sales volume
    for product in all_hot_products:
        # Calculate a "deal score" combining discount and popularity
        discount_score = product.get('discount_percent', 0) / 100  # 0-1 scale
        
        # Normalize sold count (assume 1000+ is very good)
        sold_count = product.get('sold_count', 0)
        popularity_score = min(sold_count / 1000, 1)  # 0-1 scale
        
        # Weight discount more heavily for "deals"
        product['deal_score'] = (discount_score * 0.7) + (popularity_score * 0.3)
    
    # Sort by deal score and get top items
    all_hot_products.sort(key=lambda x: x.get('deal_score', 0), reverse=True)
    
    # Get top deals, ensuring variety
    featured_deals = []
    seen_titles = set()
    
    for product in all_hot_products:
        # Skip if we already have a similar product (avoid duplicates)
        title_words = set(product['title'].lower().split()[:5])
        if any(len(title_words & seen_words) >= 3 for seen_words in seen_titles):
            continue
            
        featured_deals.append(product)
        seen_titles.add(frozenset(title_words))  # Use frozenset so it's hashable
        
        if len(featured_deals) >= limit:
            break
    
    print(f"🎯 Selected {len(featured_deals)} featured deals for homepage")
    return featured_deals

def get_mixed_featured_deals(limit: int = 12, aliexpress_ratio: float = 0.5) -> List[Dict]:
    """
    Get mixed featured deals from both AliExpress and eBay
    
    Args:
        limit: Total number of deals to return
        aliexpress_ratio: Ratio of AliExpress to total deals (0.5 = 50% AliExpress, 50% eBay)
        
    Returns:
        List of mixed featured deal products from both marketplaces
    """
    
    # Calculate split between marketplaces
    aliexpress_count = int(limit * aliexpress_ratio)
    ebay_count = limit - aliexpress_count
    
    print(f"🔥 Fetching mixed deals (1:1 ratio): {aliexpress_count} AliExpress + {ebay_count} eBay")
    
    all_deals = []
    
    # Get AliExpress hot products
    try:
        aliexpress_deals = get_featured_deals(aliexpress_count)
        if aliexpress_deals:
            print(f"✅ Got {len(aliexpress_deals)} AliExpress hot deals")
            all_deals.extend(aliexpress_deals)
        else:
            print("⚠️ No AliExpress deals available, adjusting eBay count")
            ebay_count += aliexpress_count  # Give eBay the extra slots
    except Exception as e:
        print(f"❌ Error fetching AliExpress deals: {e}")
        ebay_count += aliexpress_count  # Give eBay the extra slots
    
    # Get eBay hot products
    try:
        ebay_deals = get_ebay_featured_deals(ebay_count)
        if ebay_deals:
            print(f"✅ Got {len(ebay_deals)} eBay hot deals")
            all_deals.extend(ebay_deals)
        else:
            print("⚠️ No eBay deals available")
    except Exception as e:
        print(f"❌ Error fetching eBay deals: {e}")
    
    if not all_deals:
        print("❌ No deals available from either marketplace")
        return []
    
    # Mix and sort by deal score for optimal user experience
    # Combine deal scores from different marketplaces
    for deal in all_deals:
        # Normalize deal scores between marketplaces
        marketplace = deal.get('marketplace', '')
        base_score = deal.get('deal_score', 0)
        
        if marketplace == 'aliexpress':
            # AliExpress scores are based on discount + popularity
            deal['normalized_score'] = base_score
        elif marketplace == 'ebay':
            # eBay scores are based on watch count + bidding + discount
            deal['normalized_score'] = base_score
        else:
            deal['normalized_score'] = 0
    
    # Sort each marketplace's deals by their normalized score
    aliexpress_deals = [d for d in all_deals if d.get('marketplace') == 'aliexpress']
    ebay_deals = [d for d in all_deals if d.get('marketplace') == 'ebay']
    
    aliexpress_deals.sort(key=lambda x: x.get('normalized_score', 0), reverse=True)
    ebay_deals.sort(key=lambda x: x.get('normalized_score', 0), reverse=True)
    
    # Alternate between marketplaces for optimal user experience
    final_deals = []
    ae_index = 0
    eb_index = 0
    
    for i in range(limit):
        # Alternate starting with AliExpress
        if i % 2 == 0:  # Even positions (0, 2, 4...) - AliExpress
            if ae_index < len(aliexpress_deals):
                final_deals.append(aliexpress_deals[ae_index])
                ae_index += 1
            elif eb_index < len(ebay_deals):
                final_deals.append(ebay_deals[eb_index])
                eb_index += 1
        else:  # Odd positions (1, 3, 5...) - eBay
            if eb_index < len(ebay_deals):
                final_deals.append(ebay_deals[eb_index])
                eb_index += 1
            elif ae_index < len(aliexpress_deals):
                final_deals.append(aliexpress_deals[ae_index])
                ae_index += 1
    
    print(f"🎯 Mixed featured deals: {len(final_deals)} total ({sum(1 for d in final_deals if d.get('marketplace') == 'aliexpress')} AliExpress, {sum(1 for d in final_deals if d.get('marketplace') == 'ebay')} eBay)")
    
    return final_deals[:limit]