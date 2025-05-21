# backend/test_api.py
import requests
import json

# Base URL of your API
BASE_URL = "http://localhost:8000"

def test_register():
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "password123"
    }
    response = requests.post(url, json=payload)
    print(f"Register Response: {response.status_code}")
    print(response.json())
    return response.json()

def test_login():
    url = f"{BASE_URL}/auth/login"
    # FastAPI OAuth2 requires form data with 'username' field (not 'email')
    payload = {
        "username": "test@example.com",  
        "password": "password123"
    }
    response = requests.post(url, data=payload)
    print(f"Login Response: {response.status_code}")
    print(response.json())
    return response.json()

def test_get_me(token):
    url = f"{BASE_URL}/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    print(f"Get Me Response: {response.status_code}")
    print(response.json())
    return response.json()

def test_add_to_wishlist(token):
    url = f"{BASE_URL}/wishlist"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "product_id": "12345",
        "marketplace": "aliexpress",
        "title": "Test Product",
        "original_price": 99.99,
        "sale_price": 79.99,
        "image": "https://example.com/test.jpg",
        "detail_url": "https://example.com/product/12345",
        "affiliate_link": "https://example.com/ref/12345"
    }
    response = requests.post(url, json=payload, headers=headers)
    print(f"Add to Wishlist Response: {response.status_code}")
    print(response.json())
    return response.json()

def test_get_wishlist(token):
    url = f"{BASE_URL}/wishlist"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    print(f"Get Wishlist Response: {response.status_code}")
    print(response.json())
    return response.json()

def test_search():
    url = f"{BASE_URL}/search"
    params = {"q": "laptop", "sort": "price_low"}
    response = requests.get(url, params=params)
    print(f"Search Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

if __name__ == "__main__":
    print("Testing API endpoints...")
    
    # Test search (no authentication required)
    test_search()
    
    # Test authentication flow
    try:
        register_data = test_register()
        print("\nRegistration successful")
    except Exception as e:
        print(f"\nRegistration failed, user might already exist: {e}")
    
    # Login to get token
    login_data = test_login()
    token = login_data.get("access_token")
    
    if token:
        # Test authenticated endpoints
        test_get_me(token)
        wishlist_item = test_add_to_wishlist(token)
        test_get_wishlist(token)
    else:
        print("Login failed, cannot test authenticated endpoints")