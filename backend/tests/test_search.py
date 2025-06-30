import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestSearchEndpoints:
    """Test suite for search endpoints."""

    def test_search_products_basic(self):
        """Test basic product search functionality."""
        response = client.get("/search/?q=test")
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        
        # Check response structure
        assert "query" in response_data
        assert response_data["query"] == "test"
        assert "results" in response_data
        assert isinstance(response_data["results"], list)
        
        # Check pagination if present
        if "pagination" in response_data:
            pagination = response_data["pagination"]
            assert "current_page" in pagination
            assert "page_size" in pagination
            assert "total_items" in pagination

    def test_search_products_empty_query(self):
        """Test search with empty query."""
        response = client.get("/search/?q=")
        
        # Empty query might be rejected with validation error
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]
        
        if response.status_code == status.HTTP_200_OK:
            response_data = response.json()
            assert "query" in response_data
            assert "results" in response_data
            assert isinstance(response_data["results"], list)

    def test_search_products_missing_query(self):
        """Test search without query parameter."""
        response = client.get("/search/")
        
        # Should either work with default query or return validation error
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_search_products_with_pagination(self):
        """Test search with pagination parameters."""
        response = client.get("/search/?q=laptop&page=1&size=10")
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        
        assert "query" in response_data
        assert response_data["query"] == "laptop"
        assert "results" in response_data
        assert isinstance(response_data["results"], list)

    def test_search_products_invalid_pagination(self):
        """Test search with invalid pagination parameters."""
        # Test with negative page
        response = client.get("/search/?q=test&page=-1")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]
        
        # Test with zero page
        response = client.get("/search/?q=test&page=0")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]
        
        # Test with invalid size
        response = client.get("/search/?q=test&size=0")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_search_product_detail_invalid_marketplace(self):
        """Test product detail with invalid marketplace."""
        response = client.get("/search/detail/invalid_marketplace/product123")
        
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_search_product_detail_missing_product_id(self):
        """Test product detail with missing product ID."""
        response = client.get("/search/detail/aliexpress/")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_search_product_detail_valid_marketplace(self):
        """Test product detail with valid marketplace but non-existent product."""
        response = client.get("/search/detail/aliexpress/nonexistent_product_123")
        
        # Can return various status codes depending on external service availability
        assert response.status_code in [
            status.HTTP_200_OK,  # Might return empty/null result
            status.HTTP_404_NOT_FOUND,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_503_SERVICE_UNAVAILABLE  # External service unavailable
        ]

    def test_search_special_characters(self):
        """Test search with special characters and encoded strings."""
        # Test with URL-encoded query
        response = client.get("/search/?q=smartphone%20case")
        assert response.status_code == status.HTTP_200_OK
        
        # Test with special characters
        response = client.get("/search/?q=test+product")
        assert response.status_code == status.HTTP_200_OK

    def test_search_long_query(self):
        """Test search with very long query string."""
        long_query = "a" * 500  # 500 character query
        response = client.get(f"/search/?q={long_query}")
        
        # Should either handle gracefully or return appropriate error
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_search_with_sorting(self):
        """Test search with sorting parameters if supported."""
        response = client.get("/search/?q=phone&sort=price_low")
        
        # Should either work or ignore unsupported parameters
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "results" in response_data

    def test_search_concurrent_requests(self):
        """Test that multiple search requests work properly."""
        queries = ["laptop", "phone", "tablet"]
        
        for query in queries:
            response = client.get(f"/search/?q={query}")
            assert response.status_code == status.HTTP_200_OK
            response_data = response.json()
            assert response_data["query"] == query