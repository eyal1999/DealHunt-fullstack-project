import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestBasicWishlistEndpoints:
    """Test suite for basic wishlist CRUD operations."""

    def test_get_wishlist_no_auth(self):
        """Test getting wishlist without authentication fails."""
        response = client.get("/wishlist/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_add_to_wishlist_no_auth(self):
        """Test adding item to wishlist without authentication fails."""
        wishlist_item = {
            "product_id": "test_product_123",
            "marketplace": "aliexpress",
            "title": "Test Product",
            "price": 29.99,
            "image_url": "https://example.com/image.jpg",
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/wishlist/", json=wishlist_item)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_remove_from_wishlist_no_auth(self):
        """Test removing item from wishlist without authentication fails."""
        response = client.delete("/wishlist/some_item_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_wishlist_item_price_no_auth(self):
        """Test updating wishlist item price without authentication fails."""
        price_data = {"new_price": 19.99}
        
        response = client.put("/wishlist/some_item_id/update-price", json=price_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_check_wishlist_prices_no_auth(self):
        """Test checking wishlist prices without authentication fails."""
        response = client.post("/wishlist/check-prices")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_add_to_wishlist_invalid_data(self):
        """Test adding item to wishlist with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/wishlist/", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with incomplete data
        incomplete_item = {
            "product_id": "test_product_123"
            # Missing required fields
        }
        response = client.post("/wishlist/", json=incomplete_item, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_add_to_wishlist_invalid_marketplace(self):
        """Test adding item with invalid marketplace."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        wishlist_item = {
            "product_id": "test_product_123",
            "marketplace": "invalid_marketplace",
            "title": "Test Product",
            "price": 29.99,
            "image_url": "https://example.com/image.jpg",
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/wishlist/", json=wishlist_item, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid marketplace
            status.HTTP_400_BAD_REQUEST
        ]

    def test_add_to_wishlist_invalid_price(self):
        """Test adding item with invalid price."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        wishlist_item = {
            "product_id": "test_product_123",
            "marketplace": "aliexpress",
            "title": "Test Product",
            "price": -10.0,  # Negative price
            "image_url": "https://example.com/image.jpg",
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/wishlist/", json=wishlist_item, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid price
            status.HTTP_400_BAD_REQUEST
        ]

    def test_remove_nonexistent_wishlist_item(self):
        """Test removing non-existent wishlist item."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.delete("/wishlist/nonexistent_item_id", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_404_NOT_FOUND  # Item not found
        ]

    def test_update_price_invalid_data(self):
        """Test updating price with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid price
        invalid_price_data = {"new_price": -5.99}
        response = client.put("/wishlist/some_item_id/update-price", json=invalid_price_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid price
            status.HTTP_400_BAD_REQUEST
        ]
        
        # Test with missing price
        response = client.put("/wishlist/some_item_id/update-price", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Missing price
        ]

    def test_wishlist_endpoints_require_authentication(self):
        """Test that all wishlist endpoints require authentication."""
        endpoints_methods = [
            ("GET", "/wishlist/"),
            ("POST", "/wishlist/"),
            ("DELETE", "/wishlist/test_id"),
            ("PUT", "/wishlist/test_id/update-price"),
            ("POST", "/wishlist/check-prices")
        ]
        
        for method, endpoint in endpoints_methods:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            elif method == "DELETE":
                response = client.delete(endpoint)
            elif method == "PUT":
                response = client.put(endpoint, json={})
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, f"{method} {endpoint} should require authentication"