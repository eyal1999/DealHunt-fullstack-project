#!/usr/bin/env python3
"""Test exact price boundaries where AliExpress API filtering breaks"""
import os
import sys
import requests
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.core.utils import timestamp_shanghai, make_signature

def test_price_boundaries():
    """Test different price points to find where API filtering breaks"""
    print("🔍 TESTING ALIEXPRESS API PRICE BOUNDARIES")
    print("=" * 60)
    
    def _base_params(method: str) -> dict[str, str]:
        return {
            "app_key": settings.app_key,
            "method": method,
            "sign_method": settings.sign_method,
            "timestamp": timestamp_shanghai(),
            "v": settings.v,
            "format": "json",
            "target_currency": settings.target_currency,
            "target_language": settings.target_language,
        }
    
    # Test different price points (in dollars)
    test_prices = [0.5, 1, 2, 3, 4, 5, 7, 10, 15, 20]
    
    print(f"🎯 Testing prices: {test_prices}")
    print(f"📊 Using credentials: APP_KEY={settings.app_key}")
    
    results = []
    
    for price_usd in test_prices:
        price_cents = int(price_usd * 100)
        print(f"\n💰 Testing max_sale_price={price_cents} cents (${price_usd})")
        
        params = _base_params("aliexpress.affiliate.product.query")
        params.update({
            "keywords": "laptop stand",
            "page_no": 1,
            "page_size": 5,
            "tracking_id": settings.tracking_id,
            "max_sale_price": price_cents,
        })
        params["sign"] = make_signature(params, settings.app_secret)
        
        try:
            resp = requests.post(settings.base_url, data=params, 
                               headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}, 
                               timeout=10)
            data = resp.json()
            
            result = data.get("aliexpress_affiliate_product_query_response", {}).get("resp_result", {})
            
            if result.get("resp_code") == 200:
                products = result.get("result", {}).get("products", {}).get("product", [])
                
                if products:
                    prices = [float(p.get("sale_price", 0)) for p in products]
                    min_price = min(prices)
                    max_price = max(prices)
                    exceeding_count = sum(1 for p in prices if p > price_usd)
                    
                    working = exceeding_count == 0
                    results.append({
                        'filter_price': price_usd,
                        'product_count': len(products),
                        'min_price': min_price,
                        'max_price': max_price,
                        'exceeding_count': exceeding_count,
                        'working': working
                    })
                    
                    status = "✅ WORKING" if working else f"❌ BROKEN ({exceeding_count} exceed)"
                    print(f"   {status} - Found {len(products)} products, prices ${min_price:.2f}-${max_price:.2f}")
                else:
                    print(f"   ⚠️  No products found")
                    results.append({
                        'filter_price': price_usd,
                        'product_count': 0,
                        'working': False
                    })
            else:
                print(f"   ❌ API Error: {result.get('resp_msg')}")
                
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
    
    # Summary
    print(f"\n" + "=" * 60)
    print(f"📊 SUMMARY OF PRICE FILTER TESTING")
    print(f"=" * 60)
    
    working_prices = [r for r in results if r.get('working', False)]
    broken_prices = [r for r in results if not r.get('working', False)]
    
    if working_prices:
        max_working = max(r['filter_price'] for r in working_prices)
        print(f"✅ Price filtering WORKS up to: ${max_working}")
        print(f"   Working prices: {[r['filter_price'] for r in working_prices]}")
    
    if broken_prices:
        min_broken = min(r['filter_price'] for r in broken_prices if r['filter_price'] > 0)
        print(f"❌ Price filtering BREAKS starting at: ${min_broken}")
        print(f"   Broken prices: {[r['filter_price'] for r in broken_prices if r['filter_price'] > 0]}")
    
    print(f"\n💡 RECOMMENDATION:")
    if working_prices:
        max_working = max(r['filter_price'] for r in working_prices)
        print(f"   Use API filtering for prices ≤ ${max_working}")
        print(f"   Use client-side filtering for prices > ${max_working}")
    else:
        print(f"   API price filtering appears to be completely broken")
        print(f"   Recommend using client-side filtering for all price ranges")

if __name__ == "__main__":
    test_price_boundaries()