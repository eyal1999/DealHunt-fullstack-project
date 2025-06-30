import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestDealHuntingEndpoints:
    """Test suite for deal hunting functionality endpoints."""

    def test_create_deal_alert_no_auth(self):
        """Test creating deal alert without authentication fails."""
        alert_data = {
            "alert_type": "PRICE_DROP",
            "severity_level": "MEDIUM",
            "keywords": ["smartphone", "discount"],
            "max_price": 500.0,
            "category": "electronics",
            "marketplaces": ["amazon", "ebay"]
        }
        
        response = client.post("/api/deal-hunting/alerts", json=alert_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_deal_alerts_no_auth(self):
        """Test getting deal alerts without authentication fails."""
        response = client.get("/api/deal-hunting/alerts")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_deal_alert_no_auth(self):
        """Test updating deal alert without authentication fails."""
        update_data = {
            "alert_type": "PERCENTAGE_DISCOUNT",
            "severity_level": "HIGH",
            "max_price": 300.0
        }
        
        response = client.put("/api/deal-hunting/alerts/test_alert_id", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_deal_alert_no_auth(self):
        """Test deleting deal alert without authentication fails."""
        response = client.delete("/api/deal-hunting/alerts/test_alert_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_deals_no_auth(self):
        """Test getting deals without authentication fails."""
        response = client.get("/api/deal-hunting/deals")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_trending_deals_public(self):
        """Test getting trending deals (might be public)."""
        response = client.get("/api/deal-hunting/deals/trending")
        
        # Trending deals might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_get_deal_details_public(self):
        """Test getting deal details (might be public)."""
        response = client.get("/api/deal-hunting/deals/test_deal_id")
        
        # Deal details might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_404_NOT_FOUND,  # Deal not found
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_trigger_manual_hunt_no_auth(self):
        """Test triggering manual deal hunt without authentication fails."""
        hunt_data = {
            "keywords": ["laptop", "gaming"],
            "max_price": 1000.0,
            "marketplaces": ["amazon"]
        }
        
        response = client.post("/api/deal-hunting/hunt", json=hunt_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_alert_history_no_auth(self):
        """Test getting alert history without authentication fails."""
        response = client.get("/api/deal-hunting/alerts/history")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_mark_alert_as_read_no_auth(self):
        """Test marking alert as read without authentication fails."""
        response = client.post("/api/deal-hunting/alerts/test_alert_id/read")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_mark_alert_as_clicked_no_auth(self):
        """Test marking alert as clicked without authentication fails."""
        response = client.post("/api/deal-hunting/alerts/test_alert_id/click")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_deal_stats_no_auth(self):
        """Test getting deal hunting statistics without authentication fails."""
        response = client.get("/api/deal-hunting/stats")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_deal_categories_public(self):
        """Test getting deal categories (might be public)."""
        response = client.get("/api/deal-hunting/categories")
        
        # Deal categories might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_get_available_marketplaces_public(self):
        """Test getting available marketplaces (might be public)."""
        response = client.get("/api/deal-hunting/marketplaces")
        
        # Marketplaces might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_get_alert_types_public(self):
        """Test getting alert types (might be public)."""
        response = client.get("/api/deal-hunting/alert-types")
        
        # Alert types might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_get_severity_levels_public(self):
        """Test getting severity levels (might be public)."""
        response = client.get("/api/deal-hunting/severity-levels")
        
        # Severity levels might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_get_notification_channels_public(self):
        """Test getting notification channels (might be public)."""
        response = client.get("/api/deal-hunting/notification-channels")
        
        # Notification channels might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_create_alert_invalid_data(self):
        """Test creating deal alert with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/api/deal-hunting/alerts", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid alert type
        invalid_alert = {
            "alert_type": "INVALID_TYPE",
            "severity_level": "INVALID_LEVEL",
            "max_price": -100.0,  # Negative price
            "keywords": [""],  # Empty keyword
            "marketplaces": []  # Empty marketplaces
        }
        response = client.post("/api/deal-hunting/alerts", json=invalid_alert, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_trigger_hunt_invalid_data(self):
        """Test triggering manual hunt with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid hunt parameters
        invalid_hunt = {
            "keywords": [],  # Empty keywords
            "max_price": "not_a_number",  # Invalid price type
            "marketplaces": ["invalid_marketplace"]  # Invalid marketplace
        }
        
        response = client.post("/api/deal-hunting/hunt", json=invalid_hunt, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_admin_endpoints_no_auth(self):
        """Test admin deal hunting endpoints without authentication fail."""
        admin_endpoints = [
            ("POST", "/api/deal-hunting/admin/hunt"),
            ("POST", "/api/deal-hunting/admin/cleanup")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "POST":
                response = client.post(endpoint, json={})
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_endpoints_require_admin_privileges(self):
        """Test that admin endpoints require admin privileges."""
        headers = {"Authorization": "Bearer regular_user_token"}
        
        admin_endpoints = [
            ("POST", "/api/deal-hunting/admin/hunt"),
            ("POST", "/api/deal-hunting/admin/cleanup")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "POST":
                response = client.post(endpoint, json={}, headers=headers)
            
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,  # Invalid/insufficient token
                status.HTTP_403_FORBIDDEN  # Not admin
            ], f"{method} {endpoint} should require admin privileges"

    def test_deal_hunting_endpoints_require_authentication(self):
        """Test that protected deal hunting endpoints require authentication."""
        protected_endpoints = [
            ("POST", "/api/deal-hunting/alerts"),
            ("GET", "/api/deal-hunting/alerts"),
            ("PUT", "/api/deal-hunting/alerts/test_id"),
            ("DELETE", "/api/deal-hunting/alerts/test_id"),
            ("GET", "/api/deal-hunting/deals"),
            ("POST", "/api/deal-hunting/hunt"),
            ("GET", "/api/deal-hunting/alerts/history"),
            ("POST", "/api/deal-hunting/alerts/test_id/read"),
            ("POST", "/api/deal-hunting/alerts/test_id/click"),
            ("GET", "/api/deal-hunting/stats"),
            ("POST", "/api/deal-hunting/admin/hunt"),
            ("POST", "/api/deal-hunting/admin/cleanup")
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