"""
Thin wrapper so the rest of the codebase can call:
    from app.providers import search, detail
and transparently hit eBay.
"""

from app.services.ebay_service import (
    _search_ebay_single_page,
    fetch_product_detail_ebay,
)

def search(query: str, page: int = 1, min_price: float = None, max_price: float = None):
    """Search eBay for results corresponding to frontend page with optional price filtering.
    
    Args:
        query: Search keywords
        page: Frontend page number (1-based, expects ~50 products per page)
        min_price: Minimum price filter (optional)
        max_price: Maximum price filter (optional)
    
    Returns:
        List of ProductSummary dicts for that frontend page
    """
    try:
        # eBay gives 50 products per page, which matches our frontend page size
        # So we can directly map frontend page to eBay page
        from app.services.ebay_service import search_products_ebay_single_page
        
        results = search_products_ebay_single_page(query, page=page, min_price=min_price, max_price=max_price)
        print(f"eBay frontend page {page}: fetched {len(results)} products (price range: ${min_price or 0}-${max_price or '∞'})")
        return results
        
    except Exception as e:
        print(f"eBay search error for frontend page {page}: {e}")
        return []

def detail(product_id: str):
    return fetch_product_detail_ebay(product_id)
