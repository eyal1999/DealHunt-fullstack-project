"""Wishlist router with fixed user ID consistency."""
from datetime import datetime
from typing import Any, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.jwt import get_current_active_user
from app.db import wishlist_collection, users_collection
from app.models.db_models import User, WishlistItem, WishlistItemOut
from app.services.email_service import email_service

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
            added_at=item["added_at"],
            last_checked_price=item.get("last_checked_price"),
            price_history=item.get("price_history", [])
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
            added_at=existing_item["added_at"],
            last_checked_price=existing_item.get("last_checked_price"),
            price_history=existing_item.get("price_history", [])
        )
    
    # Create wishlist item document directly (bypass Pydantic model validation)
    # This ensures user_id stays as string and doesn't get converted to ObjectId
    current_price = product_data["sale_price"]
    wishlist_item_dict = {
        "user_id": current_user.id,  # Keep as string - this is the KEY fix!
        "product_id": product_data["product_id"],
        "marketplace": product_data["marketplace"],
        "title": product_data["title"],
        "original_price": product_data["original_price"],
        "sale_price": current_price,
        "image": product_data["image"],
        "detail_url": product_data["detail_url"],
        "affiliate_link": product_data["affiliate_link"],
        "added_at": datetime.utcnow(),
        # Price tracking fields
        "last_checked_price": current_price,
        "price_history": [{
            "price": current_price,
            "timestamp": datetime.utcnow(),
            "change_type": "initial"
        }]
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
        added_at=created_item["added_at"],
        last_checked_price=created_item.get("last_checked_price"),
        price_history=created_item.get("price_history", [])
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

@router.put("/{item_id}/update-price", response_model=WishlistItemOut)
async def update_item_price(
    item_id: str, 
    new_price: float, 
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update price for a specific wishlist item and track price changes."""
    
    # Validate item_id format
    try:
        object_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid item ID format: {item_id}"
        )
    
    # Find the item
    item = await wishlist_collection.find_one({
        "_id": object_id,
        "user_id": current_user.id
    })
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found"
        )
    
    old_price = item.get("last_checked_price", item["sale_price"])
    
    # Update price if it has changed
    if new_price != old_price:
        # Determine change type
        change_type = "decrease" if new_price < old_price else "increase"
        
        # Create price history entry
        price_entry = {
            "price": new_price,
            "timestamp": datetime.utcnow(),
            "change_type": change_type,
            "old_price": old_price
        }
        
        # Update the item
        await wishlist_collection.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "sale_price": new_price,
                    "last_checked_price": new_price
                },
                "$push": {"price_history": price_entry}
            }
        )
        
        # If price decreased, check if user wants notifications
        if change_type == "decrease":
            user = await users_collection.find_one({"_id": ObjectId(current_user.id)})
            if user and user.get("price_drop_notifications", True):
                # Send notification
                try:
                    notification_items = [{
                        "title": item["title"],
                        "old_price": old_price,
                        "new_price": new_price,
                        "savings": old_price - new_price
                    }]
                    await email_service.send_price_drop_notification(
                        current_user.email, 
                        notification_items
                    )
                except Exception as e:
                    print(f"Failed to send price drop notification: {e}")
    
    # Get updated item
    updated_item = await wishlist_collection.find_one({"_id": object_id})
    
    return WishlistItemOut(
        id=str(updated_item["_id"]),
        product_id=updated_item["product_id"],
        marketplace=updated_item["marketplace"],
        title=updated_item["title"],
        original_price=updated_item["original_price"],
        sale_price=updated_item["sale_price"],
        image=updated_item["image"],
        detail_url=updated_item["detail_url"],
        affiliate_link=updated_item["affiliate_link"],
        added_at=updated_item["added_at"],
        last_checked_price=updated_item.get("last_checked_price"),
        price_history=updated_item.get("price_history", [])
    )

@router.post("/check-prices", response_model=dict)
async def check_all_prices(current_user: User = Depends(get_current_active_user)) -> Any:
    """Check and update prices for all items in user's wishlist."""
    
    # Get all wishlist items for the user
    wishlist_cursor = wishlist_collection.find({"user_id": current_user.id})
    wishlist_items = await wishlist_cursor.to_list(length=1000)
    
    if not wishlist_items:
        return {"message": "No items in wishlist", "updated_count": 0}
    
    # In a real implementation, you would:
    # 1. Make API calls to each marketplace to get current prices
    # 2. Update prices that have changed
    # 3. Send notifications for price drops
    
    # For now, we'll simulate price checking
    updated_count = 0
    price_drops = []
    
    for item in wishlist_items:
        # Simulate random price changes (for demo purposes)
        import random
        current_price = item.get("last_checked_price", item["sale_price"])
        
        # 30% chance of price change, 60% chance of decrease if change occurs
        if random.random() < 0.3:  # 30% chance of change
            if random.random() < 0.6:  # 60% chance of decrease
                new_price = current_price * random.uniform(0.8, 0.95)  # 5-20% decrease
                change_type = "decrease"
                
                price_drops.append({
                    "title": item["title"],
                    "old_price": current_price,
                    "new_price": new_price,
                    "savings": current_price - new_price
                })
            else:
                new_price = current_price * random.uniform(1.05, 1.15)  # 5-15% increase
                change_type = "increase"
            
            # Update the item
            price_entry = {
                "price": new_price,
                "timestamp": datetime.utcnow(),
                "change_type": change_type,
                "old_price": current_price
            }
            
            await wishlist_collection.update_one(
                {"_id": item["_id"]},
                {
                    "$set": {
                        "sale_price": new_price,
                        "last_checked_price": new_price
                    },
                    "$push": {"price_history": price_entry}
                }
            )
            updated_count += 1
    
    # Send price drop notifications if any
    if price_drops:
        user = await users_collection.find_one({"_id": ObjectId(current_user.id)})
        if user and user.get("price_drop_notifications", True):
            try:
                await email_service.send_price_drop_notification(
                    current_user.email, 
                    price_drops
                )
            except Exception as e:
                print(f"Failed to send price drop notification: {e}")
    
    return {
        "message": f"Price check completed. {updated_count} items updated.",
        "updated_count": updated_count,
        "price_drops_count": len(price_drops)
    }