import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestSocialFeaturesEndpoints:
    """Test suite for social features focusing on authentication requirements."""

    def test_create_review_no_auth(self):
        """Test creating a product review without authentication fails."""
        review_data = {
            "marketplace": "aliexpress",
            "product_id": "test_product_123",
            "rating": 5,
            "title": "Great product!",
            "content": "This product is amazing and works perfectly."
        }
        
        response = client.post("/social/reviews", json=review_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_vote_on_review_no_auth(self):
        """Test voting on review without authentication fails."""
        vote_data = {"vote_type": "helpful"}
        
        response = client.post("/social/reviews/test_review_id/vote", json=vote_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reply_to_review_no_auth(self):
        """Test replying to review without authentication fails."""
        reply_data = {"content": "Thank you for the detailed review!"}
        
        response = client.post("/social/reviews/test_review_id/reply", json=reply_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_follow_user_no_auth(self):
        """Test following a user without authentication fails."""
        response = client.post("/social/follow/test_user_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unfollow_user_no_auth(self):
        """Test unfollowing a user without authentication fails."""
        response = client.delete("/social/follow/test_user_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_my_profile_no_auth(self):
        """Test updating current user's profile without authentication fails."""
        profile_data = {
            "display_name": "Updated Name",
            "bio": "Updated bio"
        }
        
        response = client.put("/social/profile/me", json=profile_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_share_content_no_auth(self):
        """Test sharing content without authentication fails."""
        share_data = {
            "content_type": "product",
            "content_id": "test_product_123",
            "platform": "facebook"
        }
        
        response = client.post("/social/share", json=share_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_notifications_no_auth(self):
        """Test getting notifications without authentication fails."""
        response = client.get("/social/notifications")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_mark_notification_read_no_auth(self):
        """Test marking notification as read without authentication fails."""
        response = client.put("/social/notifications/test_notification_id/read")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_mark_all_notifications_read_no_auth(self):
        """Test marking all notifications as read without authentication fails."""
        response = client.put("/social/notifications/read-all")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_activity_feed_no_auth(self):
        """Test getting activity feed without authentication fails."""
        response = client.get("/social/feed")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_social_stats_no_auth(self):
        """Test getting social statistics without authentication fails."""
        response = client.get("/social/stats/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_review_invalid_data(self):
        """Test creating review with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/social/reviews", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_vote_on_review_invalid_data(self):
        """Test voting on review with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        invalid_vote = {"vote_type": "invalid_vote_type"}
        
        response = client.post("/social/reviews/test_id/vote", json=invalid_vote, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_share_content_invalid_data(self):
        """Test sharing content with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        invalid_share = {
            "content_type": "invalid_type",
            "platform": "invalid_platform"
        }
        
        response = client.post("/social/share", json=invalid_share, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_admin_review_moderation_no_auth(self):
        """Test admin review moderation endpoints without authentication fail."""
        admin_endpoints = [
            ("GET", "/social/admin/reviews/pending"),
            ("PUT", "/social/admin/reviews/test_id/approve"),
            ("PUT", "/social/admin/reviews/test_id/reject")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "PUT":
                response = client.put(endpoint, json={})
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_endpoints_require_admin_privileges(self):
        """Test that admin endpoints require admin privileges."""
        headers = {"Authorization": "Bearer regular_user_token"}
        
        admin_endpoints = [
            ("GET", "/social/admin/reviews/pending"),
            ("PUT", "/social/admin/reviews/test_id/approve"),
            ("PUT", "/social/admin/reviews/test_id/reject")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "GET":
                response = client.get(endpoint, headers=headers)
            elif method == "PUT":
                response = client.put(endpoint, json={}, headers=headers)
            
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,  # Invalid/insufficient token
                status.HTTP_403_FORBIDDEN  # Not admin
            ]

    def test_social_endpoints_require_authentication(self):
        """Test that protected social endpoints require authentication."""
        protected_endpoints = [
            ("POST", "/social/reviews"),
            ("POST", "/social/reviews/test_id/vote"),
            ("POST", "/social/reviews/test_id/reply"),
            ("POST", "/social/follow/test_user_id"),
            ("DELETE", "/social/follow/test_user_id"),
            ("PUT", "/social/profile/me"),
            ("POST", "/social/share"),
            ("GET", "/social/notifications"),
            ("PUT", "/social/notifications/test_id/read"),
            ("PUT", "/social/notifications/read-all"),
            ("GET", "/social/feed"),
            ("GET", "/social/stats/me")
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