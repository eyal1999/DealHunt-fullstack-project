"""
Enhanced wishlist service with multiple lists, sharing, and analytics.
"""
import secrets
from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.enhanced_wishlist import (
    Wishlist, WishlistProduct, WishlistShare, 
    WishlistAnalytics, WishlistDocument
)


class EnhancedWishlistService:
    """Service for managing enhanced wishlists with multiple lists and sharing."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.wishlists_collection = database.enhanced_wishlists
        self.shares_collection = database.wishlist_shares
        self.analytics_collection = database.wishlist_analytics
    
    async def create_wishlist(self, user_id: str, wishlist_data: Dict[str, Any]) -> Wishlist:
        """Create a new wishlist."""
        wishlist = Wishlist(
            user_id=user_id,
            name=wishlist_data.get("name", "My Wishlist"),
            description=wishlist_data.get("description", ""),
            color=wishlist_data.get("color", "#3B82F6"),
            icon=wishlist_data.get("icon", "heart"),
            category=wishlist_data.get("category", "general"),
            tags=wishlist_data.get("tags", [])
        )
        
        # Convert to document format
        doc_data = wishlist.model_dump()
        doc_data["products"] = []  # Initialize empty products list
        
        result = await self.wishlists_collection.insert_one(doc_data)
        wishlist.id = str(result.inserted_id)
        
        await self._update_user_analytics(user_id)
        return wishlist
    
    async def get_user_wishlists(self, user_id: str) -> List[Wishlist]:
        """Get all wishlists for a user including shared ones."""
        # Get user's own wishlists
        cursor = self.wishlists_collection.find({"user_id": user_id})
        own_wishlists = await cursor.to_list(length=100)
        
        # Get shared wishlists
        shared_cursor = self.shares_collection.find({"shared_with_id": user_id})
        shares = await shared_cursor.to_list(length=50)
        
        shared_wishlist_ids = [share["wishlist_id"] for share in shares]
        shared_wishlists = []
        
        if shared_wishlist_ids:
            shared_cursor = self.wishlists_collection.find({
                "_id": {"$in": [ObjectId(wid) for wid in shared_wishlist_ids]}
            })
            shared_wishlists = await shared_cursor.to_list(length=50)
        
        # Convert to Wishlist objects
        all_wishlists = []
        
        for doc in own_wishlists + shared_wishlists:
            wishlist = self._doc_to_wishlist(doc)
            all_wishlists.append(wishlist)
        
        return all_wishlists
    
    async def get_wishlist(self, wishlist_id: str, user_id: str) -> Optional[Wishlist]:
        """Get a specific wishlist if user has access."""
        try:
            object_id = ObjectId(wishlist_id)
        except:
            return None
        
        # Check if user owns the wishlist
        doc = await self.wishlists_collection.find_one({
            "_id": object_id,
            "user_id": user_id
        })
        
        if not doc:
            # Check if wishlist is shared with user
            share = await self.shares_collection.find_one({
                "wishlist_id": wishlist_id,
                "shared_with_id": user_id
            })
            
            if share:
                doc = await self.wishlists_collection.find_one({"_id": object_id})
        
        if not doc:
            return None
        
        # Update last accessed time
        await self.wishlists_collection.update_one(
            {"_id": object_id},
            {"$set": {"last_accessed": datetime.now()}}
        )
        
        return self._doc_to_wishlist(doc)
    
    async def add_product_to_wishlist(
        self, 
        wishlist_id: str, 
        user_id: str, 
        product_data: Dict[str, Any]
    ) -> bool:
        """Add a product to a wishlist."""
        wishlist = await self.get_wishlist(wishlist_id, user_id)
        if not wishlist:
            return False
        
        # Create WishlistProduct
        product = WishlistProduct(
            product_id=product_data["product_id"],
            marketplace=product_data["marketplace"],
            title=product_data["title"],
            image_url=product_data.get("image_url", ""),
            product_url=product_data["product_url"],
            original_price=product_data["original_price"],
            sale_price=product_data["sale_price"],
            target_price=product_data.get("target_price"),
            notes=product_data.get("notes", ""),
            priority=product_data.get("priority", 1)
        )
        
        # Add to wishlist and update
        wishlist.add_product(product)
        
        # Update in database
        await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {
                "$set": {
                    "products": [p.model_dump() for p in wishlist.products],
                    "updated_at": wishlist.updated_at,
                    "total_value": wishlist.total_value,
                    "potential_savings": wishlist.potential_savings
                }
            }
        )
        
        await self._update_user_analytics(user_id)
        return True
    
    async def remove_product_from_wishlist(
        self, 
        wishlist_id: str, 
        user_id: str, 
        product_id: str, 
        marketplace: str
    ) -> bool:
        """Remove a product from a wishlist."""
        wishlist = await self.get_wishlist(wishlist_id, user_id)
        if not wishlist:
            return False
        
        wishlist.remove_product(product_id, marketplace)
        
        # Update in database
        await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {
                "$set": {
                    "products": [p.model_dump() for p in wishlist.products],
                    "updated_at": wishlist.updated_at,
                    "total_value": wishlist.total_value,
                    "potential_savings": wishlist.potential_savings
                }
            }
        )
        
        await self._update_user_analytics(user_id)
        return True
    
    async def update_wishlist(
        self, 
        wishlist_id: str, 
        user_id: str, 
        updates: Dict[str, Any]
    ) -> bool:
        """Update wishlist metadata."""
        # Check ownership
        doc = await self.wishlists_collection.find_one({
            "_id": ObjectId(wishlist_id),
            "user_id": user_id
        })
        
        if not doc:
            return False
        
        # Prepare update data
        update_data = {
            "updated_at": datetime.now()
        }
        
        allowed_fields = ["name", "description", "color", "icon", "category", "tags", "sort_order"]
        for field in allowed_fields:
            if field in updates:
                update_data[field] = updates[field]
        
        await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {"$set": update_data}
        )
        
        return True
    
    async def delete_wishlist(self, wishlist_id: str, user_id: str) -> bool:
        """Delete a wishlist."""
        result = await self.wishlists_collection.delete_one({
            "_id": ObjectId(wishlist_id),
            "user_id": user_id
        })
        
        if result.deleted_count > 0:
            # Clean up shares
            await self.shares_collection.delete_many({"wishlist_id": wishlist_id})
            await self._update_user_analytics(user_id)
            return True
        
        return False
    
    async def share_wishlist(
        self, 
        wishlist_id: str, 
        owner_id: str, 
        shared_with_id: str, 
        permission_level: str = "view",
        message: str = ""
    ) -> bool:
        """Share a wishlist with another user."""
        # Verify ownership
        wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(wishlist_id),
            "user_id": owner_id
        })
        
        if not wishlist:
            return False
        
        # Create share record
        share = WishlistShare(
            wishlist_id=wishlist_id,
            owner_id=owner_id,
            shared_with_id=shared_with_id,
            permission_level=permission_level,
            message=message
        )
        
        # Check if already shared
        existing = await self.shares_collection.find_one({
            "wishlist_id": wishlist_id,
            "shared_with_id": shared_with_id
        })
        
        if existing:
            # Update existing share
            await self.shares_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": share.model_dump()}
            )
        else:
            # Create new share
            await self.shares_collection.insert_one(share.model_dump())
        
        # Update wishlist sharing status
        await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {
                "$set": {"is_shared": True},
                "$addToSet": {"shared_with": shared_with_id}
            }
        )
        
        return True
    
    async def create_public_share_link(self, wishlist_id: str, user_id: str) -> Optional[str]:
        """Create a public sharing token for a wishlist."""
        # Verify ownership
        wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(wishlist_id),
            "user_id": user_id
        })
        
        if not wishlist:
            return None
        
        # Generate secure token
        share_token = secrets.token_urlsafe(32)
        
        await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {
                "$set": {
                    "is_public": True,
                    "share_token": share_token
                }
            }
        )
        
        return share_token
    
    async def get_wishlist_by_share_token(self, share_token: str) -> Optional[Wishlist]:
        """Get a wishlist by its public share token."""
        doc = await self.wishlists_collection.find_one({
            "share_token": share_token,
            "is_public": True
        })
        
        if not doc:
            return None
        
        # Increment view count
        await self.wishlists_collection.update_one(
            {"_id": doc["_id"]},
            {
                "$inc": {"view_count": 1},
                "$set": {"last_accessed": datetime.now()}
            }
        )
        
        return self._doc_to_wishlist(doc)
    
    async def get_user_analytics(self, user_id: str) -> WishlistAnalytics:
        """Get analytics for a user's wishlist usage."""
        analytics = await self.analytics_collection.find_one({"user_id": user_id})
        
        if not analytics:
            # Create initial analytics
            await self._update_user_analytics(user_id)
            analytics = await self.analytics_collection.find_one({"user_id": user_id})
        
        return WishlistAnalytics(**analytics)
    
    async def _update_user_analytics(self, user_id: str):
        """Update analytics for a user."""
        # Get all user's wishlists
        cursor = self.wishlists_collection.find({"user_id": user_id})
        wishlists = await cursor.to_list(length=1000)
        
        # Calculate stats
        total_wishlists = len(wishlists)
        total_products = sum(len(w.get("products", [])) for w in wishlists)
        total_value = sum(w.get("total_value", 0) for w in wishlists)
        
        # Get sharing stats
        lists_shared = await self.shares_collection.count_documents({"owner_id": user_id})
        lists_received = await self.shares_collection.count_documents({"shared_with_id": user_id})
        
        # Category and marketplace distribution
        category_dist = {}
        marketplace_dist = {}
        products_with_alerts = 0
        
        for wishlist in wishlists:
            category = wishlist.get("category", "general")
            category_dist[category] = category_dist.get(category, 0) + 1
            
            for product in wishlist.get("products", []):
                marketplace = product.get("marketplace", "unknown")
                marketplace_dist[marketplace] = marketplace_dist.get(marketplace, 0) + 1
                
                if product.get("price_alerts_enabled", True):
                    products_with_alerts += 1
        
        # Calculate average list size
        average_list_size = total_products / total_wishlists if total_wishlists > 0 else 0
        
        analytics_data = {
            "user_id": user_id,
            "total_wishlists": total_wishlists,
            "total_products": total_products,
            "total_value": total_value,
            "products_with_alerts": products_with_alerts,
            "lists_shared": lists_shared,
            "lists_received": lists_received,
            "category_distribution": category_dist,
            "marketplace_distribution": marketplace_dist,
            "average_list_size": average_list_size,
            "last_updated": datetime.now()
        }
        
        await self.analytics_collection.update_one(
            {"user_id": user_id},
            {"$set": analytics_data},
            upsert=True
        )
    
    def _doc_to_wishlist(self, doc: Dict) -> Wishlist:
        """Convert MongoDB document to Wishlist object."""
        # Convert products from dict to WishlistProduct objects
        products = []
        for product_dict in doc.get("products", []):
            products.append(WishlistProduct(**product_dict))
        
        wishlist_data = {
            "id": str(doc["_id"]),
            "user_id": doc["user_id"],
            "name": doc["name"],
            "description": doc.get("description", ""),
            "color": doc.get("color", "#3B82F6"),
            "icon": doc.get("icon", "heart"),
            "products": products,
            "is_public": doc.get("is_public", False),
            "is_shared": doc.get("is_shared", False),
            "shared_with": doc.get("shared_with", []),
            "share_token": doc.get("share_token"),
            "total_value": doc.get("total_value", 0.0),
            "potential_savings": doc.get("potential_savings", 0.0),
            "view_count": doc.get("view_count", 0),
            "created_at": doc["created_at"],
            "updated_at": doc["updated_at"],
            "last_accessed": doc["last_accessed"],
            "tags": doc.get("tags", []),
            "category": doc.get("category", "general"),
            "sort_order": doc.get("sort_order", "date_added")
        }
        
        return Wishlist(**wishlist_data)
    
    # Bulk Operations
    async def bulk_add_products(
        self, 
        wishlist_id: str, 
        user_id: str, 
        products: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Add multiple products to a wishlist at once."""
        # Verify wishlist ownership
        wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(wishlist_id),
            "user_id": user_id
        })
        
        if not wishlist:
            return {"success": False, "error": "Wishlist not found"}
        
        # Create WishlistProduct objects
        wishlist_products = []
        for product_data in products:
            product = WishlistProduct(
                product_id=product_data["product_id"],
                marketplace=product_data["marketplace"],
                title=product_data["title"],
                price=product_data.get("price", 0.0),
                original_price=product_data.get("original_price"),
                image_url=product_data.get("image_url"),
                product_url=product_data["product_url"],
                notes=product_data.get("notes", ""),
                priority=product_data.get("priority", "medium"),
                price_alerts_enabled=product_data.get("price_alerts_enabled", True),
                tags=product_data.get("tags", [])
            )
            wishlist_products.append(product.model_dump())
        
        # Add products to wishlist
        result = await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {
                "$push": {"products": {"$each": wishlist_products}},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        if result.modified_count > 0:
            await self._recalculate_wishlist_totals(wishlist_id)
            await self._update_user_analytics(user_id)
            return {
                "success": True, 
                "added_count": len(products),
                "message": f"Successfully added {len(products)} products"
            }
        
        return {"success": False, "error": "Failed to add products"}
    
    async def bulk_remove_products(
        self, 
        wishlist_id: str, 
        user_id: str, 
        product_ids: List[str],
        marketplace: str = None
    ) -> Dict[str, Any]:
        """Remove multiple products from a wishlist at once."""
        # Verify wishlist ownership
        wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(wishlist_id),
            "user_id": user_id
        })
        
        if not wishlist:
            return {"success": False, "error": "Wishlist not found"}
        
        # Build removal query
        if marketplace:
            remove_query = {
                "$and": [
                    {"product_id": {"$in": product_ids}},
                    {"marketplace": marketplace}
                ]
            }
        else:
            remove_query = {"product_id": {"$in": product_ids}}
        
        # Remove products
        result = await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {
                "$pull": {"products": remove_query},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        if result.modified_count > 0:
            await self._recalculate_wishlist_totals(wishlist_id)
            await self._update_user_analytics(user_id)
            return {
                "success": True,
                "message": f"Successfully removed products"
            }
        
        return {"success": False, "error": "No products were removed"}
    
    async def bulk_move_products(
        self,
        source_wishlist_id: str,
        target_wishlist_id: str,
        user_id: str,
        product_ids: List[str],
        marketplace: str = None
    ) -> Dict[str, Any]:
        """Move multiple products from one wishlist to another."""
        # Verify both wishlists exist and belong to user
        source_wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(source_wishlist_id),
            "user_id": user_id
        })
        
        target_wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(target_wishlist_id),
            "user_id": user_id
        })
        
        if not source_wishlist or not target_wishlist:
            return {"success": False, "error": "One or both wishlists not found"}
        
        # Get products to move
        products_to_move = []
        for product in source_wishlist.get("products", []):
            match_conditions = [product["product_id"] in product_ids]
            if marketplace:
                match_conditions.append(product["marketplace"] == marketplace)
            
            if all(match_conditions):
                products_to_move.append(product)
        
        if not products_to_move:
            return {"success": False, "error": "No matching products found"}
        
        # Remove from source and add to target
        async with await self.db.client.start_session() as session:
            async with session.start_transaction():
                # Remove from source
                remove_query = {"product_id": {"$in": product_ids}}
                if marketplace:
                    remove_query["marketplace"] = marketplace
                
                await self.wishlists_collection.update_one(
                    {"_id": ObjectId(source_wishlist_id)},
                    {
                        "$pull": {"products": remove_query},
                        "$set": {"updated_at": datetime.now()}
                    },
                    session=session
                )
                
                # Add to target
                await self.wishlists_collection.update_one(
                    {"_id": ObjectId(target_wishlist_id)},
                    {
                        "$push": {"products": {"$each": products_to_move}},
                        "$set": {"updated_at": datetime.now()}
                    },
                    session=session
                )
        
        # Recalculate totals for both wishlists
        await self._recalculate_wishlist_totals(source_wishlist_id)
        await self._recalculate_wishlist_totals(target_wishlist_id)
        await self._update_user_analytics(user_id)
        
        return {
            "success": True,
            "moved_count": len(products_to_move),
            "message": f"Successfully moved {len(products_to_move)} products"
        }
    
    async def bulk_update_product_settings(
        self,
        wishlist_id: str,
        user_id: str,
        product_ids: List[str],
        updates: Dict[str, Any],
        marketplace: str = None
    ) -> Dict[str, Any]:
        """Update settings for multiple products at once."""
        # Verify wishlist ownership
        wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(wishlist_id),
            "user_id": user_id
        })
        
        if not wishlist:
            return {"success": False, "error": "Wishlist not found"}
        
        # Build update query
        set_updates = {}
        allowed_fields = ["priority", "price_alerts_enabled", "notes", "tags"]
        
        for field in allowed_fields:
            if field in updates:
                if marketplace:
                    set_updates[f"products.$[elem].{field}"] = updates[field]
                else:
                    set_updates[f"products.$[elem].{field}"] = updates[field]
        
        if not set_updates:
            return {"success": False, "error": "No valid updates provided"}
        
        set_updates["updated_at"] = datetime.now()
        
        # Build array filters
        array_filters = []
        if marketplace:
            array_filters.append({
                "$and": [
                    {"elem.product_id": {"$in": product_ids}},
                    {"elem.marketplace": marketplace}
                ]
            })
        else:
            array_filters.append({"elem.product_id": {"$in": product_ids}})
        
        # Apply updates
        result = await self.wishlists_collection.update_one(
            {"_id": ObjectId(wishlist_id)},
            {"$set": set_updates},
            array_filters=array_filters
        )
        
        if result.modified_count > 0:
            return {
                "success": True,
                "message": f"Successfully updated product settings"
            }
        
        return {"success": False, "error": "No products were updated"}
    
    async def bulk_copy_products(
        self,
        source_wishlist_id: str,
        target_wishlist_id: str,
        user_id: str,
        product_ids: List[str] = None,
        marketplace: str = None
    ) -> Dict[str, Any]:
        """Copy products from one wishlist to another (or all products if none specified)."""
        # Verify both wishlists exist and belong to user
        source_wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(source_wishlist_id),
            "user_id": user_id
        })
        
        target_wishlist = await self.wishlists_collection.find_one({
            "_id": ObjectId(target_wishlist_id),
            "user_id": user_id
        })
        
        if not source_wishlist or not target_wishlist:
            return {"success": False, "error": "One or both wishlists not found"}
        
        # Get products to copy
        products_to_copy = []
        for product in source_wishlist.get("products", []):
            # If no specific products specified, copy all
            if product_ids is None:
                if marketplace is None or product["marketplace"] == marketplace:
                    products_to_copy.append(product)
            else:
                # Copy only specified products
                match_conditions = [product["product_id"] in product_ids]
                if marketplace:
                    match_conditions.append(product["marketplace"] == marketplace)
                
                if all(match_conditions):
                    products_to_copy.append(product)
        
        if not products_to_copy:
            return {"success": False, "error": "No products to copy"}
        
        # Reset some fields for copies
        for product in products_to_copy:
            product["added_at"] = datetime.now()
            # Optionally reset notes or other fields
        
        # Add to target wishlist
        result = await self.wishlists_collection.update_one(
            {"_id": ObjectId(target_wishlist_id)},
            {
                "$push": {"products": {"$each": products_to_copy}},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        if result.modified_count > 0:
            await self._recalculate_wishlist_totals(target_wishlist_id)
            await self._update_user_analytics(user_id)
            return {
                "success": True,
                "copied_count": len(products_to_copy),
                "message": f"Successfully copied {len(products_to_copy)} products"
            }
        
        return {"success": False, "error": "Failed to copy products"}
    
    async def get_bulk_operation_status(self, user_id: str, operation_id: str = None) -> Dict[str, Any]:
        """Get status of bulk operations (for long-running operations)."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement operation tracking
        # This would track long-running bulk operations and their progress
        
        # For now, return mock status
        return {
            "operation_id": operation_id,
            "status": "completed",
            "progress": 100,
            "total_items": 0,
            "processed_items": 0,
            "errors": [],
            "completed_at": datetime.now()
        }