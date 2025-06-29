"""
Enhanced wishlist router with multiple lists, sharing, and analytics.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.jwt import get_current_active_user
from app.models.db_models import User
from app.models.enhanced_wishlist import Wishlist, WishlistAnalytics
from app.services.enhanced_wishlist_service import EnhancedWishlistService
from app.db import db as database


router = APIRouter(prefix="/enhanced-wishlist", tags=["Enhanced Wishlist"])


def get_wishlist_service() -> EnhancedWishlistService:
    """Get wishlist service instance."""
    return EnhancedWishlistService(database)


# Pydantic models for requests
class CreateWishlistRequest(BaseModel):
    name: str
    description: str = ""
    color: str = "#3B82F6"
    icon: str = "heart"
    category: str = "general"
    tags: List[str] = []


class AddProductRequest(BaseModel):
    product_id: str
    marketplace: str
    title: str
    image_url: str = ""
    product_url: str
    original_price: float
    sale_price: float
    target_price: Optional[float] = None
    notes: str = ""
    priority: int = 1


class UpdateWishlistRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    sort_order: Optional[str] = None


class ShareWishlistRequest(BaseModel):
    shared_with_email: str
    permission_level: str = "view"
    message: str = ""


@router.post("/", response_model=Wishlist)
async def create_wishlist(
    request: CreateWishlistRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Create a new wishlist."""
    wishlist = await service.create_wishlist(
        user_id=current_user.id,
        wishlist_data=request.model_dump()
    )
    return wishlist


@router.get("/", response_model=List[Wishlist])
async def get_user_wishlists(
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Get all wishlists for the current user."""
    wishlists = await service.get_user_wishlists(current_user.id)
    return wishlists


@router.get("/{wishlist_id}", response_model=Wishlist)
async def get_wishlist(
    wishlist_id: str,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Get a specific wishlist."""
    wishlist = await service.get_wishlist(wishlist_id, current_user.id)
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    return wishlist


@router.put("/{wishlist_id}", response_model=dict)
async def update_wishlist(
    wishlist_id: str,
    request: UpdateWishlistRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Update wishlist metadata."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    success = await service.update_wishlist(wishlist_id, current_user.id, updates)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    return {"message": "Wishlist updated successfully"}


@router.delete("/{wishlist_id}", response_model=dict)
async def delete_wishlist(
    wishlist_id: str,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Delete a wishlist."""
    success = await service.delete_wishlist(wishlist_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    return {"message": "Wishlist deleted successfully"}


@router.post("/{wishlist_id}/products", response_model=dict)
async def add_product_to_wishlist(
    wishlist_id: str,
    request: AddProductRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Add a product to a wishlist."""
    success = await service.add_product_to_wishlist(
        wishlist_id=wishlist_id,
        user_id=current_user.id,
        product_data=request.model_dump()
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    return {"message": "Product added to wishlist successfully"}


@router.delete("/{wishlist_id}/products/{product_id}", response_model=dict)
async def remove_product_from_wishlist(
    wishlist_id: str,
    product_id: str,
    marketplace: str,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Remove a product from a wishlist."""
    success = await service.remove_product_from_wishlist(
        wishlist_id=wishlist_id,
        user_id=current_user.id,
        product_id=product_id,
        marketplace=marketplace
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    return {"message": "Product removed from wishlist successfully"}


@router.post("/{wishlist_id}/share", response_model=dict)
async def share_wishlist(
    wishlist_id: str,
    request: ShareWishlistRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Share a wishlist with another user."""
    # Note: In a real implementation, you'd look up the user by email
    # For now, we'll assume the email is the user_id
    success = await service.share_wishlist(
        wishlist_id=wishlist_id,
        owner_id=current_user.id,
        shared_with_id=request.shared_with_email,  # Should be converted to user_id
        permission_level=request.permission_level,
        message=request.message
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    return {"message": "Wishlist shared successfully"}


@router.post("/{wishlist_id}/share/public", response_model=dict)
async def create_public_share_link(
    wishlist_id: str,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Create a public sharing link for a wishlist."""
    share_token = await service.create_public_share_link(wishlist_id, current_user.id)
    
    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    # Generate public URL (you'd use your actual domain)
    public_url = f"/shared/wishlist/{share_token}"
    
    return {
        "message": "Public share link created",
        "share_token": share_token,
        "public_url": public_url
    }


@router.get("/shared/{share_token}", response_model=Wishlist)
async def get_shared_wishlist(
    share_token: str,
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Get a wishlist by its public share token."""
    wishlist = await service.get_wishlist_by_share_token(share_token)
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared wishlist not found"
        )
    
    return wishlist


@router.get("/analytics/me", response_model=WishlistAnalytics)
async def get_user_analytics(
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Get analytics for the current user's wishlist usage."""
    analytics = await service.get_user_analytics(current_user.id)
    return analytics


# Bulk Operations Endpoints

class BulkAddProductsRequest(BaseModel):
    products: List[dict]  # List of product data dictionaries

class BulkRemoveProductsRequest(BaseModel):
    product_ids: List[str]
    marketplace: Optional[str] = None

class BulkMoveProductsRequest(BaseModel):
    target_wishlist_id: str
    product_ids: List[str]
    marketplace: Optional[str] = None

class BulkUpdateProductsRequest(BaseModel):
    product_ids: List[str]
    updates: dict
    marketplace: Optional[str] = None

class BulkCopyProductsRequest(BaseModel):
    target_wishlist_id: str
    product_ids: Optional[List[str]] = None  # If None, copy all products
    marketplace: Optional[str] = None


@router.post("/{wishlist_id}/bulk/add", response_model=dict)
async def bulk_add_products(
    wishlist_id: str,
    request: BulkAddProductsRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Add multiple products to a wishlist at once."""
    result = await service.bulk_add_products(
        wishlist_id=wishlist_id,
        user_id=current_user.id,
        products=request.products
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


@router.post("/{wishlist_id}/bulk/remove", response_model=dict)
async def bulk_remove_products(
    wishlist_id: str,
    request: BulkRemoveProductsRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Remove multiple products from a wishlist at once."""
    result = await service.bulk_remove_products(
        wishlist_id=wishlist_id,
        user_id=current_user.id,
        product_ids=request.product_ids,
        marketplace=request.marketplace
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


@router.post("/{wishlist_id}/bulk/move", response_model=dict)
async def bulk_move_products(
    wishlist_id: str,
    request: BulkMoveProductsRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Move multiple products from one wishlist to another."""
    result = await service.bulk_move_products(
        source_wishlist_id=wishlist_id,
        target_wishlist_id=request.target_wishlist_id,
        user_id=current_user.id,
        product_ids=request.product_ids,
        marketplace=request.marketplace
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


@router.post("/{wishlist_id}/bulk/update", response_model=dict)
async def bulk_update_products(
    wishlist_id: str,
    request: BulkUpdateProductsRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Update settings for multiple products at once."""
    result = await service.bulk_update_product_settings(
        wishlist_id=wishlist_id,
        user_id=current_user.id,
        product_ids=request.product_ids,
        updates=request.updates,
        marketplace=request.marketplace
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


@router.post("/{wishlist_id}/bulk/copy", response_model=dict)
async def bulk_copy_products(
    wishlist_id: str,
    request: BulkCopyProductsRequest,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Copy products from one wishlist to another."""
    result = await service.bulk_copy_products(
        source_wishlist_id=wishlist_id,
        target_wishlist_id=request.target_wishlist_id,
        user_id=current_user.id,
        product_ids=request.product_ids,
        marketplace=request.marketplace
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


@router.get("/bulk/status/{operation_id}", response_model=dict)
async def get_bulk_operation_status(
    operation_id: str,
    current_user: User = Depends(get_current_active_user),
    service: EnhancedWishlistService = Depends(get_wishlist_service)
):
    """Get status of a bulk operation."""
    status_info = await service.get_bulk_operation_status(current_user.id, operation_id)
    return status_info