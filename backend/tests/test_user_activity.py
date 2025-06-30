import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestUserActivityEndpoints:
    """Test suite for user activity tracking endpoints."""

    def test_track_product_view_no_auth(self):
        """Test tracking product view without authentication fails."""
        view_data = {
            "product_id": "test_product_123",
            "marketplace": "aliexpress",
            "title": "Test Product",
            "price": 29.99,
            "image_url": "https://example.com/image.jpg",
            "product_url": "https://example.com/product",
            "view_duration": 15
        }
        
        response = client.post("/activity/track/product-view", json=view_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_track_search_activity_no_auth(self):
        """Test tracking search activity without authentication fails."""
        search_data = {
            "query": "smartphone case",
            "results_count": 25,
            "filters_used": ["price_low", "rating_high"],
            "clicked_products": ["product_123", "product_456"]
        }
        
        response = client.post("/activity/track/search", json=search_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_recently_viewed_no_auth(self):
        """Test getting recently viewed products without authentication fails."""
        response = client.get("/activity/recently-viewed")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_search_suggestions_no_auth(self):
        """Test getting search suggestions without authentication fails."""
        response = client.get("/activity/search-suggestions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_preferences_no_auth(self):
        """Test getting user preferences without authentication fails."""
        response = client.get("/activity/preferences")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_user_preferences_no_auth(self):
        """Test updating user preferences without authentication fails."""
        preferences_data = {
            "sort_order": "price_low",
            "view_mode": "grid",
            "deal_alerts": True,
            "email_frequency": "daily"
        }
        
        response = client.put("/activity/preferences", json=preferences_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_activity_recommendations_no_auth(self):
        """Test getting activity-based recommendations without authentication fails."""
        response = client.get("/activity/recommendations")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_activity_analytics_no_auth(self):
        """Test getting activity analytics without authentication fails."""
        response = client.get("/activity/analytics")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_track_product_view_invalid_data(self):
        """Test tracking product view with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/activity/track/product-view", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid marketplace
        invalid_view_data = {
            "product_id": "test_product_123",
            "marketplace": "invalid_marketplace",
            "title": "Test Product",
            "price": -10.0,  # Invalid negative price
            "view_duration": "not_a_number"  # Invalid type
        }
        response = client.post("/activity/track/product-view", json=invalid_view_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_track_search_invalid_data(self):
        """Test tracking search activity with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid results count
        invalid_search_data = {
            "query": "",  # Empty query
            "results_count": -5,  # Invalid negative count
            "filters_used": "not_a_list",  # Invalid type
            "clicked_products": ["invalid_product_id"]
        }
        
        response = client.post("/activity/track/search", json=invalid_search_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_recently_viewed_with_invalid_params(self):
        """Test recently viewed products with invalid parameters."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid limit
        response = client.get("/activity/recently-viewed?limit=-1", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid parameter
            status.HTTP_400_BAD_REQUEST
        ]
        
        # Test with limit too high
        response = client.get("/activity/recently-viewed?limit=1000", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid parameter
            status.HTTP_400_BAD_REQUEST
        ]

    def test_update_preferences_invalid_data(self):
        """Test updating preferences with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid enum values
        invalid_preferences = {
            "sort_order": "invalid_sort",
            "view_mode": "invalid_mode",
            "deal_alerts": "not_boolean",
            "email_frequency": "invalid_frequency"
        }
        
        response = client.put("/activity/preferences", json=invalid_preferences, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_activity_cleanup_admin_endpoint(self):
        """Test activity cleanup endpoint (admin only)."""
        # Test without authentication
        response = client.delete("/activity/cleanup")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test with regular user token (should fail even with valid token)
        headers = {"Authorization": "Bearer regular_user_token"}
        response = client.delete("/activity/cleanup", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid/insufficient token
            status.HTTP_403_FORBIDDEN  # Not admin
        ]

    def test_activity_endpoints_require_authentication(self):
        """Test that all activity endpoints require authentication."""
        protected_endpoints = [
            ("POST", "/activity/track/product-view"),
            ("POST", "/activity/track/search"),
            ("GET", "/activity/recently-viewed"),
            ("GET", "/activity/search-suggestions"),
            ("GET", "/activity/preferences"),
            ("PUT", "/activity/preferences"),
            ("GET", "/activity/recommendations"),
            ("GET", "/activity/analytics"),
            ("DELETE", "/activity/cleanup")
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            elif method == "PUT":
                response = client.put(endpoint, json={})
            elif method == "DELETE":
                response = client.delete(endpoint)
            
            # These endpoints should require authentication
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, f"{method} {endpoint} should require authentication"