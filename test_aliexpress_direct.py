#!/usr/bin/env python3
"""
Test script to check if AliExpress API price filtering now works
using the existing backend infrastructure.
"""

import sys
import os
import asyncio

# Add backend to Python path
sys.path.append('/home/eyal1/DealHunt-fullstack-project/backend')

from app.providers.aliexpress import search

def test_price_filtering():
    """Test AliExpress API price filtering with different scenarios"""
    
    print("🔍 Testing AliExpress API Price Filtering")
    print("=" * 50)
    
    # Test scenarios
    test_cases = [
        {
            "name": "No price filter (baseline)",
            "query": "laptop stand",
            "min_price": None,
            "max_price": None,
            "expected": "Should return various price ranges"
        },
        {
            "name": "Max price $10 filter",
            "query": "laptop stand", 
            "min_price": None,
            "max_price": 10.00,
            "expected": "Should only return items under $10"
        },
        {
            "name": "Min price $20 filter",
            "query": "laptop stand",
            "min_price": 20.00, 
            "max_price": None,
            "expected": "Should only return items over $20"
        },
        {
            "name": "Price range $5-$15",
            "query": "laptop stand",
            "min_price": 5.00,
            "max_price": 15.00,
            "expected": "Should only return items between $5-$15"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test {i}: {test_case['name']}")
        print(f"Query: {test_case['query']}")
        print(f"Min Price: ${test_case['min_price'] or 'None'}")
        print(f"Max Price: ${test_case['max_price'] or 'None'}")
        print(f"Expected: {test_case['expected']}")
        
        try:
            # Use the existing AliExpress provider
            products = search(
                test_case['query'], 
                page=1, 
                min_price=test_case['min_price'], 
                max_price=test_case['max_price']
            )
            
            if products:
                print(f"✅ Found {len(products)} products")
                
                # Analyze price ranges
                prices = []
                for product in products:
                    price = float(product.get('sale_price', 0))
                    if price > 0:
                        prices.append(price)
                
                if prices:
                    min_found = min(prices)
                    max_found = max(prices)
                    avg_price = sum(prices) / len(prices)
                    
                    print(f"💰 Price Analysis:")
                    print(f"   Min Price: ${min_found:.2f}")
                    print(f"   Max Price: ${max_found:.2f}")
                    print(f"   Avg Price: ${avg_price:.2f}")
                    
                    # Check if filtering worked
                    filter_working = True
                    issues = []
                    
                    if test_case['min_price'] is not None:
                        violations = [p for p in prices if p < test_case['min_price']]
                        if violations:
                            filter_working = False
                            issues.append(f"{len(violations)} items below ${test_case['min_price']}")
                    
                    if test_case['max_price'] is not None:
                        violations = [p for p in prices if p > test_case['max_price']]
                        if violations:
                            filter_working = False
                            issues.append(f"{len(violations)} items above ${test_case['max_price']}")
                    
                    if filter_working:
                        print("✅ Price filtering appears to be WORKING!")
                    else:
                        print(f"❌ Price filtering NOT working: {', '.join(issues)}")
                        
                        # Show examples of violations
                        print("   Example violations:")
                        for j, product in enumerate(products[:3]):
                            price = float(product.get('sale_price', 0))
                            title = product.get('title', 'Unknown')[:50]
                            print(f"   - ${price:.2f}: {title}")
                else:
                    print("⚠️  No price data found in products")
            else:
                print("❌ No products returned")
                
        except Exception as e:
            print(f"❌ Search failed: {e}")
            import traceback
            traceback.print_exc()
        
        print("-" * 40)

if __name__ == "__main__":
    test_price_filtering()