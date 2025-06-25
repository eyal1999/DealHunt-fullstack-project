import time
import base64
import requests
from typing import Optional, Dict, Any
import threading
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class EbayTokenManager:
    """Manages eBay OAuth tokens with automatic refresh capability."""
    
    def __init__(self):
        self._access_token: Optional[str] = settings.ebay_token
        self._token_expires_at: Optional[float] = None
        self._refresh_lock = threading.Lock()
        
    def get_valid_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        with self._refresh_lock:
            if self._is_token_expired():
                self._refresh_token()
            return self._access_token
    
    def _is_token_expired(self) -> bool:
        """Check if the current token is expired or will expire soon."""
        if not self._token_expires_at:
            # If we don't know expiration, assume current token is still valid
            # We'll only refresh on actual API errors
            return False
        
        # Refresh 5 minutes before actual expiration
        buffer_time = 300  # 5 minutes
        current_time = time.time()
        return current_time >= (self._token_expires_at - buffer_time)
    
    def _refresh_token(self) -> None:
        """Refresh the access token using the refresh token."""
        try:
            # eBay OAuth token endpoint
            token_url = "https://api.ebay.com/identity/v1/oauth2/token"
            
            # Prepare credentials for Basic Auth
            credentials = f"{settings.ebay_client_id}:{settings.ebay_client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            headers = {
                "Authorization": f"Basic {encoded_credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            }
            
            data = {
                "grant_type": "refresh_token",
                "refresh_token": settings.ebay_refresh_token,
                "scope": "https://api.ebay.com/oauth/api_scope"
            }
            
            response = requests.post(token_url, headers=headers, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            
            # Update token and expiration
            self._access_token = token_data["access_token"]
            expires_in = token_data.get("expires_in", 7200)  # Default 2 hours
            self._token_expires_at = time.time() + expires_in
            
            logger.info(f"eBay token refreshed successfully. Expires in {expires_in} seconds.")
            
        except Exception as e:
            logger.error(f"Failed to refresh eBay token: {e}")
            # Keep using the existing token and hope it still works
            # In production, you might want to raise an exception or set a flag
            pass
    
    def force_refresh(self) -> None:
        """Force a token refresh regardless of expiration status."""
        with self._refresh_lock:
            self._refresh_token()
    
    def is_token_valid(self) -> bool:
        """Check if we currently have a valid token."""
        return self._access_token is not None and not self._is_token_expired()

# Global token manager instance
ebay_token_manager = EbayTokenManager()