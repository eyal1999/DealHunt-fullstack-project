import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestAuthenticationEndpoints:
    """Simple test suite for authentication endpoints."""

    def test_user_registration_invalid_email(self):
        """Test registration with invalid email fails."""
        user_data = {
            "email": "invalid-email",
            "full_name": "Test User",
            "password": "password123"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_current_user_no_token(self):
        """Test getting current user without token fails."""
        response = client.get("/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token fails."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


    def test_upload_profile_picture_no_token(self):
        """Test profile picture upload without token fails."""
        test_image_content = b"fake_image_content"
        files = {"file": ("test.jpg", test_image_content, "image/jpeg")}
        
        response = client.post("/auth/upload-profile-picture", files=files)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_forgot_password_invalid_email_format(self):
        """Test forgot password with invalid email format."""
        request_data = {"email": "invalid-email-format"}
        
        response = client.post("/auth/forgot-password", json=request_data)
        
        # Should return validation error for invalid email format
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_notification_preferences_no_token(self):
        """Test updating notification preferences without token fails."""
        preferences_data = {
            "email_notifications": False,
            "price_drop_notifications": True
        }
        
        response = client.put("/auth/notification-preferences", json=preferences_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED