"""Wishlist router with fixed user ID consistency."""
from datetime import datetime
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
    # CONSISTENT: Always use string user_id for queries
    # Since current_user.id is always a string from JWT auth
    wishlist_cursor = wishlist_collection.find({"user_id": current_user.id})
    wishlist_items = await wishlist_cursor.to_list(length=100)

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
    
    # Check if product already exists in wishlist
    # CONSISTENT: Use string user_id for all operations
    existing_item = await wishlist_collection.find_one({
        "user_id": current_user.id,  # Keep as string
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
    
    # Create wishlist item document directly (bypass Pydantic model validation)
    # This ensures user_id stays as string and doesn't get converted to ObjectId
    wishlist_item_dict = {
        "user_id": current_user.id,  # Keep as string - this is the KEY fix!
        "product_id": product_data["product_id"],
        "marketplace": product_data["marketplace"],
        "title": product_data["title"],
        "original_price": product_data["original_price"],
        "sale_price": product_data["sale_price"],
        "image": product_data["image"],
        "detail_url": product_data["detail_url"],
        "affiliate_link": product_data["affiliate_link"],
        "added_at": datetime.utcnow()
    }
    
    # Insert into database
    result = await wishlist_collection.insert_one(wishlist_item_dict)
    
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
    
    print(f"\n=== REMOVE DEBUG ===")
    print(f"🔍 Current user ID: {current_user.id} (type: {type(current_user.id)})")
    print(f"🔍 Item ID to remove: '{item_id}'")
    
    # Validate item_id format for MongoDB ObjectId
    try:
        object_id = ObjectId(item_id)
        print(f"✅ Successfully converted to ObjectId: {object_id}")
    except Exception as e:
        print(f"❌ Failed to convert '{item_id}' to ObjectId: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid item ID format: {item_id}"
        )
    
    # SIMPLIFIED: Since we're now consistently using string user_id,
    # we only need to query with string format
    print(f"🔍 Searching for item with user_id (string): {current_user.id}")
    
    # Find the item to remove
    item = await wishlist_collection.find_one({
        "_id": object_id,
        "user_id": current_user.id  # Always use string user_id
    })
    
    if not item:
        print(f"❌ Item not found with _id={object_id} and user_id={current_user.id}")
        
        # Debug: Check if item exists at all
        any_item = await wishlist_collection.find_one({"_id": object_id})
        if any_item:
            print(f"⚠️ Item exists but belongs to user: {any_item.get('user_id')} (type: {type(any_item.get('user_id'))})")
            print(f"⚠️ Current user: {current_user.id} (type: {type(current_user.id)})")
        else:
            print(f"⚠️ Item with _id={object_id} doesn't exist in database at all")
            
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wishlist item not found with ID: {item_id}"
        )
    
    print(f"✅ Found item to remove: {item.get('title', 'Unknown title')}")
    
    # Delete from wishlist
    delete_result = await wishlist_collection.delete_one({
        "_id": object_id,
        "user_id": current_user.id  # Use consistent string user_id
    })
    
    print(f"🔍 Delete result: acknowledged={delete_result.acknowledged}, deleted_count={delete_result.deleted_count}")
    
    if delete_result.deleted_count == 0:
        print(f"❌ No items were deleted")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or already removed"
        )
    
    print(f"✅ Successfully removed item")
    print("=== REMOVE DEBUG END ===\n")
    
    return {"message": "Item removed from wishlist successfully"}