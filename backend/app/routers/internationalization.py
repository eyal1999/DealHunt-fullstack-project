"""
Internationalization and multi-currency API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Dict, Optional
from datetime import datetime

from app.auth.jwt import get_current_user
from app.db import db
from app.services.internationalization_service import InternationalizationService
from app.models.internationalization import (
    CurrencyCode, LanguageCode, CountryCode, UserLocale, LocalizedPrice,
    CurrencyInfo, ExchangeRate, GeolocationInfo
)
from app.models.db_models import User

router = APIRouter(prefix="/api/internationalization", tags=["internationalization"])


async def get_i18n_service():
    """Dependency to get internationalization service."""
    return InternationalizationService(db)


@router.get("/currencies", response_model=List[CurrencyInfo])
async def get_supported_currencies(
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get list of supported currencies."""
    return await i18n_service.get_supported_currencies()


@router.get("/exchange-rate/{from_currency}/{to_currency}", response_model=float)
async def get_exchange_rate(
    from_currency: CurrencyCode,
    to_currency: CurrencyCode,
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get current exchange rate between two currencies."""
    try:
        rate = await i18n_service.get_exchange_rate(from_currency, to_currency)
        return rate
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get exchange rate: {str(e)}")


@router.post("/convert-price", response_model=float)
async def convert_price(
    amount: float,
    from_currency: CurrencyCode,
    to_currency: CurrencyCode,
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Convert price between currencies."""
    if amount < 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    try:
        converted_amount = await i18n_service.convert_price(amount, from_currency, to_currency)
        return converted_amount
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to convert price: {str(e)}")


@router.post("/localized-price", response_model=LocalizedPrice)
async def get_localized_price(
    amount: float,
    original_currency: CurrencyCode,
    target_currencies: List[CurrencyCode],
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get price converted to multiple currencies."""
    if amount < 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if not target_currencies:
        raise HTTPException(status_code=400, detail="At least one target currency required")
    
    try:
        localized_price = await i18n_service.get_localized_price(
            amount, original_currency, target_currencies
        )
        return localized_price
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get localized price: {str(e)}")


@router.post("/format-currency")
async def format_currency(
    amount: float,
    currency: CurrencyCode,
    locale: str = "en-US",
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Format currency amount according to locale rules."""
    try:
        formatted = i18n_service.format_currency(amount, currency, locale)
        return {"formatted": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to format currency: {str(e)}")


@router.get("/user-locale", response_model=Optional[UserLocale])
async def get_user_locale(
    current_user: User = Depends(get_current_user),
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get current user's locale preferences."""
    try:
        locale = await i18n_service.get_user_locale(str(current_user.id))
        return locale
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user locale: {str(e)}")


@router.post("/user-locale")
async def set_user_locale(
    locale_data: dict,
    current_user: User = Depends(get_current_user),
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Set user's locale preferences."""
    try:
        # Create UserLocale object from dict
        locale = UserLocale(
            user_id=str(current_user.id),
            country=CountryCode(locale_data.get("country", "US")),
            language=LanguageCode(locale_data.get("language", "en")),
            currency=CurrencyCode(locale_data.get("currency", "USD")),
            timezone=locale_data.get("timezone", "UTC"),
            date_format=locale_data.get("date_format", "MM/DD/YYYY"),
            time_format=locale_data.get("time_format", "12h"),
            number_format=locale_data.get("number_format", "en-US"),
            auto_detect=locale_data.get("auto_detect", True),
            measurement_system=locale_data.get("measurement_system", "imperial"),
            first_day_of_week=locale_data.get("first_day_of_week", 0),
            preferred_marketplaces=locale_data.get("preferred_marketplaces", []),
            exclude_international_shipping=locale_data.get("exclude_international_shipping", False),
            max_shipping_cost=locale_data.get("max_shipping_cost")
        )
        
        success = await i18n_service.set_user_locale(str(current_user.id), locale)
        if success:
            return {"message": "Locale preferences updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update locale preferences")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid locale data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set user locale: {str(e)}")


@router.post("/detect-locale", response_model=UserLocale)
async def detect_user_locale(
    request: Request,
    user_agent: Optional[str] = None,
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Auto-detect user locale from IP address and user agent."""
    try:
        # Get client IP address
        ip_address = request.client.host
        
        # Use provided user agent or get from headers
        if not user_agent:
            user_agent = request.headers.get("User-Agent", "")
        
        detected_locale = await i18n_service.detect_user_locale(ip_address, user_agent)
        return detected_locale
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect locale: {str(e)}")


@router.get("/geolocation", response_model=Optional[GeolocationInfo])
async def get_user_geolocation(
    request: Request,
    ip: Optional[str] = Query(None, description="Override IP address for testing"),
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get geolocation information for user's IP address."""
    try:
        # Use provided IP or get from request
        ip_address = ip or request.client.host
        
        geolocation = await i18n_service.get_geolocation(ip_address)
        return geolocation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get geolocation: {str(e)}")


@router.get("/country-info/{country_code}")
async def get_country_info(
    country_code: CountryCode,
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get detailed information about a specific country."""
    try:
        country_info = await i18n_service.get_country_info(country_code)
        return country_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get country info: {str(e)}")


@router.get("/content/{content_id}")
async def get_localized_content(
    content_id: str,
    language: LanguageCode = Query(LanguageCode.EN, description="Preferred language"),
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get localized content for specific language."""
    try:
        content = await i18n_service.get_localized_content(content_id, language)
        if content is None:
            raise HTTPException(status_code=404, detail="Content not found")
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get localized content: {str(e)}")


@router.post("/content/{content_id}")
async def set_localized_content(
    content_id: str,
    content_data: dict,
    current_user: User = Depends(get_current_user),
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Set localized content translations (admin only)."""
    # **MANUAL IMPLEMENTATION NEEDED**: Add admin role check
    # For now, allow any authenticated user
    
    try:
        content_type = content_data.get("content_type", "text")
        translations = content_data.get("translations", {})
        
        if not translations:
            raise HTTPException(status_code=400, detail="Translations required")
        
        success = await i18n_service.set_localized_content(content_id, content_type, translations)
        if success:
            return {"message": "Localized content updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update localized content")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set localized content: {str(e)}")


@router.post("/cleanup")
async def cleanup_old_data(
    current_user: User = Depends(get_current_user),
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Clean up old cached internationalization data (admin only)."""
    # **MANUAL IMPLEMENTATION NEEDED**: Add admin role check
    # For now, allow any authenticated user
    
    try:
        await i18n_service.cleanup_old_data()
        return {"message": "Old internationalization data cleaned up successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup data: {str(e)}")


# Utility endpoints for frontend
@router.get("/supported-locales")
async def get_supported_locales():
    """Get list of supported locales for frontend."""
    return {
        "currencies": [{"code": c.value, "name": c.value} for c in CurrencyCode],
        "languages": [{"code": l.value, "name": l.value} for l in LanguageCode],
        "countries": [{"code": c.value, "name": c.value} for c in CountryCode]
    }


@router.get("/popular-marketplaces/{country_code}")
async def get_popular_marketplaces(
    country_code: CountryCode,
    i18n_service: InternationalizationService = Depends(get_i18n_service)
):
    """Get popular marketplaces for a specific country."""
    try:
        country_info = await i18n_service.get_country_info(country_code)
        return {
            "marketplaces": country_info.get("popular_marketplaces", ["amazon", "ebay"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get popular marketplaces: {str(e)}")