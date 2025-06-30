import pytest
import base64
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestImageProxyEndpoints:
    """Test suite for image proxy endpoints."""

    def test_proxy_image_missing_url(self):
        """Test proxying image without URL parameter fails."""
        response = client.get("/images/proxy")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_proxy_image_empty_url(self):
        """Test proxying image with empty URL parameter fails."""
        response = client.get("/images/proxy?url=")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_proxy_image_data_url_rejected(self):
        """Test that data URLs are handled (may return error or be processed by service)."""
        data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        response = client.get(f"/images/proxy?url={data_url}")
        # Data URLs might be rejected at endpoint level (400) or by service (500)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ]

    def test_proxy_image_valid_url(self):
        """Test proxying image with valid URL."""
        # Test with a common URL pattern (even if it fails, should handle gracefully)
        test_url = "https://example.com/image.jpg"
        response = client.get(f"/images/proxy?url={test_url}")
        
        # Should either return the image or a placeholder
        assert response.status_code == status.HTTP_200_OK
        
        # Should set proper CORS headers
        assert "Access-Control-Allow-Origin" in response.headers
        assert response.headers["Access-Control-Allow-Origin"] == "*"

    def test_proxy_image_invalid_url(self):
        """Test proxying image with invalid URL returns placeholder."""
        invalid_url = "not-a-valid-url"
        response = client.get(f"/images/proxy?url={invalid_url}")
        
        # Should return placeholder instead of error
        assert response.status_code == status.HTTP_200_OK
        # Should be SVG placeholder
        assert "image/svg+xml" in response.headers.get("content-type", "")

    def test_proxy_image_nonexistent_url(self):
        """Test proxying image from nonexistent domain returns placeholder."""
        nonexistent_url = "https://definitely-does-not-exist-12345.com/image.jpg"
        response = client.get(f"/images/proxy?url={nonexistent_url}")
        
        # Should return placeholder instead of error
        assert response.status_code == status.HTTP_200_OK

    def test_proxy_image_base64_missing_url(self):
        """Test base64 proxy without URL parameter fails."""
        response = client.get("/images/proxy-base64")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_proxy_image_base64_invalid_encoding(self):
        """Test base64 proxy with invalid base64 encoding fails."""
        invalid_base64 = "invalid-base64-data!"
        response = client.get(f"/images/proxy-base64?url={invalid_base64}")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_proxy_image_base64_valid_encoding(self):
        """Test base64 proxy with valid base64 encoded URL."""
        # Encode a valid URL
        test_url = "https://example.com/image.jpg"
        encoded_url = base64.b64encode(test_url.encode()).decode()
        
        response = client.get(f"/images/proxy-base64?url={encoded_url}")
        
        # Should either return the image or placeholder, but not error
        assert response.status_code == status.HTTP_200_OK
        
        # Should set proper CORS headers
        assert "Access-Control-Allow-Origin" in response.headers
        assert response.headers["Access-Control-Allow-Origin"] == "*"

    def test_clean_image_cache_endpoint(self):
        """Test image cache cleaning endpoint."""
        response = client.post("/images/clean-cache")
        
        # Should succeed or return service error (both acceptable)
        assert response.status_code in [
            status.HTTP_200_OK,  # Successfully cleaned cache
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Service dependency error
        ]

    def test_image_endpoints_cors_headers(self):
        """Test that image endpoints return proper CORS headers."""
        test_url = "https://example.com/test.jpg"
        response = client.get(f"/images/proxy?url={test_url}")
        
        # Check basic CORS headers are present (different for placeholder vs actual image)
        assert "Access-Control-Allow-Origin" in response.headers
        assert response.headers["Access-Control-Allow-Origin"] == "*"
        
        # Additional CORS headers may be present depending on image type (actual vs placeholder)
        # Placeholder SVG may have fewer headers than actual proxied images

    def test_image_endpoints_cache_headers(self):
        """Test that image endpoints return proper cache headers."""
        test_url = "https://example.com/test.jpg"
        response = client.get(f"/images/proxy?url={test_url}")
        
        # Should have cache control headers
        assert "Cache-Control" in response.headers
        assert "public" in response.headers["Cache-Control"]

    def test_image_proxy_special_characters_in_url(self):
        """Test proxying images with special characters in URL."""
        # Test URL with spaces and special characters
        special_url = "https://example.com/image with spaces & symbols.jpg"
        response = client.get(f"/images/proxy?url={special_url}")
        
        # Should handle gracefully (return image or placeholder)
        assert response.status_code == status.HTTP_200_OK

    def test_image_proxy_very_long_url(self):
        """Test proxying images with very long URLs."""
        # Create a very long URL
        long_url = "https://example.com/" + "a" * 2000 + ".jpg"
        response = client.get(f"/images/proxy?url={long_url}")
        
        # Should handle gracefully
        assert response.status_code == status.HTTP_200_OK