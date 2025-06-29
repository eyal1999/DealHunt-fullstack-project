"""
Price tracking service for monitoring product prices and sending alerts.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import db
from app.models.price_tracking import (
    ProductPriceTracker, 
    PriceAlert, 
    PriceHistoryEntry,
    PriceTrackerDocument,
    PriceAlertDocument
)
from app.providers import detail as provider_detail
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class PriceTrackingService:
    """Service for managing price tracking and alerts."""
    
    def __init__(self):
        self.db: AsyncIOMotorDatabase = None
        self.price_trackers_collection = None
        self.price_alerts_collection = None
        self.user_preferences_collection = None
    
    async def initialize(self):
        """Initialize database connections."""
        self.db = db
        self.price_trackers_collection = self.db.price_trackers
        self.price_alerts_collection = self.db.price_alerts
        self.user_preferences_collection = self.db.user_price_preferences
        
        # Create indexes for better performance
        await self._create_indexes()
    
    async def _create_indexes(self):
        """Create database indexes for optimal performance."""
        try:
            # Price trackers indexes
            await self.price_trackers_collection.create_index("product_id")
            await self.price_trackers_collection.create_index("marketplace")
            await self.price_trackers_collection.create_index("is_active")
            await self.price_trackers_collection.create_index("last_updated")
            
            # Price alerts indexes
            await self.price_alerts_collection.create_index("user_id")
            await self.price_alerts_collection.create_index("product_tracker_id")
            await self.price_alerts_collection.create_index("is_active")
            
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
    
    async def add_product_tracker(self, 
                                product_id: str, 
                                marketplace: str, 
                                product_title: str, 
                                product_url: str,
                                initial_price: float,
                                target_price: Optional[float] = None) -> ProductPriceTracker:
        """Add a new product to price tracking."""
        try:
            # Check if already tracking this product
            existing = await self.price_trackers_collection.find_one({
                "product_id": product_id,
                "marketplace": marketplace
            })
            
            if existing:
                logger.info(f"Product {product_id} already being tracked")
                return ProductPriceTracker(**existing)
            
            # Create new tracker
            tracker = ProductPriceTracker(
                product_id=product_id,
                marketplace=marketplace,
                product_title=product_title,
                product_url=product_url,
                current_price=initial_price,
                lowest_price=initial_price,
                highest_price=initial_price,
                average_price=initial_price,
                target_price=target_price
            )
            
            # Add initial price point
            tracker.add_price_point(initial_price)
            
            # Save to database
            tracker_doc = PriceTrackerDocument(**tracker.dict())
            result = await self.price_trackers_collection.insert_one(tracker_doc.dict(exclude={"_id"}))
            
            logger.info(f"Started tracking product {product_id} from {marketplace}")
            return tracker
            
        except Exception as e:
            logger.error(f"Error adding product tracker: {e}")
            raise
    
    async def update_product_price(self, product_id: str, marketplace: str) -> Optional[ProductPriceTracker]:
        """Update price for a tracked product by fetching current data."""
        try:
            # Get current tracker
            tracker_doc = await self.price_trackers_collection.find_one({
                "product_id": product_id,
                "marketplace": marketplace,
                "is_active": True
            })
            
            if not tracker_doc:
                logger.warning(f"No active tracker found for {product_id}")
                return None
            
            tracker = ProductPriceTracker(**tracker_doc)
            
            # Fetch current product data
            try:
                product_data = provider_detail(marketplace, product_id)
                if not product_data:
                    logger.warning(f"No product data returned for {product_id}")
                    return tracker
                
                current_price = product_data.get('sale_price', 0)
                original_price = product_data.get('original_price', None)
                
                # Add new price point if price changed
                if current_price != tracker.current_price:
                    tracker.add_price_point(current_price, original_price)
                    
                    # Update in database
                    await self.price_trackers_collection.update_one(
                        {"product_id": product_id, "marketplace": marketplace},
                        {"$set": tracker.dict(exclude={"_id"})}
                    )
                    
                    logger.info(f"Updated price for {product_id}: {tracker.current_price} -> {current_price}")
                    
                    # Check for alerts
                    await self._check_price_alerts(tracker)
                
                return tracker
                
            except Exception as e:
                logger.error(f"Error fetching product data for {product_id}: {e}")
                return tracker
                
        except Exception as e:
            logger.error(f"Error updating product price: {e}")
            return None
    
    async def create_price_alert(self,
                               user_id: str,
                               product_id: str,
                               marketplace: str,
                               alert_type: str,
                               target_price: Optional[float] = None,
                               percentage_threshold: Optional[float] = None) -> PriceAlert:
        """Create a price alert for a user."""
        try:
            # Find the product tracker
            tracker_doc = await self.price_trackers_collection.find_one({
                "product_id": product_id,
                "marketplace": marketplace
            })
            
            if not tracker_doc:
                # Create tracker if it doesn't exist
                try:
                    product_data = provider_detail(marketplace, product_id)
                    if product_data:
                        await self.add_product_tracker(
                            product_id=product_id,
                            marketplace=marketplace,
                            product_title=product_data.get('title', 'Unknown Product'),
                            product_url=product_data.get('url', ''),
                            initial_price=product_data.get('sale_price', 0)
                        )
                        tracker_id = f"{product_id}_{marketplace}"
                    else:
                        raise ValueError("Product not found")
                except Exception as e:
                    raise ValueError(f"Cannot create tracker for product: {e}")
            else:
                tracker_id = f"{product_id}_{marketplace}"
            
            # Create alert
            alert = PriceAlert(
                user_id=user_id,
                product_tracker_id=tracker_id,
                alert_type=alert_type,
                target_price=target_price,
                percentage_threshold=percentage_threshold
            )
            
            # Save to database
            alert_doc = PriceAlertDocument(**alert.dict())
            result = await self.price_alerts_collection.insert_one(alert_doc.dict(exclude={"_id"}))
            alert.id = str(result.inserted_id)
            
            logger.info(f"Created price alert for user {user_id}, product {product_id}")
            return alert
            
        except Exception as e:
            logger.error(f"Error creating price alert: {e}")
            raise
    
    async def get_user_alerts(self, user_id: str) -> List[PriceAlert]:
        """Get all active alerts for a user."""
        try:
            cursor = self.price_alerts_collection.find({
                "user_id": user_id,
                "is_active": True
            })
            
            alerts = []
            async for alert_doc in cursor:
                alert = PriceAlert(**alert_doc)
                alert.id = str(alert_doc["_id"])
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error getting user alerts: {e}")
            return []
    
    async def get_price_history(self, product_id: str, marketplace: str, days: int = 30) -> List[PriceHistoryEntry]:
        """Get price history for a product."""
        try:
            tracker_doc = await self.price_trackers_collection.find_one({
                "product_id": product_id,
                "marketplace": marketplace
            })
            
            if not tracker_doc:
                return []
            
            tracker = ProductPriceTracker(**tracker_doc)
            
            # Filter history by days
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_history = [
                entry for entry in tracker.price_history 
                if entry.timestamp >= cutoff_date
            ]
            
            return recent_history
            
        except Exception as e:
            logger.error(f"Error getting price history: {e}")
            return []
    
    async def _check_price_alerts(self, tracker: ProductPriceTracker):
        """Check if any alerts should be triggered for a price tracker."""
        try:
            # Find all active alerts for this tracker
            tracker_id = f"{tracker.product_id}_{tracker.marketplace}"
            cursor = self.price_alerts_collection.find({
                "product_tracker_id": tracker_id,
                "is_active": True,
                "notification_sent": False
            })
            
            async for alert_doc in cursor:
                alert = PriceAlert(**alert_doc)
                should_trigger = False
                
                # Check alert conditions
                if alert.alert_type == "target_price" and alert.target_price:
                    should_trigger = tracker.current_price <= alert.target_price
                
                elif alert.alert_type == "percentage_drop" and alert.percentage_threshold:
                    change_pct = tracker.get_price_change_percentage(days=1)
                    if change_pct and abs(change_pct) >= alert.percentage_threshold:
                        should_trigger = change_pct < 0  # Only for price drops
                
                elif alert.alert_type == "availability":
                    # Check if product became available
                    if len(tracker.price_history) >= 2:
                        current_available = tracker.price_history[-1].available
                        previous_available = tracker.price_history[-2].available
                        should_trigger = current_available and not previous_available
                
                if should_trigger:
                    await self._send_price_alert(alert, tracker)
                    
        except Exception as e:
            logger.error(f"Error checking price alerts: {e}")
    
    async def _send_price_alert(self, alert: PriceAlert, tracker: ProductPriceTracker):
        """Send a price alert notification."""
        try:
            # Update alert as triggered
            await self.price_alerts_collection.update_one(
                {"_id": alert.id},
                {
                    "$set": {
                        "triggered_at": datetime.now(),
                        "notification_sent": True
                    }
                }
            )
            
            # Send email notification if enabled
            if alert.email_notification:
                # Get user email - you'll need to implement user lookup
                old_price = tracker.price_history[-2].price if len(tracker.price_history) >= 2 else tracker.current_price
                savings = old_price - tracker.current_price
                
                items = [{
                    'title': tracker.product_title,
                    'old_price': old_price,
                    'new_price': tracker.current_price,
                    'savings': savings
                }]
                
                # **MANUAL IMPLEMENTATION NEEDED**: Get user email from user_id
                user_email = f"user_{alert.user_id}@example.com"  # Replace with actual user lookup
                
                await email_service.send_price_drop_notification(
                    email=user_email,
                    items=items
                )
            
            logger.info(f"Sent price alert for {tracker.product_title} to user {alert.user_id}")
            
        except Exception as e:
            logger.error(f"Error sending price alert: {e}")
    
    async def run_price_update_cycle(self):
        """Run a cycle to update prices for all tracked products."""
        try:
            logger.info("Starting price update cycle")
            
            # Get all active trackers that need updating
            cutoff_time = datetime.now() - timedelta(hours=1)  # Update at most every hour
            cursor = self.price_trackers_collection.find({
                "is_active": True,
                "last_updated": {"$lt": cutoff_time}
            })
            
            update_count = 0
            async for tracker_doc in cursor:
                try:
                    await self.update_product_price(
                        tracker_doc["product_id"], 
                        tracker_doc["marketplace"]
                    )
                    update_count += 1
                    
                    # Small delay to be respectful to APIs
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error updating tracker {tracker_doc['product_id']}: {e}")
                    continue
            
            logger.info(f"Price update cycle completed. Updated {update_count} products")
            
        except Exception as e:
            logger.error(f"Error in price update cycle: {e}")
    
    async def get_trending_price_drops(self, limit: int = 10) -> List[Dict]:
        """Get products with the biggest recent price drops."""
        try:
            # This is a simplified version - in production you'd want more sophisticated algorithms
            cursor = self.price_trackers_collection.find({
                "is_active": True,
                "price_history.1": {"$exists": True}  # At least 2 price points
            }).limit(limit * 2)  # Get extra to filter
            
            trending_drops = []
            async for tracker_doc in cursor:
                tracker = ProductPriceTracker(**tracker_doc)
                
                # Calculate recent price drop
                if len(tracker.price_history) >= 2:
                    recent_price = tracker.price_history[-1].price
                    previous_price = tracker.price_history[-2].price
                    
                    if previous_price > recent_price:
                        drop_percentage = ((previous_price - recent_price) / previous_price) * 100
                        
                        trending_drops.append({
                            "product_id": tracker.product_id,
                            "marketplace": tracker.marketplace,
                            "title": tracker.product_title,
                            "old_price": previous_price,
                            "new_price": recent_price,
                            "drop_percentage": drop_percentage,
                            "url": tracker.product_url
                        })
            
            # Sort by drop percentage and return top results
            trending_drops.sort(key=lambda x: x["drop_percentage"], reverse=True)
            return trending_drops[:limit]
            
        except Exception as e:
            logger.error(f"Error getting trending price drops: {e}")
            return []


# Global service instance
price_tracking_service = PriceTrackingService()