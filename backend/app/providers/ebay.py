"""
Thin wrapper so the rest of the codebase can call:
    from app.providers import search, detail
and transparently hit eBay.
"""

from app.services.ebay_service import (
    _search_ebay_single_page,
    fetch_product_detail_ebay,
)

def search(query: str, page: int = 1):
    """Search eBay for a specific page of results.
    
    Args:
        query: Search keywords
        page: Page number to fetch (1-based)
    
    Returns:
        List of ProductSummary dicts for that page
    """
    # Use the existing single-page search function
    from app.services.ebay_service import search_products_ebay_single_page
    return search_products_ebay_single_page(query, page=page)

def detail(product_id: str):
    return fetch_product_detail_ebay(product_id)
