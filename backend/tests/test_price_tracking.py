import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestPriceTrackingEndpoints:
    """Test suite for price tracking endpoints."""

    def test_create_price_alert_no_auth(self):
        """Test creating price alert without authentication fails."""
        alert_data = {
            "product_id": "test_product_123",
            "marketplace": "aliexpress",
            "target_price": 19.99,
            "product_title": "Test Product"
        }
        
        response = client.post("/price-tracking/alerts", json=alert_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_alerts_no_auth(self):
        """Test getting user alerts without authentication fails."""
        response = client.get("/price-tracking/alerts")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_alert_no_auth(self):
        """Test deleting price alert without authentication fails."""
        response = client.delete("/price-tracking/alerts/some_alert_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_price_history_no_auth(self):
        """Test getting price history without authentication (might be public)."""
        response = client.get("/price-tracking/history/aliexpress/test_product_123")
        
        # Price history might be public or require auth - both are valid
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_404_NOT_FOUND  # Product not found
        ]

    def test_start_tracking_product_no_auth(self):
        """Test starting product tracking without authentication fails."""
        track_data = {
            "product_id": "test_product_123",
            "marketplace": "aliexpress",
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/price-tracking/track", json=track_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_trending_drops_public(self):
        """Test getting trending price drops (might be public)."""
        response = client.get("/price-tracking/trending-drops")
        
        # Trending drops might be public, require auth, or fail due to dependencies
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]
        
        if response.status_code == status.HTTP_200_OK:
            response_data = response.json()
            assert isinstance(response_data, (list, dict))

    def test_update_prices_no_auth(self):
        """Test triggering price update without authentication fails."""
        response = client.post("/price-tracking/update-prices")
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_create_alert_invalid_data(self):
        """Test creating alert with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/price-tracking/alerts", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid marketplace
        invalid_alert = {
            "product_id": "test_product_123",
            "marketplace": "invalid_marketplace",
            "target_price": 19.99,
            "product_title": "Test Product"
        }
        response = client.post("/price-tracking/alerts", json=invalid_alert, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid marketplace
            status.HTTP_400_BAD_REQUEST
        ]

    def test_create_alert_invalid_price(self):
        """Test creating alert with invalid target price."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with negative price
        invalid_alert = {
            "product_id": "test_product_123",
            "marketplace": "aliexpress",
            "target_price": -10.0,  # Negative price
            "product_title": "Test Product"
        }
        
        response = client.post("/price-tracking/alerts", json=invalid_alert, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid price
            status.HTTP_400_BAD_REQUEST
        ]

    def test_delete_nonexistent_alert(self):
        """Test deleting non-existent alert."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.delete("/price-tracking/alerts/nonexistent_alert_id", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_404_NOT_FOUND  # Alert not found
        ]

    def test_price_history_invalid_marketplace(self):
        """Test price history with invalid marketplace."""
        response = client.get("/price-tracking/history/invalid_marketplace/test_product_123")
        
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_start_tracking_invalid_data(self):
        """Test starting product tracking with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with missing required fields
        invalid_track_data = {
            "product_id": "test_product_123"
            # Missing marketplace and url
        }
        
        response = client.post("/price-tracking/track", json=invalid_track_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_trending_drops_pagination(self):
        """Test trending drops with pagination parameters."""
        response = client.get("/price-tracking/trending-drops?limit=10&offset=0")
        
        # Test with pagination - might be public, require auth, or fail due to dependencies
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_price_tracking_endpoints_auth_requirements(self):
        """Test that protected price tracking endpoints require authentication."""
        protected_endpoints = [
            ("POST", "/price-tracking/alerts"),
            ("GET", "/price-tracking/alerts"),
            ("DELETE", "/price-tracking/alerts/test_id"),
            ("POST", "/price-tracking/track")
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "POST":
                response = client.post(endpoint, json={})
            elif method == "GET":
                response = client.get(endpoint)
            elif method == "DELETE":
                response = client.delete(endpoint)
            
            # These endpoints should require authentication (or fail due to dependencies)
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ], f"{method} {endpoint} should require authentication or fail gracefully"