"""
AliExpress provider with enhanced search capabilities.

This provider now supports multi-page searching for more results.
"""
from app.services.search_service import search_products, fetch_product_detail


def search(query: str, page: int = 1, min_price: float = None, max_price: float = None):
    """Search AliExpress for results corresponding to frontend page.
    
    Args:
        query: Search keywords
        page: Frontend page number (1-based, expects ~50 products per page)
        min_price: Minimum price filter (currently applied client-side)
        max_price: Maximum price filter (currently applied client-side)
    
    Returns:
        List of ProductSummary dicts for that frontend page
    
    Note:
        AliExpress API doesn't support native price filtering, so we fetch 
        results and filter them client-side for now.
    """
    try:
        # For now, fetch more AliExpress pages to get more variety
        # Frontend page 1 = AliExpress pages 1-2 (24 products)
        # Frontend page 2 = AliExpress pages 3-4 (24 products)  
        # Frontend page 3 = AliExpress pages 5-6 (24 products), etc.
        
        aliexpress_pages_per_frontend_page = 2  # Start conservative
        all_products = []
        start_page = (page - 1) * aliexpress_pages_per_frontend_page + 1
        
        for api_page in range(start_page, start_page + aliexpress_pages_per_frontend_page):
            try:
                page_products = search_products(query, page_no=api_page, page_size=12)
                if page_products:
                    all_products.extend(page_products)
                    print(f"AliExpress API page {api_page}: got {len(page_products)} products")
                else:
                    print(f"AliExpress API page {api_page}: no products, stopping")
                    break
                    
            except Exception as e:
                print(f"AliExpress API page {api_page} error: {e}")
                break  # Stop on error to prevent timeouts
        
        # Apply client-side price filtering for AliExpress
        if min_price is not None or max_price is not None:
            filtered_products = []
            for product in all_products:
                price = product.get('sale_price', product.get('original_price', 0))
                if min_price is not None and price < min_price:
                    continue
                if max_price is not None and price > max_price:
                    continue
                filtered_products.append(product)
            
            print(f"AliExpress frontend page {page}: {len(filtered_products)} products after price filter (${min_price or 0}-${max_price or '∞'})")
            return filtered_products
        
        print(f"AliExpress frontend page {page}: total {len(all_products)} products")
        return all_products
        
    except Exception as e:
        print(f"AliExpress search error for frontend page {page}: {e}")
        return []


def detail(product_id: str):
    """Get detailed product information from AliExpress."""
    return fetch_product_detail(product_id)
