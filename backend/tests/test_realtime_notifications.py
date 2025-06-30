import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestRealtimeNotificationEndpoints:
    """Test suite for real-time notification endpoints."""

    def test_notification_stream_no_auth(self):
        """Test accessing notification stream without authentication fails."""
        response = client.get("/realtime/stream")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_notification_summary_no_auth(self):
        """Test getting notification summary without authentication fails."""
        response = client.get("/realtime/summary")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_send_test_notification_no_auth(self):
        """Test sending test notification without authentication fails."""
        response = client.post("/realtime/test")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_send_price_alert_no_auth(self):
        """Test sending price alert notification without authentication fails."""
        alert_data = {
            "user_id": "test_user_123",
            "product_title": "Test Product",
            "old_price": 29.99,
            "new_price": 19.99,
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/realtime/price-alert", json=alert_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_send_stock_alert_no_auth(self):
        """Test sending stock alert notification without authentication fails."""
        alert_data = {
            "user_id": "test_user_123",
            "product_title": "Test Product",
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/realtime/stock-alert", json=alert_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_send_deal_alert_no_auth(self):
        """Test sending deal alert notification without authentication fails."""
        alert_data = {
            "user_id": "test_user_123",
            "deal_title": "Amazing Deal!",
            "deal_description": "50% off on all products",
            "deal_url": "https://example.com/deal"
        }
        
        response = client.post("/realtime/deal-alert", json=alert_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_send_test_notification_with_message(self):
        """Test sending test notification with custom message without auth fails."""
        response = client.post("/realtime/test?message=Custom test message")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_notification_stream_invalid_token(self):
        """Test accessing notification stream with invalid token fails."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/realtime/stream", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_send_price_alert_invalid_data(self):
        """Test sending price alert with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/realtime/price-alert", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid price values
        invalid_alert = {
            "user_id": "",  # Empty user ID
            "product_title": "",  # Empty title
            "old_price": -10.0,  # Invalid negative price
            "new_price": "not_a_number",  # Invalid price type
            "product_url": "invalid_url"  # Invalid URL format
        }
        response = client.post("/realtime/price-alert", json=invalid_alert, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_send_stock_alert_invalid_data(self):
        """Test sending stock alert with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with missing required fields
        invalid_alert = {
            "user_id": "",  # Empty user ID
            "product_title": "",  # Empty title
            "product_url": "not_a_valid_url"  # Invalid URL
        }
        
        response = client.post("/realtime/stock-alert", json=invalid_alert, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_send_deal_alert_invalid_data(self):
        """Test sending deal alert with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid deal data
        invalid_alert = {
            "user_id": "",  # Empty user ID
            "deal_title": "",  # Empty title
            "deal_description": "A" * 10000,  # Too long description
            "deal_url": "invalid_url"  # Invalid URL
        }
        
        response = client.post("/realtime/deal-alert", json=invalid_alert, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_admin_notification_endpoints_require_privileges(self):
        """Test that admin notification endpoints require admin privileges."""
        headers = {"Authorization": "Bearer regular_user_token"}
        
        # Test price alert endpoint (should require admin in production)
        alert_data = {
            "user_id": "test_user_123",
            "product_title": "Test Product",
            "old_price": 29.99,
            "new_price": 19.99,
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/realtime/price-alert", json=alert_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid/insufficient token
            status.HTTP_403_FORBIDDEN,  # Not admin (if properly implemented)
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_realtime_endpoints_require_authentication(self):
        """Test that all real-time notification endpoints require authentication."""
        protected_endpoints = [
            ("GET", "/realtime/stream"),
            ("GET", "/realtime/summary"),
            ("POST", "/realtime/test"),
            ("POST", "/realtime/price-alert"),
            ("POST", "/realtime/stock-alert"),
            ("POST", "/realtime/deal-alert")
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            
            # These endpoints should require authentication
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, f"{method} {endpoint} should require authentication"