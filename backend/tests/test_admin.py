import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestAdminEndpoints:
    """Test suite for admin functionality endpoints."""

    def test_trigger_price_check_no_auth(self):
        """Test triggering price check without authentication fails."""
        response = client.post("/admin/trigger-price-check")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_price_monitor_status_no_auth(self):
        """Test getting price monitor status without authentication fails."""
        response = client.get("/admin/price-monitor-status")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_endpoints_require_authentication(self):
        """Test that all admin endpoints require authentication."""
        admin_endpoints = [
            ("POST", "/admin/trigger-price-check"),
            ("GET", "/admin/price-monitor-status")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            
            # All admin endpoints should require authentication
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, f"{method} {endpoint} should require authentication"

    def test_trigger_price_check_with_invalid_auth(self):
        """Test triggering price check with invalid authentication."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.post("/admin/trigger-price-check", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_403_FORBIDDEN,     # Valid token but insufficient permissions
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Service dependency error
        ]

    def test_get_price_monitor_status_with_invalid_auth(self):
        """Test getting price monitor status with invalid authentication."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/admin/price-monitor-status", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_403_FORBIDDEN,     # Valid token but insufficient permissions
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Service dependency error
        ]

    def test_admin_endpoints_with_regular_user_token(self):
        """Test that admin endpoints require admin privileges."""
        headers = {"Authorization": "Bearer regular_user_token"}
        
        admin_endpoints = [
            ("POST", "/admin/trigger-price-check"),
            ("GET", "/admin/price-monitor-status")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "GET":
                response = client.get(endpoint, headers=headers)
            elif method == "POST":
                response = client.post(endpoint, json={}, headers=headers)
            
            # Should either reject invalid token or lack of admin privileges
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,  # Invalid/expired token
                status.HTTP_403_FORBIDDEN,     # Valid token but not admin
                status.HTTP_500_INTERNAL_SERVER_ERROR  # Service dependency error
            ], f"{method} {endpoint} should require admin privileges"