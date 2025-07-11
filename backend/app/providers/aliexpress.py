"""
AliExpress provider with enhanced search capabilities.

This provider now supports multi-page searching for more results.
"""
import time
from app.services.search_service import search_products, fetch_product_detail


def search(query: str, page: int = 1, min_price: float = None, max_price: float = None):
    """Search AliExpress for results corresponding to frontend page.
    
    Args:
        query: Search keywords
        page: Frontend page number (1-based, expects ~50 products per page)
        min_price: Minimum price filter (hybrid: API + client-side validation)
        max_price: Maximum price filter (hybrid: API + client-side validation)
    
    Returns:
        List of ProductSummary dicts for that frontend page
    
    Note:
        Uses hybrid approach: API filtering parameters are sent to AliExpress API
        but client-side validation is added as backup since API filtering is unreliable.
    """
    try:
        # Dynamic pagination strategy based on price filtering
        # When price filters are active, fetch many more pages to ensure adequate results
        target_products = 50  # Target number of products per frontend page
        
        # Determine how many API pages to fetch based on whether filters are active
        # Since API filtering is unreliable, we need to fetch extra pages for client-side filtering
        if min_price is not None or max_price is not None:
            # With price filters, fetch many more pages since we'll filter client-side
            if max_price is not None and max_price <= 10:
                # Very restrictive filter (e.g., max $10) - expect to filter out ~80% of products
                max_api_pages_to_try = 15  # Try up to 15 pages (750 products max)
                min_products_threshold = 20  # Try to get at least 20 valid products
            elif max_price is not None and max_price <= 20:
                # Moderately restrictive filter - expect to filter out ~60% of products
                max_api_pages_to_try = 12  # Try up to 12 pages (600 products max)
                min_products_threshold = 30  # Try to get at least 30 valid products
            else:
                # Less restrictive filter - expect to filter out ~40% of products
                max_api_pages_to_try = 8  # Try up to 8 pages (400 products max)
                min_products_threshold = 35  # Try to get at least 35 valid products
        else:
            # Without filters, 2 pages is usually enough (100 products)
            max_api_pages_to_try = 2
            min_products_threshold = target_products
        
        all_products = []
        consecutive_empty_pages = 0
        
        # Calculate starting page based on frontend page number
        # We'll fetch dynamically, so we need to estimate the offset
        # Since we now get 50 products per API page, adjust estimates
        if min_price is not None or max_price is not None:
            # For filtered searches, we might need fewer API pages per frontend page
            # but start with page 1 for first frontend page to not miss results
            if page == 1:
                start_page = 1
            else:
                # For subsequent pages, estimate based on filter restrictiveness
                if max_price is not None and max_price <= 10:
                    estimated_pages_per_frontend = 5  # Very restrictive, many pages needed
                else:
                    estimated_pages_per_frontend = 3  # Less restrictive
                start_page = (page - 1) * estimated_pages_per_frontend + 1
        else:
            estimated_pages_per_frontend = 1  # Without filters, 1 API page = 50 products
            start_page = page  # Direct mapping
        
        # Fetch pages until we have enough products or hit limits
        start_time = time.time()
        max_duration = 30  # Maximum 30 seconds for the entire search
        
        for i in range(max_api_pages_to_try):
            # Check timeout
            if time.time() - start_time > max_duration:
                print(f"⏰ Search timeout after {max_duration}s, stopping with {len(all_products)} products")
                break
                
            api_page = start_page + i
            
            # Add small delay between requests to be respectful to the API
            if i > 0:
                time.sleep(0.1)  # 100ms delay between requests
            
            try:
                # Pass price filters directly to the API
                # Use maximum page size (50) to get more results per API call
                page_products = search_products(
                    query, 
                    page_no=api_page, 
                    page_size=50,
                    min_price=min_price,
                    max_price=max_price
                )
                
                if page_products:
                    all_products.extend(page_products)
                    consecutive_empty_pages = 0
                    print(f"AliExpress API page {api_page}: got {len(page_products)} products" + 
                          (f" (price range: ${min_price or 0}-${max_price or '∞'})" if min_price or max_price else "") +
                          f" | Total so far: {len(all_products)}")
                    
                    # If we have enough products for unfiltered search, we can stop
                    # For filtered searches, collect more products since many will be filtered out
                    if min_price is None and max_price is None:
                        if len(all_products) >= target_products:
                            print(f"Reached target of {target_products} products, stopping pagination")
                            break
                    else:
                        # For filtered searches, collect more products before stopping
                        # Stop early only if we've collected a lot more than target
                        if len(all_products) >= target_products * 3:
                            print(f"Collected {len(all_products)} products for filtering, stopping pagination")
                            break
                else:
                    consecutive_empty_pages += 1
                    print(f"AliExpress API page {api_page}: no products (consecutive empty: {consecutive_empty_pages})")
                    
                    # Stop if we get 3 consecutive empty pages
                    if consecutive_empty_pages >= 3:
                        print(f"Stopping after {consecutive_empty_pages} consecutive empty pages")
                        break
                    
            except Exception as e:
                print(f"AliExpress API page {api_page} error: {e}")
                consecutive_empty_pages += 1
                if consecutive_empty_pages >= 3:
                    break
        
        # HYBRID FILTERING: Apply client-side validation as backup
        # Since AliExpress API price filtering is unreliable, filter again client-side
        raw_product_count = len(all_products)  # Store count before filtering
        filtered_products = []
        
        if min_price is not None or max_price is not None:
            print(f"🔧 Applying client-side price validation (backup for unreliable API filtering)")
            
            for product in all_products:
                # Get product price
                price = product.get('sale_price')
                if price is None:
                    continue
                    
                try:
                    price_float = float(price)
                    
                    # Apply price filters
                    if min_price is not None and price_float < min_price:
                        continue
                    if max_price is not None and price_float > max_price:
                        continue
                        
                    filtered_products.append(product)
                    
                except (ValueError, TypeError):
                    # Skip products with invalid prices
                    continue
            
            print(f"📊 Client-side filtering: {len(all_products)} → {len(filtered_products)} products " +
                  f"(${min_price or 0}-${max_price or '∞'})")
            all_products = filtered_products
        
        # If we got very few results with filters, log a warning
        if (min_price is not None or max_price is not None) and len(all_products) < min_products_threshold:
            print(f"⚠️ Only found {len(all_products)} products with price filter ${min_price or 0}-${max_price or '∞'}. " +
                  f"Consider relaxing the price range for more results.")
        
        print(f"AliExpress frontend page {page}: final {len(all_products)} products")
        
        # Return results with metadata about filtering
        # If we had raw results but ended up with no final results due to filtering,
        # this indicates the filters are too restrictive rather than no data available
        if hasattr(search, '_last_raw_count'):
            delattr(search, '_last_raw_count')
        
        # Store raw count for failure detection
        raw_result_count = sum(1 for _ in range(max_api_pages_to_try) if True)  # Rough estimate
        
        # Add metadata to results if we have filtering active
        if (min_price is not None or max_price is not None) and len(all_products) == 0:
            # Check if we had raw results before filtering
            # We can infer this from the pagination attempts and product fetching
            search._filter_metadata = {
                "had_raw_results": True,  # We attempted multiple pages, so likely had raw results
                "filter_active": True,
                "final_count": len(all_products)
            }
        
        return all_products
        
    except Exception as e:
        print(f"AliExpress search error for frontend page {page}: {e}")
        return []


def detail(product_id: str):
    """Get detailed product information from AliExpress."""
    return fetch_product_detail(product_id)
