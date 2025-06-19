"""Custom exception classes for the application."""

class DealHuntError(Exception):
    """Base exception class for the DealHunt application."""
    pass

class AliexpressError(DealHuntError):
    """Exception raised for AliExpress API related errors."""
    pass

class EbayError(DealHuntError):
    """Exception raised for eBay API related errors."""
    pass

class ProductNotFoundError(DealHuntError):
    """Exception raised when a product is not found."""
    pass

class InvalidProductDataError(DealHuntError):
    """Exception raised when product data is invalid or incomplete."""
    pass

class APIRateLimitError(DealHuntError):
    """Exception raised when API rate limits are exceeded."""
    pass

class NetworkError(DealHuntError):
    """Exception raised for network-related errors."""
    pass

class ValidationError(DealHuntError):
    """Exception raised for input validation errors."""
    pass