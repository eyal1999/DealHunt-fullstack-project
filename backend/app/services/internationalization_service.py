"""
Internationalization service for multi-currency and locale support.
"""
import asyncio
import logging
import aiohttp
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.internationalization import (
    CurrencyCode, LanguageCode, CountryCode, CurrencyInfo, ExchangeRate,
    LocalizedPrice, UserLocale, LocalizedContent, GeolocationInfo,
    ExchangeRateDocument, UserLocaleDocument, LocalizedContentDocument
)

logger = logging.getLogger(__name__)


class InternationalizationService:
    """Service for managing internationalization and localization."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.exchange_rates_collection = database.exchange_rates
        self.user_locales_collection = database.user_locales
        self.localized_content_collection = database.localized_content
        self.geolocation_cache_collection = database.geolocation_cache
        
        # Currency information database
        self.currencies = self._initialize_currencies()
        
        # Exchange rate cache (in-memory for fast access)
        self.rate_cache = {}
        self.cache_expiry = {}
        
        # Geolocation API configuration
        self.geolocation_apis = [
            "http://ip-api.com/json/",  # Free tier: 1000 requests/month
            "https://ipapi.co/{ip}/json/",  # Free tier: 1000 requests/day
        ]
    
    def _initialize_currencies(self) -> Dict[str, CurrencyInfo]:
        """Initialize currency information database."""
        return {
            "USD": CurrencyInfo(
                code=CurrencyCode.USD, name="US Dollar", symbol="$",
                decimal_places=2, symbol_position="before"
            ),
            "EUR": CurrencyInfo(
                code=CurrencyCode.EUR, name="Euro", symbol="€",
                decimal_places=2, symbol_position="before"
            ),
            "GBP": CurrencyInfo(
                code=CurrencyCode.GBP, name="British Pound", symbol="£",
                decimal_places=2, symbol_position="before"
            ),
            "JPY": CurrencyInfo(
                code=CurrencyCode.JPY, name="Japanese Yen", symbol="¥",
                decimal_places=0, symbol_position="before"
            ),
            "CAD": CurrencyInfo(
                code=CurrencyCode.CAD, name="Canadian Dollar", symbol="C$",
                decimal_places=2, symbol_position="before"
            ),
            "AUD": CurrencyInfo(
                code=CurrencyCode.AUD, name="Australian Dollar", symbol="A$",
                decimal_places=2, symbol_position="before"
            ),
            "CNY": CurrencyInfo(
                code=CurrencyCode.CNY, name="Chinese Yuan", symbol="¥",
                decimal_places=2, symbol_position="before"
            ),
            "INR": CurrencyInfo(
                code=CurrencyCode.INR, name="Indian Rupee", symbol="₹",
                decimal_places=2, symbol_position="before"
            ),
            "BRL": CurrencyInfo(
                code=CurrencyCode.BRL, name="Brazilian Real", symbol="R$",
                decimal_places=2, symbol_position="before"
            ),
            "MXN": CurrencyInfo(
                code=CurrencyCode.MXN, name="Mexican Peso", symbol="$",
                decimal_places=2, symbol_position="before"
            ),
            "KRW": CurrencyInfo(
                code=CurrencyCode.KRW, name="South Korean Won", symbol="₩",
                decimal_places=0, symbol_position="before"
            ),
            "SGD": CurrencyInfo(
                code=CurrencyCode.SGD, name="Singapore Dollar", symbol="S$",
                decimal_places=2, symbol_position="before"
            )
        }
    
    # Currency Exchange
    async def get_exchange_rate(self, from_currency: CurrencyCode, to_currency: CurrencyCode) -> float:
        """Get exchange rate between two currencies."""
        if from_currency == to_currency:
            return 1.0
        
        cache_key = f"{from_currency}_{to_currency}"
        
        # Check cache first
        if cache_key in self.rate_cache:
            if datetime.now() < self.cache_expiry.get(cache_key, datetime.min):
                return self.rate_cache[cache_key]
        
        # Check database
        rate_doc = await self.exchange_rates_collection.find_one({
            "from_currency": from_currency.value,
            "to_currency": to_currency.value
        })
        
        if rate_doc and rate_doc["updated_at"] > datetime.now() - timedelta(hours=1):
            rate = rate_doc["rate"]
            self._cache_rate(cache_key, rate)
            return rate
        
        # Fetch from external API
        try:
            rate = await self._fetch_exchange_rate(from_currency, to_currency)
            await self._store_exchange_rate(from_currency, to_currency, rate)
            self._cache_rate(cache_key, rate)
            return rate
        except Exception as e:
            logger.error(f"Failed to fetch exchange rate {from_currency}->{to_currency}: {e}")
            
            # Return cached rate if available, even if expired
            if cache_key in self.rate_cache:
                return self.rate_cache[cache_key]
            
            return 1.0  # Fallback rate
    
    async def _fetch_exchange_rate(self, from_currency: CurrencyCode, to_currency: CurrencyCode) -> float:
        """Fetch exchange rate from external API."""
        # **MANUAL IMPLEMENTATION NEEDED**: Add your preferred exchange rate API
        # Options: exchangerate-api.com, fixer.io, currencylayer.com
        
        # Mock implementation for now
        mock_rates = {
            ("USD", "EUR"): 0.85,
            ("USD", "GBP"): 0.73,
            ("USD", "JPY"): 110.0,
            ("USD", "CAD"): 1.25,
            ("USD", "AUD"): 1.35,
            ("EUR", "USD"): 1.18,
            ("GBP", "USD"): 1.37,
        }
        
        rate_key = (from_currency.value, to_currency.value)
        if rate_key in mock_rates:
            return mock_rates[rate_key]
        
        # Calculate inverse rate
        inverse_key = (to_currency.value, from_currency.value)
        if inverse_key in mock_rates:
            return 1.0 / mock_rates[inverse_key]
        
        # Default rate
        return 1.0
    
    def _cache_rate(self, cache_key: str, rate: float):
        """Cache exchange rate in memory."""
        self.rate_cache[cache_key] = rate
        self.cache_expiry[cache_key] = datetime.now() + timedelta(hours=1)
    
    async def _store_exchange_rate(self, from_currency: CurrencyCode, to_currency: CurrencyCode, rate: float):
        """Store exchange rate in database."""
        exchange_rate = ExchangeRateDocument(
            from_currency=from_currency.value,
            to_currency=to_currency.value,
            rate=rate,
            updated_at=datetime.now(),
            source="api"
        )
        
        await self.exchange_rates_collection.update_one(
            {
                "from_currency": from_currency.value,
                "to_currency": to_currency.value
            },
            {"$set": exchange_rate.model_dump()},
            upsert=True
        )
    
    async def convert_price(self, amount: float, from_currency: CurrencyCode, to_currency: CurrencyCode) -> float:
        """Convert price between currencies."""
        if from_currency == to_currency:
            return amount
        
        rate = await self.get_exchange_rate(from_currency, to_currency)
        return amount * rate
    
    async def get_localized_price(self, amount: float, original_currency: CurrencyCode, target_currencies: List[CurrencyCode]) -> LocalizedPrice:
        """Get price in multiple currencies."""
        converted_prices = {}
        
        for currency in target_currencies:
            if currency != original_currency:
                converted_prices[currency.value] = await self.convert_price(amount, original_currency, currency)
        
        return LocalizedPrice(
            original_price=amount,
            original_currency=original_currency,
            converted_prices=converted_prices
        )
    
    # Currency Formatting
    def format_currency(self, amount: float, currency: CurrencyCode, locale: str = "en-US") -> str:
        """Format currency amount according to locale rules."""
        currency_info = self.currencies.get(currency.value)
        if not currency_info:
            return f"{amount:.2f} {currency.value}"
        
        # Round to appropriate decimal places
        rounded_amount = round(amount, currency_info.decimal_places)
        
        # Format number with thousands separator
        if currency_info.decimal_places == 0:
            formatted_number = f"{int(rounded_amount):,}"
        else:
            formatted_number = f"{rounded_amount:,.{currency_info.decimal_places}f}"
        
        # Apply locale-specific formatting
        if locale.startswith("de"):  # German locale
            formatted_number = formatted_number.replace(",", "X").replace(".", ",").replace("X", ".")
        elif locale.startswith("fr"):  # French locale
            formatted_number = formatted_number.replace(",", " ").replace(".", ",")
        
        # Add currency symbol
        symbol = currency_info.symbol
        space = " " if currency_info.space_between_symbol else ""
        
        if currency_info.symbol_position == "before":
            return f"{symbol}{space}{formatted_number}"
        else:
            return f"{formatted_number}{space}{symbol}"
    
    # User Locale Management
    async def get_user_locale(self, user_id: str) -> Optional[UserLocale]:
        """Get user's locale preferences."""
        locale_doc = await self.user_locales_collection.find_one({"user_id": user_id})
        if locale_doc:
            locale_doc["user_id"] = user_id
            return UserLocale(**locale_doc)
        return None
    
    async def set_user_locale(self, user_id: str, locale: UserLocale) -> bool:
        """Set user's locale preferences."""
        locale_doc = UserLocaleDocument(
            user_id=user_id,
            country=locale.country.value,
            language=locale.language.value,
            currency=locale.currency.value,
            timezone=locale.timezone,
            date_format=locale.date_format,
            time_format=locale.time_format,
            number_format=locale.number_format,
            auto_detect=locale.auto_detect,
            measurement_system=locale.measurement_system,
            first_day_of_week=locale.first_day_of_week,
            preferred_marketplaces=locale.preferred_marketplaces,
            exclude_international_shipping=locale.exclude_international_shipping,
            max_shipping_cost=locale.max_shipping_cost,
            updated_at=datetime.now()
        )
        
        result = await self.user_locales_collection.update_one(
            {"user_id": user_id},
            {"$set": locale_doc.model_dump()},
            upsert=True
        )
        
        return result.acknowledged
    
    async def detect_user_locale(self, ip_address: str, user_agent: str = None) -> UserLocale:
        """Auto-detect user locale from IP address and user agent."""
        geolocation = await self.get_geolocation(ip_address)
        
        # Default to US locale
        country = CountryCode.US
        language = LanguageCode.EN
        currency = CurrencyCode.USD
        
        if geolocation and geolocation.country:
            country = geolocation.country
            currency = geolocation.currency or currency
            language = geolocation.language or language
        
        # Detect language from user agent if available
        if user_agent and not geolocation:
            language = self._detect_language_from_user_agent(user_agent)
        
        return UserLocale(
            user_id="",  # Will be set by caller
            country=country,
            language=language,
            currency=currency,
            timezone=geolocation.timezone if geolocation else "UTC"
        )
    
    def _detect_language_from_user_agent(self, user_agent: str) -> LanguageCode:
        """Detect language from user agent string."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement user agent language detection
        # This is a simplified implementation
        
        language_indicators = {
            "es": ["es-", "español", "spanish"],
            "fr": ["fr-", "français", "french"],
            "de": ["de-", "deutsch", "german"],
            "ja": ["ja-", "japanese"],
            "zh": ["zh-", "chinese"],
            "ko": ["ko-", "korean"],
            "pt": ["pt-", "português", "portuguese"],
            "ru": ["ru-", "russian"],
            "it": ["it-", "italiano", "italian"]
        }
        
        user_agent_lower = user_agent.lower()
        for lang_code, indicators in language_indicators.items():
            if any(indicator in user_agent_lower for indicator in indicators):
                return LanguageCode(lang_code)
        
        return LanguageCode.EN  # Default to English
    
    # Geolocation
    async def get_geolocation(self, ip_address: str) -> Optional[GeolocationInfo]:
        """Get geolocation information for IP address."""
        # Check cache first
        cached_location = await self.geolocation_cache_collection.find_one({
            "ip_address": ip_address,
            "detected_at": {"$gte": datetime.now() - timedelta(days=7)}
        })
        
        if cached_location:
            return GeolocationInfo(**cached_location)
        
        # Fetch from geolocation API
        try:
            location_data = await self._fetch_geolocation(ip_address)
            if location_data:
                # Store in cache
                await self.geolocation_cache_collection.update_one(
                    {"ip_address": ip_address},
                    {"$set": location_data.model_dump()},
                    upsert=True
                )
                return location_data
        except Exception as e:
            logger.error(f"Failed to fetch geolocation for {ip_address}: {e}")
        
        return None
    
    async def _fetch_geolocation(self, ip_address: str) -> Optional[GeolocationInfo]:
        """Fetch geolocation from external API."""
        if ip_address in ["127.0.0.1", "localhost", "::1"]:
            return None  # Skip localhost
        
        for api_url in self.geolocation_apis:
            try:
                async with aiohttp.ClientSession() as session:
                    url = api_url.format(ip=ip_address) if "{ip}" in api_url else f"{api_url}{ip_address}"
                    
                    async with session.get(url, timeout=5) as response:
                        if response.status == 200:
                            data = await response.json()
                            return self._parse_geolocation_response(data, ip_address)
            except Exception as e:
                logger.warning(f"Geolocation API {api_url} failed: {e}")
                continue
        
        return None
    
    def _parse_geolocation_response(self, data: Dict[str, Any], ip_address: str) -> GeolocationInfo:
        """Parse geolocation API response."""
        # Handle different API response formats
        country_code = data.get("country_code", data.get("countryCode", data.get("country")))
        
        # Map country to currency and language
        country_mappings = {
            "US": (CurrencyCode.USD, LanguageCode.EN, "America/New_York"),
            "GB": (CurrencyCode.GBP, LanguageCode.EN, "Europe/London"),
            "DE": (CurrencyCode.EUR, LanguageCode.DE, "Europe/Berlin"),
            "FR": (CurrencyCode.EUR, LanguageCode.FR, "Europe/Paris"),
            "ES": (CurrencyCode.EUR, LanguageCode.ES, "Europe/Madrid"),
            "IT": (CurrencyCode.EUR, LanguageCode.IT, "Europe/Rome"),
            "JP": (CurrencyCode.JPY, LanguageCode.JA, "Asia/Tokyo"),
            "CN": (CurrencyCode.CNY, LanguageCode.ZH, "Asia/Shanghai"),
            "CA": (CurrencyCode.CAD, LanguageCode.EN, "America/Toronto"),
            "AU": (CurrencyCode.AUD, LanguageCode.EN, "Australia/Sydney"),
            "BR": (CurrencyCode.BRL, LanguageCode.PT, "America/Sao_Paulo"),
            "MX": (CurrencyCode.MXN, LanguageCode.ES, "America/Mexico_City"),
            "IN": (CurrencyCode.INR, LanguageCode.EN, "Asia/Kolkata"),
            "KR": (CurrencyCode.KRW, LanguageCode.KO, "Asia/Seoul"),
        }
        
        currency, language, default_timezone = country_mappings.get(
            country_code, 
            (CurrencyCode.USD, LanguageCode.EN, "UTC")
        )
        
        return GeolocationInfo(
            ip_address=ip_address,
            country=CountryCode(country_code) if country_code in [c.value for c in CountryCode] else None,
            region=data.get("region", data.get("regionName")),
            city=data.get("city"),
            latitude=data.get("lat", data.get("latitude")),
            longitude=data.get("lon", data.get("longitude")),
            timezone=data.get("timezone", default_timezone),
            currency=currency,
            language=language,
            accuracy="high" if data.get("city") else "medium"
        )
    
    # Content Localization
    async def get_localized_content(self, content_id: str, language: LanguageCode) -> Optional[str]:
        """Get localized content for specific language."""
        content_doc = await self.localized_content_collection.find_one({"content_id": content_id})
        
        if content_doc:
            translations = content_doc.get("translations", {})
            
            # Try requested language first
            if language.value in translations:
                return translations[language.value]
            
            # Fall back to English
            if LanguageCode.EN.value in translations:
                return translations[LanguageCode.EN.value]
            
            # Fall back to default language
            default_lang = content_doc.get("default_language", "en")
            if default_lang in translations:
                return translations[default_lang]
        
        return None
    
    async def set_localized_content(self, content_id: str, content_type: str, translations: Dict[str, str]) -> bool:
        """Set localized content translations."""
        content_doc = LocalizedContentDocument(
            content_id=content_id,
            content_type=content_type,
            translations=translations,
            default_language=LanguageCode.EN.value,
            last_updated=datetime.now()
        )
        
        result = await self.localized_content_collection.update_one(
            {"content_id": content_id},
            {"$set": content_doc.model_dump()},
            upsert=True
        )
        
        return result.acknowledged
    
    # Utility Methods
    async def get_supported_currencies(self) -> List[CurrencyInfo]:
        """Get list of supported currencies."""
        return list(self.currencies.values())
    
    async def get_country_info(self, country_code: CountryCode) -> Dict[str, Any]:
        """Get information about a specific country."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement comprehensive country data
        country_data = {
            CountryCode.US: {
                "name": "United States",
                "currency": CurrencyCode.USD,
                "language": LanguageCode.EN,
                "timezone": "America/New_York",
                "measurement_system": "imperial",
                "popular_marketplaces": ["amazon", "ebay", "walmart"]
            },
            CountryCode.GB: {
                "name": "United Kingdom",
                "currency": CurrencyCode.GBP,
                "language": LanguageCode.EN,
                "timezone": "Europe/London",
                "measurement_system": "metric",
                "popular_marketplaces": ["amazon", "ebay", "argos"]
            },
            CountryCode.DE: {
                "name": "Germany",
                "currency": CurrencyCode.EUR,
                "language": LanguageCode.DE,
                "timezone": "Europe/Berlin",
                "measurement_system": "metric",
                "popular_marketplaces": ["amazon", "ebay", "otto"]
            }
        }
        
        return country_data.get(country_code, {
            "name": country_code.value,
            "currency": CurrencyCode.USD,
            "language": LanguageCode.EN,
            "timezone": "UTC",
            "measurement_system": "metric",
            "popular_marketplaces": ["amazon", "ebay"]
        })
    
    async def cleanup_old_data(self):
        """Clean up old cached data."""
        cutoff_date = datetime.now() - timedelta(days=30)
        
        # Clean old geolocation cache
        await self.geolocation_cache_collection.delete_many({
            "detected_at": {"$lt": cutoff_date}
        })
        
        # Clean old exchange rates
        await self.exchange_rates_collection.delete_many({
            "updated_at": {"$lt": cutoff_date}
        })
        
        logger.info("Cleaned up old internationalization data")