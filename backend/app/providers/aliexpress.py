"""
Thin wrapper that forwards to the existing search_service functions.

Having this file means every marketplace has the same entry‑point shape.
"""
from app.services.search_service import search_products, fetch_product_detail


def search(query: str):
    return search_products(query)


def detail(product_id: str):
    return fetch_product_detail(product_id)
