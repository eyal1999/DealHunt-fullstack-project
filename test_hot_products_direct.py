#!/usr/bin/env python3
"""Test hot products API directly"""

import sys
sys.path.append('/home/eyal1/DealHunt-fullstack-project/backend')

from app.services.hot_products_service import fetch_hot_products

# Test fetching hot products
print("Testing hot products API...")
products = fetch_hot_products(page_size=5)
print(f"Got {len(products)} products")

if products:
    for i, product in enumerate(products[:3], 1):
        print(f"\nProduct {i}:")
        print(f"  Title: {product.get('title', 'N/A')[:50]}...")
        print(f"  Price: ${product.get('sale_price', 0):.2f}")
        print(f"  Discount: {product.get('discount_percent', 0)}%")
else:
    print("No products returned - check API logs above for errors")