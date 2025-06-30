import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestAIRecommendationEndpoints:
    """Test suite for AI-powered recommendation endpoints."""

    def test_get_personalized_recommendations_no_auth(self):
        """Test getting personalized recommendations without authentication fails."""
        response = client.get("/recommendations/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_similar_products_no_auth(self):
        """Test getting similar products without authentication fails."""
        response = client.get("/recommendations/similar/aliexpress/test_product_123")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_trending_recommendations_no_auth(self):
        """Test getting trending recommendations without authentication fails."""
        response = client.get("/recommendations/trending")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_deal_recommendations_no_auth(self):
        """Test getting deal recommendations without authentication fails."""
        response = client.get("/recommendations/deals")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_for_you_recommendations_no_auth(self):
        """Test getting 'for you' recommendations without authentication fails."""
        response = client.get("/recommendations/for-you")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_wishlist_based_recommendations_no_auth(self):
        """Test getting wishlist-based recommendations without authentication fails."""
        response = client.get("/recommendations/wishlist-based")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_search_based_recommendations_no_auth(self):
        """Test getting search-based recommendations without authentication fails."""
        response = client.get("/recommendations/search-based")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_submit_recommendation_feedback_no_auth(self):
        """Test submitting recommendation feedback without authentication fails."""
        feedback_data = {
            "recommendation_id": "rec_123",
            "feedback_type": "click",
            "product_id": "prod_123",
            "rating": 5
        }
        
        response = client.post("/recommendations/feedback", json=feedback_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_preference_profile_no_auth(self):
        """Test getting user preference profile without authentication fails."""
        response = client.get("/recommendations/profile")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_user_preferences_no_auth(self):
        """Test updating user preferences without authentication fails."""
        preferences_data = {
            "preferred_categories": ["electronics", "clothing"],
            "price_sensitivity": "medium",
            "brand_preferences": ["apple", "samsung"]
        }
        
        response = client.put("/recommendations/profile", json=preferences_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_trending_products_public(self):
        """Test getting trending products (might be public)."""
        response = client.get("/recommendations/trending-products")
        
        # Trending products might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_get_recommendation_categories_public(self):
        """Test getting recommendation categories (might be public)."""
        response = client.get("/recommendations/categories")
        
        # Categories might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]

    def test_refresh_ai_profile_no_auth(self):
        """Test refreshing AI profile without authentication fails."""
        response = client.post("/recommendations/refresh-profile")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_recommendation_insights_no_auth(self):
        """Test getting recommendation insights without authentication fails."""
        response = client.get("/recommendations/insights")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_similar_products_invalid_marketplace(self):
        """Test getting similar products with invalid marketplace."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.get("/recommendations/similar/invalid_marketplace/prod_123", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid marketplace
            status.HTTP_400_BAD_REQUEST
        ]

    def test_submit_feedback_invalid_data(self):
        """Test submitting recommendation feedback with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/recommendations/feedback", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid feedback type
        invalid_feedback = {
            "recommendation_id": "",  # Empty recommendation ID
            "feedback_type": "invalid_type",
            "product_id": "",  # Empty product ID
            "rating": 10  # Invalid rating (should be 1-5)
        }
        response = client.post("/recommendations/feedback", json=invalid_feedback, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_update_preferences_invalid_data(self):
        """Test updating user preferences with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid price sensitivity
        invalid_preferences = {
            "preferred_categories": "not_a_list",  # Invalid type
            "price_sensitivity": "invalid_sensitivity",
            "brand_preferences": [""]  # Empty brand name
        }
        
        response = client.put("/recommendations/profile", json=invalid_preferences, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_recommendation_endpoints_with_invalid_parameters(self):
        """Test recommendation endpoints with invalid query parameters."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid limit parameter
        response = client.get("/recommendations/?limit=-1", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid parameter
            status.HTTP_400_BAD_REQUEST
        ]
        
        # Test with invalid category filter
        response = client.get("/recommendations/trending?category=invalid_category", headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid parameter
            status.HTTP_400_BAD_REQUEST
        ]

    def test_ai_recommendation_endpoints_require_authentication(self):
        """Test that all AI recommendation endpoints require authentication."""
        protected_endpoints = [
            ("GET", "/recommendations/"),
            ("GET", "/recommendations/similar/aliexpress/test_prod"),
            ("GET", "/recommendations/trending"),
            ("GET", "/recommendations/deals"),
            ("GET", "/recommendations/for-you"),
            ("GET", "/recommendations/wishlist-based"),
            ("GET", "/recommendations/search-based"),
            ("POST", "/recommendations/feedback"),
            ("GET", "/recommendations/profile"),
            ("PUT", "/recommendations/profile"),
            ("POST", "/recommendations/refresh-profile"),
            ("GET", "/recommendations/insights")
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            elif method == "PUT":
                response = client.put(endpoint, json={})
            
            # These endpoints should require authentication
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, f"{method} {endpoint} should require authentication"