"""Image proxy router for handling external images with CORS issues."""
import base64
from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import Response
from typing import Optional
import logging

from app.services.image_proxy import image_proxy_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["Images"])

@router.get("/proxy")
async def proxy_image(url: str = Query(..., description="URL of the image to proxy")):
    """
    Proxy an external image to bypass CORS and SSL issues.
    
    This endpoint downloads images from external sources (like AliExpress)
    and serves them through our server to avoid CORS restrictions.
    """
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL parameter is required"
        )
    
    try:
        # Decode URL if it's base64 encoded (for special characters)
        if url.startswith('data:'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data URLs are not supported"
            )
        
        # Get image data from proxy service
        image_data, content_type = await image_proxy_service.get_image(url)
        
        if image_data is None:
            # Return a placeholder image instead of error
            placeholder_svg = '''
            <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f3f4f6"/>
                <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">
                    Image Not Available
                </text>
                <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">
                    📷
                </text>
            </svg>
            '''
            return Response(
                content=placeholder_svg,
                media_type="image/svg+xml",
                headers={
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        
        # Return the image with proper headers
        return Response(
            content=image_data,
            media_type=content_type or "image/jpeg",
            headers={
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "*"
            }
        )
    
    except Exception as e:
        logger.error(f"Error proxying image {url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to proxy image"
        )

@router.get("/proxy-base64")
async def proxy_image_base64(url: str = Query(..., description="Base64 encoded URL")):
    """
    Proxy an external image using base64 encoded URL.
    Useful for URLs with special characters.
    """
    try:
        # Decode base64 URL
        decoded_url = base64.b64decode(url.encode()).decode('utf-8')
        return await proxy_image(decoded_url)
    
    except Exception as e:
        logger.error(f"Error decoding base64 URL {url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoded URL"
        )

@router.post("/clean-cache")
async def clean_image_cache():
    """Clean expired cached images (admin endpoint)."""
    try:
        image_proxy_service.clean_cache()
        return {"message": "Image cache cleaned successfully"}
    except Exception as e:
        logger.error(f"Error cleaning image cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clean image cache"
        )