"""
Thin wrapper so the rest of the codebase can call:
    from app.providers import search, detail
and transparently hit eBay.
"""

from app.services.ebay_service import (
    search_products_ebay,
    fetch_product_detail_ebay,
)

def search(query: str):
    return search_products_ebay(query)

def detail(product_id: str):
    return fetch_product_detail_ebay(product_id)
