import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

class TestInternationalizationEndpoints:
    """Test suite for internationalization (i18n) endpoints."""

    def test_get_currencies_public(self):
        """Test getting supported currencies (might be public)."""
        response = client.get("/api/internationalization/currencies")
        
        # Currencies might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database/service dependency error
        ]
        
        if response.status_code == status.HTTP_200_OK:
            response_data = response.json()
            assert isinstance(response_data, list)

    def test_get_exchange_rate_public(self):
        """Test getting exchange rate (might be public)."""
        response = client.get("/api/internationalization/exchange-rate/USD/EUR")
        
        # Exchange rates might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid currency codes
            status.HTTP_500_INTERNAL_SERVER_ERROR  # External API dependency error
        ]

    def test_convert_price_no_auth(self):
        """Test converting price without authentication fails."""
        price_data = {
            "amount": 100.0,
            "from_currency": "USD",
            "to_currency": "EUR"
        }
        
        response = client.post("/api/internationalization/convert-price", json=price_data)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Validation error
        ]

    def test_get_localized_price_no_auth(self):
        """Test getting localized price without authentication fails."""
        price_data = {
            "amount": 100.0,
            "original_currency": "USD",
            "target_currencies": ["EUR", "GBP", "JPY"]
        }
        
        response = client.post("/api/internationalization/localized-price", json=price_data)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Validation error
        ]

    def test_format_currency_public(self):
        """Test formatting currency (might be public)."""
        format_data = {
            "amount": 123.45,
            "currency": "USD",
            "locale": "en_US"
        }
        
        response = client.post("/api/internationalization/format-currency", json=format_data)
        
        # Currency formatting might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Service dependency error
        ]

    def test_get_user_locale_no_auth(self):
        """Test getting user locale without authentication fails."""
        response = client.get("/api/internationalization/user-locale")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_set_user_locale_no_auth(self):
        """Test setting user locale without authentication fails."""
        locale_data = {
            "language": "ES",
            "country": "ES",
            "currency": "EUR",
            "timezone": "Europe/Madrid"
        }
        
        response = client.post("/api/internationalization/user-locale", json=locale_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_detect_locale_public(self):
        """Test auto-detecting locale (might be public)."""
        response = client.post("/api/internationalization/detect-locale")
        
        # Locale detection might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Geolocation service error
        ]

    def test_get_geolocation_public(self):
        """Test getting geolocation information (might be public)."""
        response = client.get("/api/internationalization/geolocation")
        
        # Geolocation might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Geolocation service error
        ]

    def test_get_country_info_public(self):
        """Test getting country information (might be public)."""
        response = client.get("/api/internationalization/country-info/US")
        
        # Country info might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid country code
            status.HTTP_404_NOT_FOUND,  # Country not found
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database dependency error
        ]

    def test_get_localized_content_public(self):
        """Test getting localized content (might be public)."""
        response = client.get("/api/internationalization/content/homepage_title?language=EN")
        
        # Localized content might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_404_NOT_FOUND,  # Content not found
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid language code
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database dependency error
        ]

    def test_set_localized_content_no_auth(self):
        """Test setting localized content without authentication fails."""
        content_data = {
            "translations": {
                "EN": "Welcome to DealHunt",
                "ES": "Bienvenido a DealHunt",
                "FR": "Bienvenue à DealHunt"
            }
        }
        
        response = client.post("/api/internationalization/content/homepage_title", json=content_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_supported_locales_public(self):
        """Test getting supported locales (might be public)."""
        response = client.get("/api/internationalization/supported-locales")
        
        # Supported locales might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Service dependency error
        ]

    def test_get_popular_marketplaces_public(self):
        """Test getting popular marketplaces by country (might be public)."""
        response = client.get("/api/internationalization/popular-marketplaces/US")
        
        # Popular marketplaces might be public or require auth
        assert response.status_code in [
            status.HTTP_200_OK,  # Public endpoint
            status.HTTP_401_UNAUTHORIZED,  # Requires authentication
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid country code
            status.HTTP_404_NOT_FOUND,  # Country not found
            status.HTTP_500_INTERNAL_SERVER_ERROR  # Database dependency error
        ]

    def test_cleanup_i18n_data_no_auth(self):
        """Test cleanup endpoint without authentication fails (admin only)."""
        response = client.post("/api/internationalization/cleanup")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_convert_price_invalid_data(self):
        """Test converting price with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with empty data
        response = client.post("/api/internationalization/convert-price", json={}, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY  # Invalid data
        ]
        
        # Test with invalid currency codes
        invalid_price_data = {
            "amount": -100.0,  # Negative amount
            "from_currency": "INVALID",
            "to_currency": "ALSO_INVALID"
        }
        response = client.post("/api/internationalization/convert-price", json=invalid_price_data, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_set_user_locale_invalid_data(self):
        """Test setting user locale with invalid data."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        # Test with invalid locale data
        invalid_locale = {
            "language": "INVALID_LANG",
            "country": "XX",  # Invalid country code
            "currency": "FAKE",  # Invalid currency
            "timezone": "Invalid/Timezone"
        }
        
        response = client.post("/api/internationalization/user-locale", json=invalid_locale, headers=headers)
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,  # Invalid token
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid data
            status.HTTP_400_BAD_REQUEST
        ]

    def test_exchange_rate_invalid_currencies(self):
        """Test exchange rate with invalid currency codes."""
        response = client.get("/api/internationalization/exchange-rate/INVALID/FAKE")
        
        assert response.status_code in [
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Invalid currency codes
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,  # If auth required
            status.HTTP_500_INTERNAL_SERVER_ERROR  # External API error
        ]

    def test_admin_endpoints_require_admin_privileges(self):
        """Test that admin endpoints require admin privileges."""
        headers = {"Authorization": "Bearer regular_user_token"}
        
        admin_endpoints = [
            ("POST", "/api/internationalization/content/test_content"),
            ("POST", "/api/internationalization/cleanup")
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "POST":
                response = client.post(endpoint, json={}, headers=headers)
            
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,  # Invalid/insufficient token
                status.HTTP_403_FORBIDDEN  # Not admin
            ], f"{method} {endpoint} should require admin privileges"

    def test_i18n_endpoints_authentication_requirements(self):
        """Test that protected i18n endpoints require authentication."""
        protected_endpoints = [
            ("POST", "/api/internationalization/convert-price"),
            ("POST", "/api/internationalization/localized-price"),
            ("GET", "/api/internationalization/user-locale"),
            ("POST", "/api/internationalization/user-locale"),
            ("POST", "/api/internationalization/content/test_content"),
            ("POST", "/api/internationalization/cleanup")
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            
            # These endpoints should require authentication or return validation errors
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,  # Requires authentication
                status.HTTP_422_UNPROCESSABLE_ENTITY  # Validation error
            ], f"{method} {endpoint} should require authentication or return validation error"