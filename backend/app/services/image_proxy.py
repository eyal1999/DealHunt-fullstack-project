"""Image proxy service to handle CORS and SSL issues with external images."""
import aiohttp
import asyncio
import logging
from typing import Optional, Tuple
import hashlib
import os
from datetime import datetime, timedelta
import mimetypes

logger = logging.getLogger(__name__)

class ImageProxyService:
    """Service to proxy images and handle CORS/SSL issues."""
    
    def __init__(self):
        self.cache_dir = "uploads/image_cache"
        self.cache_duration = timedelta(hours=24)  # Cache for 24 hours
        self.max_file_size = 10 * 1024 * 1024  # 10MB max file size
        os.makedirs(self.cache_dir, exist_ok=True)
    
    def _get_cache_path(self, url: str) -> str:
        """Generate cache file path for URL."""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{url_hash}")
    
    def _is_cache_valid(self, cache_path: str) -> bool:
        """Check if cached file exists and is not expired."""
        if not os.path.exists(cache_path):
            return False
        
        # Check file age
        file_time = datetime.fromtimestamp(os.path.getmtime(cache_path))
        return datetime.now() - file_time < self.cache_duration
    
    async def get_image(self, url: str) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Get image data, either from cache or by downloading.
        Returns (image_data, content_type) or (None, None) if failed.
        """
        if not url or not url.strip():
            return None, None
        
        # Clean and validate URL
        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            return None, None
        
        cache_path = self._get_cache_path(url)
        
        # Try to serve from cache first
        if self._is_cache_valid(cache_path):
            try:
                with open(cache_path, 'rb') as f:
                    image_data = f.read()
                
                # Determine content type from file extension or URL
                content_type = self._get_content_type(url)
                return image_data, content_type
            
            except Exception as e:
                logger.warning(f"Failed to read cached image {cache_path}: {e}")
        
        # Download and cache the image
        return await self._download_and_cache_image(url, cache_path)
    
    async def _download_and_cache_image(self, url: str, cache_path: str) -> Tuple[Optional[bytes], Optional[str]]:
        """Download image and cache it."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, headers=headers, ssl=False) as response:
                    if response.status == 200:
                        content_type = response.headers.get('content-type', 'image/jpeg')
                        
                        # Check content length
                        content_length = response.headers.get('content-length')
                        if content_length and int(content_length) > self.max_file_size:
                            logger.warning(f"Image too large: {url}")
                            return None, None
                        
                        # Read image data
                        image_data = await response.read()
                        
                        # Validate it's actually an image
                        if not self._is_valid_image(image_data, content_type):
                            logger.warning(f"Invalid image format: {url}")
                            return None, None
                        
                        # Cache the image
                        try:
                            with open(cache_path, 'wb') as f:
                                f.write(image_data)
                            logger.debug(f"Cached image: {url}")
                        except Exception as e:
                            logger.warning(f"Failed to cache image {url}: {e}")
                        
                        return image_data, content_type
                    
                    else:
                        logger.warning(f"Failed to download image {url}: HTTP {response.status}")
                        return None, None
        
        except asyncio.TimeoutError:
            logger.warning(f"Timeout downloading image: {url}")
            return None, None
        except Exception as e:
            logger.warning(f"Error downloading image {url}: {e}")
            return None, None
    
    def _get_content_type(self, url: str) -> str:
        """Determine content type from URL extension."""
        content_type, _ = mimetypes.guess_type(url)
        return content_type or 'image/jpeg'
    
    def _is_valid_image(self, data: bytes, content_type: str) -> bool:
        """Basic validation to check if data is a valid image."""
        if not data:
            return False
        
        # Check common image file signatures
        image_signatures = {
            b'\xFF\xD8\xFF': 'image/jpeg',  # JPEG
            b'\x89PNG\r\n\x1a\n': 'image/png',  # PNG
            b'GIF87a': 'image/gif',  # GIF87a
            b'GIF89a': 'image/gif',  # GIF89a
            b'RIFF': 'image/webp',  # WebP (partial check)
        }
        
        for signature in image_signatures:
            if data.startswith(signature):
                return True
        
        return False
    
    def clean_cache(self):
        """Clean expired cache files."""
        try:
            now = datetime.now()
            for filename in os.listdir(self.cache_dir):
                filepath = os.path.join(self.cache_dir, filename)
                if os.path.isfile(filepath):
                    file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                    if now - file_time > self.cache_duration:
                        os.remove(filepath)
                        logger.debug(f"Removed expired cache file: {filename}")
        except Exception as e:
            logger.error(f"Error cleaning cache: {e}")

# Global instance
image_proxy_service = ImageProxyService()