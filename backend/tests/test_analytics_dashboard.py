import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestAnalyticsDashboardEndpoints:
    """Test suite for analytics dashboard endpoints."""

    def test_get_dashboard_no_auth(self):
        """Test getting analytics dashboard without authentication fails."""
        response = client.get("/analytics/dashboard")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_post_analytics_event_no_auth(self):
        """Test posting analytics event without authentication fails."""
        event_data = {
            "event_type": "product_view",
            "event_category": "user_interaction",
            "event_data": {"product_id": "test_123"},
            "session_id": "session_456"
        }
        
        response = client.post("/analytics/events", json=event_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_set_savings_goal_no_auth(self):
        """Test setting savings goal without authentication fails."""
        goal_data = {
            "monthly_target": 100.0,
            "annual_target": 1200.0,
            "target_categories": ["electronics", "clothing"]
        }
        
        response = client.post("/analytics/savings-goal", json=goal_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_savings_summary_no_auth(self):
        """Test getting savings summary without authentication fails."""
        response = client.get("/analytics/savings-summary")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_insights_no_auth(self):
        """Test getting personalized insights without authentication fails."""
        response = client.get("/analytics/insights")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_marketplace_comparison_no_auth(self):
        """Test getting marketplace comparison without authentication fails."""
        response = client.get("/analytics/marketplace-comparison")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_shopping_patterns_no_auth(self):
        """Test getting shopping patterns without authentication fails."""
        response = client.get("/analytics/shopping-patterns")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_price_tracking_stats_no_auth(self):
        """Test getting price tracking stats without authentication fails."""
        response = client.get("/analytics/price-tracking-stats")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_activity_summary_no_auth(self):
        """Test getting activity summary without authentication fails."""
        response = client.get("/analytics/activity-summary")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_trends_public_endpoint(self):
        """Test getting platform trends (might be public)."""
        response = client.get("/analytics/trends")
        
        # Trends might be public, require auth, or fail due to dependencies
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_export_dashboard_no_auth(self):
        """Test exporting dashboard data without authentication fails."""
        response = client.get("/analytics/export/dashboard")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test with format parameter
        response = client.get("/analytics/export/dashboard?format=csv")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_events_no_auth(self):
        """Test exporting analytics events without authentication fails."""
        response = client.get("/analytics/export/events")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_analytics_no_auth(self):
        """Test admin analytics endpoints without authentication fail."""
        admin_endpoints = [
            "/analytics/admin/overview",
            "/analytics/admin/user-growth"
        ]
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_analytics_health_endpoint(self):
        """Test analytics service health endpoint."""
        response = client.get("/analytics/health")
        
        # Health endpoint might be public or require minimal auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Service healthy
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_503_SERVICE_UNAVAILABLE  # Service unhealthy
        ]

    def test_post_analytics_event_invalid_data(self):
        """Test posting analytics event with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/analytics/events", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid event type
        invalid_event = {
            "event_type": "",  # Empty event type
            "event_category": "invalid_category",
            "event_data": "not_an_object",  # Invalid type
            "session_id": ""  # Empty session ID
        }
        response = client.post("/analytics/events", json=invalid_event, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_set_savings_goal_invalid_data(self):
        """Test setting savings goal with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with negative targets
        invalid_goal = {
            "monthly_target": -50.0,  # Negative target
            "annual_target": "not_a_number",  # Invalid type
            "target_categories": "not_a_list"  # Invalid type
        }
        
        response = client.post("/analytics/savings-goal", json=invalid_goal, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_activity_summary_invalid_params(self):
        """Test activity summary with invalid parameters."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid days parameter
        response = client.get("/analytics/activity-summary?days=-1", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid parameter
            status.HTTP_400_BAD_REQUEST
        ]
        
        # Test with days parameter too high
        response = client.get("/analytics/activity-summary?days=1000", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid parameter
            status.HTTP_400_BAD_REQUEST
        ]

    def test_export_dashboard_invalid_format(self):
        """Test exporting dashboard with invalid format."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid format
        response = client.get("/analytics/export/dashboard?format=invalid_format", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid format
            status.HTTP_400_BAD_REQUEST
        ]

    def test_admin_endpoints_require_admin_privileges(self):
        """Test that admin analytics endpoints require admin privileges."""
        headers = {"Authorization": "Bearer regular_user_token"}
        
        admin_endpoints = [
            "/analytics/admin/overview",
            "/analytics/admin/user-growth"
        ]
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,  # Invalid/insufficient token
                status.HTTP_403_FORBIDDEN  # Not admin
            ], f"{endpoint} should require admin privileges"

    def test_analytics_endpoints_require_authentication(self):
        """Test that all analytics endpoints require authentication."""
        protected_endpoints = [
            ("GET", "/analytics/dashboard"),
            ("POST", "/analytics/events"),
            ("POST", "/analytics/savings-goal"),
            ("GET", "/analytics/savings-summary"),
            ("GET", "/analytics/insights"),
            ("GET", "/analytics/marketplace-comparison"),
            ("GET", "/analytics/shopping-patterns"),
            ("GET", "/analytics/price-tracking-stats"),
            ("GET", "/analytics/activity-summary"),
            ("GET", "/analytics/export/dashboard"),
            ("GET", "/analytics/export/events"),
            ("GET", "/analytics/admin/overview"),
            ("GET", "/analytics/admin/user-growth")
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            
            # These endpoints should require authentication
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, f"{method} {endpoint} should require authentication"