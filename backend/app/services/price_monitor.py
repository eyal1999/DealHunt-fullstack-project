"""Price monitoring service for wishlist items."""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from bson import ObjectId

from app.db import wishlist_collection, users_collection
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

class PriceMonitor:
    """Service to monitor and update prices for wishlist items."""
    
    def __init__(self):
        self.is_running = False
        self.check_interval = 3600  # 1 hour in seconds
    
    async def start_monitoring(self):
        """Start the price monitoring background task."""
        if self.is_running:
            logger.warning("Price monitoring is already running")
            return
        
        self.is_running = True
        logger.info("Starting price monitoring service")
        
        while self.is_running:
            try:
                await self.check_all_prices()
                logger.info(f"Price check completed. Sleeping for {self.check_interval} seconds")
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in price monitoring loop: {e}")
                # Sleep for a shorter time on error to retry sooner
                await asyncio.sleep(300)  # 5 minutes
    
    def stop_monitoring(self):
        """Stop the price monitoring background task."""
        self.is_running = False
        logger.info("Stopping price monitoring service")
    
    async def check_all_prices(self):
        """Check prices for all wishlist items and send notifications."""
        try:
            # Get all unique user IDs with wishlist items
            user_ids = await wishlist_collection.distinct("user_id")
            
            logger.info(f"Checking prices for {len(user_ids)} users")
            
            total_updated = 0
            total_notifications = 0
            
            for user_id in user_ids:
                try:
                    updated_count, notification_sent = await self.check_user_prices(user_id)
                    total_updated += updated_count
                    if notification_sent:
                        total_notifications += 1
                except Exception as e:
                    logger.error(f"Error checking prices for user {user_id}: {e}")
            
            logger.info(f"Price check summary: {total_updated} items updated, {total_notifications} notifications sent")
            
        except Exception as e:
            logger.error(f"Error in check_all_prices: {e}")
    
    async def check_user_prices(self, user_id: str) -> tuple[int, bool]:
        """Check prices for a specific user's wishlist items."""
        # Get user's wishlist items
        wishlist_cursor = wishlist_collection.find({"user_id": user_id})
        wishlist_items = await wishlist_cursor.to_list(length=1000)
        
        if not wishlist_items:
            return 0, False
        
        updated_count = 0
        price_drops = []
        
        for item in wishlist_items:
            try:
                # Simulate price checking (in real implementation, call marketplace APIs)
                new_price = await self.get_current_price(item)
                
                if new_price is not None:
                    old_price = item.get("last_checked_price", item["sale_price"])
                    
                    # Update price if it has changed significantly (more than 1% difference)
                    price_diff = abs(new_price - old_price) / old_price if old_price > 0 else 0
                    
                    if price_diff > 0.01:  # More than 1% change
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
                        
                        # Track price drops for notifications
                        if change_type == "decrease":
                            price_drops.append({
                                "title": item["title"],
                                "old_price": old_price,
                                "new_price": new_price,
                                "savings": old_price - new_price
                            })
                        
                        logger.debug(f"Updated price for {item['title']}: {old_price} -> {new_price}")
                
            except Exception as e:
                logger.error(f"Error checking price for item {item.get('title', 'Unknown')}: {e}")
        
        # Send price drop notifications if any
        notification_sent = False
        if price_drops:
            try:
                # Get user details and check notification preferences
                user = await users_collection.find_one({"_id": ObjectId(user_id)})
                
                if user and user.get("price_drop_notifications", True):
                    await email_service.send_price_drop_notification(
                        user["email"], 
                        price_drops
                    )
                    notification_sent = True
                    logger.info(f"Sent price drop notification to {user['email']} for {len(price_drops)} items")
                
            except Exception as e:
                logger.error(f"Failed to send price drop notification to user {user_id}: {e}")
        
        return updated_count, notification_sent
    
    async def get_current_price(self, item: Dict[str, Any]) -> float:
        """Get current price for an item from its marketplace."""
        # In a real implementation, this would:
        # 1. Make API calls to the specific marketplace (Amazon, eBay, AliExpress)
        # 2. Parse the current price from the response
        # 3. Handle rate limiting, errors, etc.
        
        # For simulation purposes, we'll create realistic price fluctuations
        import random
        
        current_price = item.get("last_checked_price", item["sale_price"])
        
        # Simulate price changes based on time since last check
        last_check = None
        if item.get("price_history"):
            last_check = item["price_history"][-1].get("timestamp")
        
        # Only change prices occasionally (20% chance)
        if random.random() < 0.2:
            # More likely to decrease (60% chance) to simulate sales/discounts
            if random.random() < 0.6:
                # Price decrease: 5-25% off
                multiplier = random.uniform(0.75, 0.95)
                return round(current_price * multiplier, 2)
            else:
                # Price increase: 5-15% up
                multiplier = random.uniform(1.05, 1.15)
                return round(current_price * multiplier, 2)
        
        # No price change
        return current_price

# Global price monitor instance
price_monitor = PriceMonitor()

async def start_price_monitoring():
    """Start the price monitoring service."""
    await price_monitor.start_monitoring()

def stop_price_monitoring():
    """Stop the price monitoring service."""
    price_monitor.stop_monitoring()