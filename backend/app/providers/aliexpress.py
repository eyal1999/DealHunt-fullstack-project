"""
AliExpress provider with enhanced search capabilities.

This provider now supports multi-page searching for more results.
"""
from app.services.search_service import search_products_multi_page, fetch_product_detail


def search(query: str):
    """Search AliExpress with multi-page support for more results.
    
    Now returns up to 100 products (2 pages × 50 products) instead of just 12.
    Uses intelligent defaults that can be configured in search_service.py.
    """
    return search_products_multi_page(query)


def detail(product_id: str):
    """Get detailed product information from AliExpress."""
    return fetch_product_detail(product_id)
