"""Wishlist router."""
from typing import Any, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.jwt import get_current_active_user
from app.db import wishlist_collection
from app.models.db_models import User, WishlistItem, WishlistItemOut

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

@router.get("/", response_model=List[WishlistItemOut])
async def get_wishlist(current_user: User = Depends(get_current_active_user)) -> Any:
    """Get user's wishlist items."""
    # Find all wishlist items for the user
    wishlist_cursor = wishlist_collection.find({"user_id": current_user.id})
    # Convert to list and return
    wishlist_items = await wishlist_cursor.to_list(length=100)  # Limit to 100 items

    # Convert ObjectIds to strings for response
    return [
        WishlistItemOut(
            id=str(item["_id"]),
            product_id=item["product_id"],
            marketplace=item["marketplace"],
            title=item["title"],
            original_price=item["original_price"],
            sale_price=item["sale_price"],
            image=item["image"],
            detail_url=item["detail_url"],
            affiliate_link=item["affiliate_link"],
            added_at=item["added_at"]
        )
        for item in wishlist_items
    ]

@router.post("/", response_model=WishlistItemOut)
async def add_to_wishlist(
    product_data: dict, current_user: User = Depends(get_current_active_user)
) -> Any:
    """Add item to wishlist."""
    # Convert string ID to ObjectId for MongoDB
    
    # Check if product already exists in wishlist
    existing_item = await wishlist_collection.find_one({
        "user_id": current_user.id, 
        "product_id": product_data["product_id"],
        "marketplace": product_data["marketplace"]
    })
    
    if existing_item:
        # Return existing item
        return WishlistItemOut(
            id=str(existing_item["_id"]),
            product_id=existing_item["product_id"],
            marketplace=existing_item["marketplace"],
            title=existing_item["title"],
            original_price=existing_item["original_price"],
            sale_price=existing_item["sale_price"],
            image=existing_item["image"],
            detail_url=existing_item["detail_url"],
            affiliate_link=existing_item["affiliate_link"],
            added_at=existing_item["added_at"]
        )
    
    # Create wishlist item
    wishlist_item = WishlistItem(
        user_id=current_user.id,
        product_id=product_data["product_id"],
        marketplace=product_data["marketplace"],
        title=product_data["title"],
        original_price=product_data["original_price"],
        sale_price=product_data["sale_price"],
        image=product_data["image"],
        detail_url=product_data["detail_url"],
        affiliate_link=product_data["affiliate_link"]
    )
    
    # Insert into database
    result = await wishlist_collection.insert_one(wishlist_item.dict(by_alias=True))
    
    # Get newly created item
    created_item = await wishlist_collection.find_one({"_id": result.inserted_id})
    
    # Return wishlist item
    return WishlistItemOut(
        id=str(created_item["_id"]),
        product_id=created_item["product_id"],
        marketplace=created_item["marketplace"],
        title=created_item["title"],
        original_price=created_item["original_price"],
        sale_price=created_item["sale_price"],
        image=created_item["image"],
        detail_url=created_item["detail_url"],
        affiliate_link=created_item["affiliate_link"],
        added_at=created_item["added_at"]
    )

@router.delete("/{item_id}", response_model=dict)
async def remove_from_wishlist(
    item_id: str, current_user: User = Depends(get_current_active_user)
) -> Any:
    """Remove item from wishlist."""
    # Convert string IDs to ObjectIds for MongoDB
    print(f"Current user ID: {current_user.id}")
    print(f"Current item ID: {item_id}")
    
    # Find item to ensure it belongs to the user
    item = await wishlist_collection.find_one({
        "product_id": item_id, 
        "user_id": current_user.id
    })
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found"
        )
    
    # Delete from wishlist
    await wishlist_collection.delete_one({"product_id": item_id})
    
    return {"message": "Item removed from wishlist"}