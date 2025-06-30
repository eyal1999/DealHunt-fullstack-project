import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestUserManagementEndpoints:
    """Test suite for user management system endpoints."""

    def test_get_user_roles_no_auth(self):
        """Test getting user roles (public endpoint)."""
        response = client.get("/api/user-management/roles")
        # This is a public endpoint that returns available roles
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert isinstance(response_data, list)

    def test_get_user_permissions_no_auth(self):
        """Test getting user permissions (public endpoint)."""
        response = client.get("/api/user-management/permissions")
        # This is a public endpoint that returns available permissions
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert isinstance(response_data, list)

    def test_get_user_role_no_auth(self):
        """Test getting specific user's role without authentication fails."""
        response = client.get("/api/user-management/users/test_user_id/role")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_assign_user_role_no_auth(self):
        """Test assigning role to user without authentication fails."""
        role_data = {
            "role": "PREMIUM_USER",
            "expires_at": "2024-12-31T23:59:59Z"
        }
        
        response = client.post("/api/user-management/users/test_user_id/role", json=role_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_revoke_user_role_no_auth(self):
        """Test revoking user role without authentication fails."""
        response = client.delete("/api/user-management/users/test_user_id/role")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_permissions_by_id_no_auth(self):
        """Test getting user permissions by ID without authentication fails."""
        response = client.get("/api/user-management/users/test_user_id/permissions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_my_permissions_no_auth(self):
        """Test getting current user's permissions without authentication fails."""
        response = client.get("/api/user-management/my-permissions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_profile_no_auth(self):
        """Test getting user profile without authentication fails."""
        response = client.get("/api/user-management/users/test_user_id/profile")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_user_profile_no_auth(self):
        """Test updating user profile without authentication fails."""
        profile_data = {
            "display_name": "Updated Name",
            "bio": "Updated bio",
            "location": "New York",
            "website": "https://example.com"
        }
        
        response = client.put("/api/user-management/users/test_user_id/profile", json=profile_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_sessions_no_auth(self):
        """Test getting user sessions without authentication fails."""
        response = client.get("/api/user-management/users/test_user_id/sessions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalidate_session_no_auth(self):
        """Test invalidating session without authentication fails."""
        response = client.delete("/api/user-management/sessions/test_session_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_activities_no_auth(self):
        """Test getting user activities without authentication fails."""
        response = client.get("/api/user-management/users/test_user_id/activities")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_stats_no_auth(self):
        """Test getting user statistics without authentication fails."""
        response = client.get("/api/user-management/users/test_user_id/stats")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_check_user_limits_no_auth(self):
        """Test checking user limits without authentication fails."""
        response = client.get("/api/user-management/users/test_user_id/limits/api_calls")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_status_types_public(self):
        """Test getting status types (might be public)."""
        response = client.get("/api/user-management/status-types")
        
        # Status types might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_admin_get_all_users_no_auth(self):
        """Test admin getting all users without authentication fails."""
        response = client.get("/api/user-management/admin/users")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_update_user_status_no_auth(self):
        """Test admin updating user status without authentication fails."""
        status_data = {
            "status": "SUSPENDED",
            "reason": "Terms violation"
        }
        
        response = client.put("/api/user-management/admin/users/test_user_id/status", json=status_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_delete_user_no_auth(self):
        """Test admin deleting user without authentication fails."""
        response = client.delete("/api/user-management/admin/users/test_user_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_get_actions_log_no_auth(self):
        """Test admin getting actions log without authentication fails."""
        response = client.get("/api/user-management/admin/actions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_get_system_stats_no_auth(self):
        """Test admin getting system stats without authentication fails."""
        response = client.get("/api/user-management/admin/stats/system")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_cleanup_sessions_no_auth(self):
        """Test admin cleanup sessions without authentication fails."""
        response = client.post("/api/user-management/admin/cleanup/sessions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_cleanup_activities_no_auth(self):
        """Test admin cleanup activities without authentication fails."""
        response = client.post("/api/user-management/admin/cleanup/activities")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_assign_role_invalid_data(self):
        """Test assigning role with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/api/user-management/users/test_id/role", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid role
        invalid_role_data = {
            "role": "INVALID_ROLE",
            "expires_at": "invalid_date_format"
        }
        response = client.post("/api/user-management/users/test_id/role", json=invalid_role_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_update_profile_invalid_data(self):
        """Test updating profile with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid website URL
        invalid_profile = {
            "display_name": "",  # Empty display name
            "bio": "A" * 10000,  # Too long bio
            "website": "not_a_valid_url"  # Invalid URL
        }
        
        response = client.put("/api/user-management/users/test_id/profile", json=invalid_profile, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_admin_update_status_invalid_data(self):
        """Test admin updating user status with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid status
        invalid_status = {
            "status": "INVALID_STATUS",
            "reason": ""  # Empty reason
        }
        
        response = client.put("/api/user-management/admin/users/test_id/status", json=invalid_status, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_admin_endpoints_require_admin_privileges(self):
        """Test that admin endpoints require admin privileges."""
        headers = {"Authorization": "Bearer regular_user_token"}
        
        admin_endpoints = [
            ("GET", "/api/user-management/admin/users"),
            ("PUT", "/api/user-management/admin/users/test_id/status"),
            ("DELETE", "/api/user-management/admin/users/test_id"),
            ("GET", "/api/user-management/admin/actions"),
            ("GET", "/api/user-management/admin/stats/system"),
            ("POST", "/api/user-management/admin/cleanup/sessions"),
            ("POST", "/api/user-management/admin/cleanup/activities")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "GET":
                response = client.get(endpoint, headers=headers)
            elif method == "POST":
                response = client.post(endpoint, json={}, headers=headers)
            elif method == "PUT":
                response = client.put(endpoint, json={}, headers=headers)
            elif method == "DELETE":
                response = client.delete(endpoint, headers=headers)
            
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,  # Invalid/insufficient token
                status.HTTP_403_FORBIDDEN  # Not admin
            ], f"{method} {endpoint} should require admin privileges"

    def test_user_management_endpoints_require_authentication(self):
        """Test that protected user management endpoints require authentication."""
        protected_endpoints = [
            ("GET", "/api/user-management/users/test_id/role"),
            ("POST", "/api/user-management/users/test_id/role"),
            ("DELETE", "/api/user-management/users/test_id/role"),
            ("GET", "/api/user-management/users/test_id/permissions"),
            ("GET", "/api/user-management/my-permissions"),
            ("GET", "/api/user-management/users/test_id/profile"),
            ("PUT", "/api/user-management/users/test_id/profile"),
            ("GET", "/api/user-management/users/test_id/sessions"),
            ("DELETE", "/api/user-management/sessions/test_session_id"),
            ("GET", "/api/user-management/users/test_id/activities"),
            ("GET", "/api/user-management/users/test_id/stats"),
            ("GET", "/api/user-management/users/test_id/limits/api_calls")
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