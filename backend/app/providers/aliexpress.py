"""
AliExpress provider with enhanced search capabilities.

This provider now supports multi-page searching for more results.
"""
from app.services.search_service import search_products, fetch_product_detail


def search(query: str, page: int = 1):
    """Search AliExpress for a specific page of results.
    
    Args:
        query: Search keywords
        page: Page number to fetch (1-based)
    
    Returns:
        List of ProductSummary dicts for that page
    """
    # Since AliExpress returns 12 products per page, we fetch just one page
    try:
        return search_products(query, page_no=page, page_size=12)
    except Exception as e:
        # Return empty list on error to allow other providers to continue
        print(f"AliExpress search error for page {page}: {e}")
        return []


def detail(product_id: str):
    """Get detailed product information from AliExpress."""
    return fetch_product_detail(product_id)
