"""
Internationalization and multi-currency support models.
"""
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum
from bson import ObjectId


class CurrencyCode(str, Enum):
    """Supported currency codes (ISO 4217)."""
    USD = "USD"  # US Dollar
    EUR = "EUR"  # Euro
    GBP = "GBP"  # British Pound
    CAD = "CAD"  # Canadian Dollar
    AUD = "AUD"  # Australian Dollar
    JPY = "JPY"  # Japanese Yen
    CNY = "CNY"  # Chinese Yuan
    INR = "INR"  # Indian Rupee
    BRL = "BRL"  # Brazilian Real
    MXN = "MXN"  # Mexican Peso
    KRW = "KRW"  # South Korean Won
    SGD = "SGD"  # Singapore Dollar
    HKD = "HKD"  # Hong Kong Dollar
    NOK = "NOK"  # Norwegian Krone
    SEK = "SEK"  # Swedish Krona
    CHF = "CHF"  # Swiss Franc
    PLN = "PLN"  # Polish Zloty
    RUB = "RUB"  # Russian Ruble
    ZAR = "ZAR"  # South African Rand
    NZD = "NZD"  # New Zealand Dollar


class LanguageCode(str, Enum):
    """Supported language codes (ISO 639-1)."""
    EN = "en"  # English
    ES = "es"  # Spanish
    FR = "fr"  # French
    DE = "de"  # German
    IT = "it"  # Italian
    PT = "pt"  # Portuguese
    JA = "ja"  # Japanese
    KO = "ko"  # Korean
    ZH = "zh"  # Chinese (Simplified)
    RU = "ru"  # Russian
    AR = "ar"  # Arabic
    HI = "hi"  # Hindi
    NL = "nl"  # Dutch
    SV = "sv"  # Swedish
    NO = "no"  # Norwegian
    DA = "da"  # Danish
    FI = "fi"  # Finnish
    PL = "pl"  # Polish
    TR = "tr"  # Turkish
    TH = "th"  # Thai


class CountryCode(str, Enum):
    """Supported country codes (ISO 3166-1 alpha-2)."""
    US = "US"  # United States
    CA = "CA"  # Canada
    GB = "GB"  # United Kingdom
    AU = "AU"  # Australia
    DE = "DE"  # Germany
    FR = "FR"  # France
    IT = "IT"  # Italy
    ES = "ES"  # Spain
    NL = "NL"  # Netherlands
    BE = "BE"  # Belgium
    AT = "AT"  # Austria
    CH = "CH"  # Switzerland
    SE = "SE"  # Sweden
    NO = "NO"  # Norway
    DK = "DK"  # Denmark
    FI = "FI"  # Finland
    PL = "PL"  # Poland
    JP = "JP"  # Japan
    KR = "KR"  # South Korea
    CN = "CN"  # China
    HK = "HK"  # Hong Kong
    SG = "SG"  # Singapore
    IN = "IN"  # India
    BR = "BR"  # Brazil
    MX = "MX"  # Mexico
    AR = "AR"  # Argentina
    CL = "CL"  # Chile
    RU = "RU"  # Russia
    ZA = "ZA"  # South Africa
    NZ = "NZ"  # New Zealand


class CurrencyInfo(BaseModel):
    """Currency information and formatting rules."""
    code: CurrencyCode = Field(..., description="Currency code")
    name: str = Field(..., description="Currency name")
    symbol: str = Field(..., description="Currency symbol")
    decimal_places: int = Field(2, description="Number of decimal places")
    symbol_position: str = Field("before", description="Symbol position: before/after")
    thousands_separator: str = Field(",", description="Thousands separator")
    decimal_separator: str = Field(".", description="Decimal separator")
    space_between_symbol: bool = Field(False, description="Space between symbol and amount")


class ExchangeRate(BaseModel):
    """Exchange rate between currencies."""
    from_currency: CurrencyCode = Field(..., description="Source currency")
    to_currency: CurrencyCode = Field(..., description="Target currency")
    rate: float = Field(..., description="Exchange rate")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update time")
    source: str = Field("api", description="Rate source")


class LocalizedPrice(BaseModel):
    """Price in multiple currencies."""
    original_price: float = Field(..., description="Original price amount")
    original_currency: CurrencyCode = Field(..., description="Original currency")
    converted_prices: Dict[str, float] = Field({}, description="Prices in other currencies")
    last_updated: datetime = Field(default_factory=datetime.now, description="Last conversion update")


class CountryMarketplace(BaseModel):
    """Marketplace information for specific countries."""
    marketplace_id: str = Field(..., description="Marketplace identifier")
    country_code: CountryCode = Field(..., description="Country code")
    marketplace_name: str = Field(..., description="Localized marketplace name")
    base_url: str = Field(..., description="Country-specific base URL")
    currency: CurrencyCode = Field(..., description="Default currency")
    language: LanguageCode = Field(..., description="Default language")
    tax_included: bool = Field(True, description="Whether prices include tax")
    shipping_info: Dict[str, Any] = Field({}, description="Shipping information")
    supported_payment_methods: List[str] = Field([], description="Supported payment methods")


class UserLocale(BaseModel):
    """User's locale preferences."""
    user_id: str = Field(..., description="User identifier")
    country: CountryCode = Field(CountryCode.US, description="User's country")
    language: LanguageCode = Field(LanguageCode.EN, description="Preferred language")
    currency: CurrencyCode = Field(CurrencyCode.USD, description="Preferred currency")
    timezone: str = Field("UTC", description="User's timezone")
    date_format: str = Field("MM/DD/YYYY", description="Preferred date format")
    time_format: str = Field("12h", description="12h or 24h time format")
    number_format: str = Field("en-US", description="Number formatting locale")
    auto_detect: bool = Field(True, description="Auto-detect locale from browser")
    
    # Regional preferences
    measurement_system: str = Field("imperial", description="imperial/metric")
    first_day_of_week: int = Field(0, description="0=Sunday, 1=Monday")
    
    # Shopping preferences
    preferred_marketplaces: List[str] = Field([], description="Preferred marketplace IDs")
    exclude_international_shipping: bool = Field(False, description="Exclude products with international shipping")
    max_shipping_cost: Optional[float] = Field(None, description="Maximum acceptable shipping cost")


class LocalizedContent(BaseModel):
    """Localized content for different languages."""
    content_id: str = Field(..., description="Content identifier")
    content_type: str = Field(..., description="Type of content")
    translations: Dict[str, str] = Field({}, description="Translations by language code")
    default_language: LanguageCode = Field(LanguageCode.EN, description="Default language")
    last_updated: datetime = Field(default_factory=datetime.now)


class RegionalSettings(BaseModel):
    """Regional marketplace and pricing settings."""
    region_id: str = Field(..., description="Region identifier")
    countries: List[CountryCode] = Field(..., description="Countries in this region")
    default_currency: CurrencyCode = Field(..., description="Default currency for region")
    default_language: LanguageCode = Field(..., description="Default language for region")
    tax_rate: float = Field(0.0, description="Default tax rate")
    shipping_zones: List[Dict[str, Any]] = Field([], description="Shipping zone configuration")
    popular_categories: List[str] = Field([], description="Popular categories in region")
    marketplace_priorities: List[str] = Field([], description="Marketplace search order")


class GeolocationInfo(BaseModel):
    """User geolocation information."""
    ip_address: str = Field(..., description="User IP address")
    country: Optional[CountryCode] = Field(None, description="Detected country")
    region: Optional[str] = Field(None, description="State/Province")
    city: Optional[str] = Field(None, description="City")
    latitude: Optional[float] = Field(None, description="Latitude")
    longitude: Optional[float] = Field(None, description="Longitude")
    timezone: Optional[str] = Field(None, description="Detected timezone")
    currency: Optional[CurrencyCode] = Field(None, description="Country's currency")
    language: Optional[LanguageCode] = Field(None, description="Country's primary language")
    detected_at: datetime = Field(default_factory=datetime.now)
    accuracy: str = Field("unknown", description="Detection accuracy: high/medium/low")


# MongoDB Document Models
class ExchangeRateDocument(BaseModel):
    """MongoDB document for exchange rates."""
    id: Optional[str] = Field(None, alias="_id")
    from_currency: str
    to_currency: str
    rate: float
    updated_at: datetime
    source: str
    historical_rates: List[Dict[str, Any]] = Field([], description="Historical rate data")
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class UserLocaleDocument(BaseModel):
    """MongoDB document for user locale preferences."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    country: str
    language: str
    currency: str
    timezone: str
    date_format: str
    time_format: str
    number_format: str
    auto_detect: bool = True
    measurement_system: str = "imperial"
    first_day_of_week: int = 0
    preferred_marketplaces: List[str] = []
    exclude_international_shipping: bool = False
    max_shipping_cost: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class LocalizedContentDocument(BaseModel):
    """MongoDB document for localized content."""
    id: Optional[str] = Field(None, alias="_id")
    content_id: str
    content_type: str
    translations: Dict[str, str]
    default_language: str
    last_updated: datetime = Field(default_factory=datetime.now)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }