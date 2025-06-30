import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestEnhancedWishlistEndpoints:
    """Test suite for enhanced wishlist operations with multiple wishlists, sharing, and bulk operations."""

    def test_create_wishlist_no_auth(self):
        """Test creating a new wishlist without authentication fails."""
        wishlist_data = {
            "name": "My Wishlist",
            "description": "Test wishlist",
            "category": "electronics",
            "is_public": False
        }
        
        response = client.post("/enhanced-wishlist/", json=wishlist_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_all_wishlists_no_auth(self):
        """Test getting all wishlists without authentication fails."""
        response = client.get("/enhanced-wishlist/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_specific_wishlist_no_auth(self):
        """Test getting specific wishlist without authentication fails."""
        response = client.get("/enhanced-wishlist/test_wishlist_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_wishlist_no_auth(self):
        """Test updating wishlist without authentication fails."""
        update_data = {
            "name": "Updated Wishlist",
            "description": "Updated description"
        }
        
        response = client.put("/enhanced-wishlist/test_wishlist_id", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_wishlist_no_auth(self):
        """Test deleting wishlist without authentication fails."""
        response = client.delete("/enhanced-wishlist/test_wishlist_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_add_product_to_wishlist_no_auth(self):
        """Test adding product to wishlist without authentication fails."""
        product_data = {
            "product_id": "test_product_123",
            "marketplace": "aliexpress",
            "product_url": "https://example.com/product"
        }
        
        response = client.post("/enhanced-wishlist/test_wishlist_id/products", json=product_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_remove_product_from_wishlist_no_auth(self):
        """Test removing product from wishlist without authentication fails."""
        response = client.delete("/enhanced-wishlist/test_wishlist_id/products/test_product_123")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_share_wishlist_no_auth(self):
        """Test sharing wishlist without authentication fails."""
        share_data = {
            "user_email": "user@example.com",
            "permission": "view"
        }
        
        response = client.post("/enhanced-wishlist/test_wishlist_id/share", json=share_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_public_share_link_no_auth(self):
        """Test creating public share link without authentication fails."""
        response = client.post("/enhanced-wishlist/test_wishlist_id/share/public")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


    def test_get_wishlist_analytics_no_auth(self):
        """Test getting wishlist analytics without authentication fails."""
        response = client.get("/enhanced-wishlist/analytics/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bulk_add_products_no_auth(self):
        """Test bulk adding products without authentication fails."""
        bulk_data = {
            "products": [
                {
                    "product_id": "product1",
                    "marketplace": "aliexpress",
                    "product_url": "https://example.com/product1"
                },
                {
                    "product_id": "product2",
                    "marketplace": "ebay",
                    "product_url": "https://example.com/product2"
                }
            ]
        }
        
        response = client.post("/enhanced-wishlist/test_wishlist_id/bulk/add", json=bulk_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bulk_remove_products_no_auth(self):
        """Test bulk removing products without authentication fails."""
        bulk_data = {
            "product_ids": ["product1", "product2", "product3"]
        }
        
        response = client.post("/enhanced-wishlist/test_wishlist_id/bulk/remove", json=bulk_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bulk_move_products_no_auth(self):
        """Test bulk moving products without authentication fails."""
        move_data = {
            "product_ids": ["product1", "product2"],
            "target_wishlist_id": "target_wishlist_123"
        }
        
        response = client.post("/enhanced-wishlist/test_wishlist_id/bulk/move", json=move_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bulk_update_products_no_auth(self):
        """Test bulk updating products without authentication fails."""
        update_data = {
            "product_ids": ["product1", "product2"],
            "updates": {
                "priority": "high",
                "notes": "Updated via bulk operation"
            }
        }
        
        response = client.post("/enhanced-wishlist/test_wishlist_id/bulk/update", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bulk_copy_products_no_auth(self):
        """Test bulk copying products without authentication fails."""
        copy_data = {
            "product_ids": ["product1", "product2"],
            "target_wishlist_id": "target_wishlist_123"
        }
        
        response = client.post("/enhanced-wishlist/test_wishlist_id/bulk/copy", json=copy_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_bulk_operation_status_no_auth(self):
        """Test getting bulk operation status without authentication fails."""
        response = client.get("/enhanced-wishlist/bulk/status/test_operation_id")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_wishlist_invalid_data(self):
        """Test creating wishlist with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/enhanced-wishlist/", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid category
        invalid_wishlist = {
            "name": "Test Wishlist",
            "category": "invalid_category",
            "is_public": "not_boolean"  # Invalid boolean
        }
        response = client.post("/enhanced-wishlist/", json=invalid_wishlist, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_share_wishlist_invalid_data(self):
        """Test sharing wishlist with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid email
        invalid_share_data = {
            "user_email": "not_an_email",
            "permission": "invalid_permission"
        }
        
        response = client.post("/enhanced-wishlist/test_id/share", json=invalid_share_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_bulk_operations_invalid_data(self):
        """Test bulk operations with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test bulk add with empty products list
        response = client.post("/enhanced-wishlist/test_id/bulk/add", json={"products": []}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]
        
        # Test bulk remove with invalid product_ids
        response = client.post("/enhanced-wishlist/test_id/bulk/remove", json={"product_ids": "not_a_list"}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]

    def test_enhanced_wishlist_endpoints_require_authentication(self):
        """Test that all enhanced wishlist endpoints require authentication."""
        protected_endpoints = [
            ("POST", "/enhanced-wishlist/"),
            ("GET", "/enhanced-wishlist/"),
            ("GET", "/enhanced-wishlist/test_id"),
            ("PUT", "/enhanced-wishlist/test_id"),
            ("DELETE", "/enhanced-wishlist/test_id"),
            ("POST", "/enhanced-wishlist/test_id/products"),
            ("DELETE", "/enhanced-wishlist/test_id/products/product_id"),
            ("POST", "/enhanced-wishlist/test_id/share"),
            ("POST", "/enhanced-wishlist/test_id/share/public"),
            ("GET", "/enhanced-wishlist/analytics/me"),
            ("POST", "/enhanced-wishlist/test_id/bulk/add"),
            ("POST", "/enhanced-wishlist/test_id/bulk/remove"),
            ("POST", "/enhanced-wishlist/test_id/bulk/move"),
            ("POST", "/enhanced-wishlist/test_id/bulk/update"),
            ("POST", "/enhanced-wishlist/test_id/bulk/copy"),
            ("GET", "/enhanced-wishlist/bulk/status/test_op_id")
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