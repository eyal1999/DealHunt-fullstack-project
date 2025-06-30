import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestGoogleAuthenticationEndpoints:
    """Test suite for Google authentication endpoints."""

    def test_google_signin_missing_token(self):
        """Test Google signin without token fails."""
        response = client.post("/auth/google/signin", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_google_signin_invalid_token(self):
        """Test Google signin with invalid token fails."""
        signin_data = {"token": "invalid_google_token"}
        
        response = client.post("/auth/google/signin", json=signin_data)
        
        # Should fail due to invalid token (validation or Google verification will fail)
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_google_register_missing_token(self):
        """Test Google registration without token fails."""
        response = client.post("/auth/google/register", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_google_register_invalid_token(self):
        """Test Google registration with invalid token fails."""
        register_data = {"token": "invalid_google_token"}
        
        response = client.post("/auth/google/register", json=register_data)
        
        # Should fail due to invalid token (validation or Google verification will fail)
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_google_config_endpoint(self):
        """Test Google OAuth config endpoint returns configuration."""
        response = client.get("/auth/google/config")
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        
        # Should contain google_client_id for frontend to use
        assert "google_client_id" in response_data
        assert isinstance(response_data["google_client_id"], str)
        assert "configured" in response_data
        assert isinstance(response_data["configured"], bool)

    def test_google_link_no_token(self):
        """Test linking Google account without authentication token fails."""
        link_data = {"google_token": "some_google_token"}
        
        response = client.post("/auth/google/link", json=link_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_google_unlink_no_token(self):
        """Test unlinking Google account without authentication token fails."""
        response = client.delete("/auth/google/unlink")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_google_link_missing_google_token(self):
        """Test linking Google account without Google token fails."""
        # Using invalid auth header
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.post("/auth/google/link", json={}, headers=headers)
        
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid auth token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Missing google_token
        ]

    def test_google_endpoints_require_valid_data(self):
        """Test that Google endpoints validate request data properly."""
        # Test signin with empty string token
        response = client.post("/auth/google/signin", json={"token": ""})
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]
        
        # Test register with empty string token
        response = client.post("/auth/google/register", json={"token": ""})
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]