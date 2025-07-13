#!/usr/bin/env python3
"""
Test script to check if AliExpress API price filtering now works
with the new API access permissions.
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/home/eyal1/DealHunt-fullstack-project/backend/.env')

# AliExpress API configuration
API_KEY = os.getenv('ALIEXPRESS_API_KEY')
API_SECRET = os.getenv('ALIEXPRESS_API_SECRET') 
TRACKING_ID = os.getenv('ALIEXPRESS_TRACKING_ID')

def test_price_filtering():
    """Test AliExpress API price filtering with different scenarios"""
    
    if not all([API_KEY, API_SECRET, TRACKING_ID]):
        print("❌ Missing API credentials in .env file")
        return
    
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
        
        # Build API parameters
        params = {
            'app_signature': API_KEY,
            'method': 'aliexpress.affiliate.product.query',
            'format': 'json',
            'v': '2.0',
            'sign_method': 'md5',
            'timestamp': str(int(time.time() * 1000)),
            'keywords': test_case['query'],
            'page_no': 1,
            'page_size': 20,
            'tracking_id': TRACKING_ID,
            'fields': 'commission_rate,sale_price,original_price,product_title,product_id,product_main_image_url,product_detail_url'
        }
        
        # Add price filters if specified
        if test_case['min_price'] is not None:
            params['min_sale_price'] = int(test_case['min_price'] * 100)  # Convert to cents
            
        if test_case['max_price'] is not None:
            params['max_sale_price'] = int(test_case['max_price'] * 100)  # Convert to cents
        
        # Make API request
        try:
            response = requests.get(
                'https://gw.api.taobao.com/router/rest',
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for API errors
                if 'error_response' in data:
                    print(f"❌ API Error: {data['error_response']}")
                    continue
                
                # Extract products
                products = []
                if 'aliexpress_affiliate_product_query_response' in data:
                    resp_data = data['aliexpress_affiliate_product_query_response']
                    if 'resp_result' in resp_data and resp_data['resp_result']:
                        result = json.loads(resp_data['resp_result'])
                        if 'products' in result and 'product' in result['products']:
                            products = result['products']['product']
                
                if products:
                    print(f"✅ Found {len(products)} products")
                    
                    # Analyze price ranges
                    prices = []
                    for product in products:
                        if 'target_sale_price' in product:
                            price = float(product['target_sale_price'])
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
                                if 'target_sale_price' in product:
                                    price = float(product['target_sale_price'])
                                    title = product.get('product_title', 'Unknown')[:50]
                                    print(f"   - ${price:.2f}: {title}")
                    else:
                        print("⚠️  No price data found in products")
                else:
                    print("❌ No products returned")
                    
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"Response: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        print("-" * 40)

if __name__ == "__main__":
    import time
    test_price_filtering()