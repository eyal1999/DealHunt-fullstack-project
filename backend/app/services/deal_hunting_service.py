"""
Automated deal hunting and alerts service.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.deal_hunting import (
    AlertConfig, Deal, DealAlert, DealHuntingStats, HuntingPreferences,
    AlertType, DealSeverity, NotificationChannel, DealFilter,
    AlertConfigDocument, DealDocument, DealAlertDocument
)

logger = logging.getLogger(__name__)


class DealHuntingService:
    """Service for automated deal hunting and alerts."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.alert_configs_collection = database.alert_configs
        self.deals_collection = database.deals
        self.deal_alerts_collection = database.deal_alerts
        self.hunting_preferences_collection = database.hunting_preferences
        self.products_collection = database.products
        
        # Deal hunting configuration
        self.hunting_enabled = True
        self.hunt_interval = 300  # 5 minutes
        self.max_deals_per_hunt = 50
        
        # Price thresholds for severity classification
        self.severity_thresholds = {
            DealSeverity.LOW: 5.0,      # 5-15% discount
            DealSeverity.MEDIUM: 15.0,  # 15-30% discount
            DealSeverity.HIGH: 30.0,    # 30-50% discount
            DealSeverity.CRITICAL: 50.0 # 50%+ discount
        }
    
    # Alert Configuration Management
    async def create_alert_config(self, user_id: str, alert_config: AlertConfig) -> str:
        """Create a new deal alert configuration."""
        alert_config.alert_id = str(uuid.uuid4())
        alert_config.user_id = user_id
        
        config_doc = AlertConfigDocument(
            alert_id=alert_config.alert_id,
            user_id=alert_config.user_id,
            name=alert_config.name,
            description=alert_config.description,
            alert_types=[t.value for t in alert_config.alert_types],
            filters=alert_config.filters.model_dump(),
            severity_threshold=alert_config.severity_threshold.value,
            notification_channels=[c.value for c in alert_config.notification_channels],
            frequency_limit=alert_config.frequency_limit,
            quiet_hours_start=alert_config.quiet_hours_start,
            quiet_hours_end=alert_config.quiet_hours_end,
            is_active=alert_config.is_active
        )
        
        result = await self.alert_configs_collection.insert_one(config_doc.model_dump())
        return alert_config.alert_id
    
    async def get_user_alert_configs(self, user_id: str) -> List[AlertConfig]:
        """Get all alert configurations for a user."""
        configs = []
        cursor = self.alert_configs_collection.find({"user_id": user_id})
        
        async for config_doc in cursor:
            config = AlertConfig(
                alert_id=config_doc["alert_id"],
                user_id=config_doc["user_id"],
                name=config_doc["name"],
                description=config_doc.get("description"),
                alert_types=[AlertType(t) for t in config_doc["alert_types"]],
                filters=DealFilter(**config_doc["filters"]),
                severity_threshold=DealSeverity(config_doc["severity_threshold"]),
                notification_channels=[NotificationChannel(c) for c in config_doc["notification_channels"]],
                frequency_limit=config_doc.get("frequency_limit", 5),
                quiet_hours_start=config_doc.get("quiet_hours_start"),
                quiet_hours_end=config_doc.get("quiet_hours_end"),
                is_active=config_doc.get("is_active", True),
                created_at=config_doc.get("created_at", datetime.now()),
                last_triggered=config_doc.get("last_triggered"),
                triggers_today=config_doc.get("triggers_today", 0)
            )
            configs.append(config)
        
        return configs
    
    async def update_alert_config(self, alert_id: str, updates: Dict[str, Any]) -> bool:
        """Update an alert configuration."""
        result = await self.alert_configs_collection.update_one(
            {"alert_id": alert_id},
            {"$set": updates}
        )
        return result.modified_count > 0
    
    async def delete_alert_config(self, alert_id: str, user_id: str) -> bool:
        """Delete an alert configuration."""
        result = await self.alert_configs_collection.delete_one({
            "alert_id": alert_id,
            "user_id": user_id
        })
        return result.deleted_count > 0
    
    # Deal Detection and Analysis
    async def hunt_for_deals(self) -> List[Deal]:
        """Main deal hunting function - scan for new deals."""
        if not self.hunting_enabled:
            return []
        
        logger.info("Starting deal hunting scan...")
        deals = []
        
        try:
            # Get active alert configurations
            active_configs = await self._get_active_alert_configs()
            
            # Hunt for deals based on configurations
            for config in active_configs:
                config_deals = await self._hunt_deals_for_config(config)
                deals.extend(config_deals)
            
            # Analyze and classify deals
            classified_deals = await self._classify_deals(deals)
            
            # Store deals in database
            await self._store_deals(classified_deals)
            
            # Trigger alerts for matching deals
            await self._trigger_alerts_for_deals(classified_deals)
            
            logger.info(f"Deal hunting completed. Found {len(classified_deals)} deals")
            return classified_deals
            
        except Exception as e:
            logger.error(f"Error during deal hunting: {e}")
            return []
    
    async def _get_active_alert_configs(self) -> List[AlertConfig]:
        """Get all active alert configurations."""
        configs = []
        cursor = self.alert_configs_collection.find({"is_active": True})
        
        async for config_doc in cursor:
            config = AlertConfig(
                alert_id=config_doc["alert_id"],
                user_id=config_doc["user_id"],
                name=config_doc["name"],
                description=config_doc.get("description"),
                alert_types=[AlertType(t) for t in config_doc["alert_types"]],
                filters=DealFilter(**config_doc["filters"]),
                severity_threshold=DealSeverity(config_doc["severity_threshold"]),
                notification_channels=[NotificationChannel(c) for c in config_doc["notification_channels"]],
                frequency_limit=config_doc.get("frequency_limit", 5),
                quiet_hours_start=config_doc.get("quiet_hours_start"),
                quiet_hours_end=config_doc.get("quiet_hours_end"),
                is_active=config_doc.get("is_active", True),
                created_at=config_doc.get("created_at", datetime.now()),
                last_triggered=config_doc.get("last_triggered"),
                triggers_today=config_doc.get("triggers_today", 0)
            )
            configs.append(config)
        
        return configs
    
    async def _hunt_deals_for_config(self, config: AlertConfig) -> List[Deal]:
        """Hunt for deals based on a specific alert configuration."""
        deals = []
        
        try:
            # **MANUAL IMPLEMENTATION NEEDED**: Implement marketplace-specific deal hunting
            # This would involve:
            # 1. Querying marketplace APIs for deals
            # 2. Checking price history for drops
            # 3. Comparing prices across marketplaces
            # 4. Analyzing product ratings and reviews
            
            # Mock implementation for demonstration
            mock_deals = await self._generate_mock_deals(config)
            deals.extend(mock_deals)
            
        except Exception as e:
            logger.error(f"Error hunting deals for config {config.alert_id}: {e}")
        
        return deals
    
    async def _generate_mock_deals(self, config: AlertConfig) -> List[Deal]:
        """Generate mock deals for testing purposes."""
        deals = []
        
        # Find products matching the config filters
        filter_query = {}
        if config.filters.keywords:
            filter_query["title"] = {"$regex": "|".join(config.filters.keywords), "$options": "i"}
        if config.filters.categories:
            filter_query["category"] = {"$in": config.filters.categories}
        if config.filters.marketplaces:
            filter_query["marketplace"] = {"$in": config.filters.marketplaces}
        
        cursor = self.products_collection.find(filter_query).limit(10)
        
        async for product in cursor:
            # Simulate a price drop
            current_price = product.get("price", 100.0)
            original_price = current_price * 1.3  # 30% discount
            discount_amount = original_price - current_price
            discount_percentage = (discount_amount / original_price) * 100
            
            if discount_percentage >= config.filters.min_discount_percentage:
                deal = Deal(
                    deal_id=str(uuid.uuid4()),
                    product_id=str(product.get("_id")),
                    marketplace=product.get("marketplace", "amazon"),
                    title=product.get("title", "Great Deal Product"),
                    description=product.get("description"),
                    image_url=product.get("image_url"),
                    product_url=product.get("url", ""),
                    category=product.get("category"),
                    brand=product.get("brand"),
                    current_price=current_price,
                    original_price=original_price,
                    discount_amount=discount_amount,
                    discount_percentage=discount_percentage,
                    currency=product.get("currency", "USD"),
                    deal_type=AlertType.PRICE_DROP,
                    severity=self._calculate_deal_severity(discount_percentage),
                    rating=product.get("rating"),
                    review_count=product.get("review_count"),
                    in_stock=True,
                    tags=["automated_deal"]
                )
                deals.append(deal)
        
        return deals
    
    def _calculate_deal_severity(self, discount_percentage: float) -> DealSeverity:
        """Calculate deal severity based on discount percentage."""
        if discount_percentage >= self.severity_thresholds[DealSeverity.CRITICAL]:
            return DealSeverity.CRITICAL
        elif discount_percentage >= self.severity_thresholds[DealSeverity.HIGH]:
            return DealSeverity.HIGH
        elif discount_percentage >= self.severity_thresholds[DealSeverity.MEDIUM]:
            return DealSeverity.MEDIUM
        else:
            return DealSeverity.LOW
    
    async def _classify_deals(self, deals: List[Deal]) -> List[Deal]:
        """Classify and enhance deal information."""
        classified_deals = []
        
        for deal in deals:
            # Enhance deal with additional analysis
            enhanced_deal = await self._enhance_deal(deal)
            classified_deals.append(enhanced_deal)
        
        return classified_deals
    
    async def _enhance_deal(self, deal: Deal) -> Deal:
        """Enhance deal with additional analysis."""
        # **MANUAL IMPLEMENTATION NEEDED**: Add deal enhancement logic
        # - Historical price analysis
        # - Competitor price comparison
        # - Product quality assessment
        # - Deal authenticity verification
        
        # Add some basic enhancements
        deal.tags.append(f"severity_{deal.severity.value}")
        
        if deal.discount_percentage > 40:
            deal.tags.append("hot_deal")
        
        if deal.rating and deal.rating >= 4.5:
            deal.tags.append("high_rated")
        
        return deal
    
    async def _store_deals(self, deals: List[Deal]) -> None:
        """Store deals in the database."""
        if not deals:
            return
        
        deal_docs = []
        for deal in deals:
            deal_doc = DealDocument(
                deal_id=deal.deal_id,
                product_id=deal.product_id,
                marketplace=deal.marketplace,
                title=deal.title,
                description=deal.description,
                image_url=deal.image_url,
                product_url=deal.product_url,
                category=deal.category,
                brand=deal.brand,
                current_price=deal.current_price,
                original_price=deal.original_price,
                discount_amount=deal.discount_amount,
                discount_percentage=deal.discount_percentage,
                currency=deal.currency,
                deal_type=deal.deal_type.value,
                severity=deal.severity.value,
                detected_at=deal.detected_at,
                expires_at=deal.expires_at,
                rating=deal.rating,
                review_count=deal.review_count,
                in_stock=deal.in_stock,
                tags=deal.tags,
                metadata=deal.metadata
            )
            deal_docs.append(deal_doc.model_dump())
        
        await self.deals_collection.insert_many(deal_docs)
    
    # Alert Triggering and Notification
    async def _trigger_alerts_for_deals(self, deals: List[Deal]) -> None:
        """Trigger alerts for matching deals."""
        if not deals:
            return
        
        # Get all active alert configurations
        active_configs = await self._get_active_alert_configs()
        
        for deal in deals:
            for config in active_configs:
                if await self._deal_matches_config(deal, config):
                    await self._send_deal_alert(deal, config)
    
    async def _deal_matches_config(self, deal: Deal, config: AlertConfig) -> bool:
        """Check if a deal matches an alert configuration."""
        # Check alert types
        if deal.deal_type not in config.alert_types:
            return False
        
        # Check severity threshold
        severity_values = {
            DealSeverity.LOW: 1,
            DealSeverity.MEDIUM: 2,
            DealSeverity.HIGH: 3,
            DealSeverity.CRITICAL: 4
        }
        
        if severity_values[deal.severity] < severity_values[config.severity_threshold]:
            return False
        
        # Check filters
        filters = config.filters
        
        # Keywords filter
        if filters.keywords:
            title_lower = deal.title.lower()
            if not any(keyword.lower() in title_lower for keyword in filters.keywords):
                return False
        
        # Category filter
        if filters.categories and deal.category:
            if deal.category not in filters.categories:
                return False
        
        # Marketplace filter
        if filters.marketplaces:
            if deal.marketplace not in filters.marketplaces:
                return False
        
        # Price filters
        if filters.max_price and deal.current_price > filters.max_price:
            return False
        
        if filters.min_price and deal.current_price < filters.min_price:
            return False
        
        # Discount filter
        if deal.discount_percentage < filters.min_discount_percentage:
            return False
        
        # Brand filters
        if filters.brands and deal.brand:
            if deal.brand not in filters.brands:
                return False
        
        if filters.exclude_brands and deal.brand:
            if deal.brand in filters.exclude_brands:
                return False
        
        # Quality filters
        if filters.rating_threshold and deal.rating:
            if deal.rating < filters.rating_threshold:
                return False
        
        if filters.reviews_threshold and deal.review_count:
            if deal.review_count < filters.reviews_threshold:
                return False
        
        return True
    
    async def _send_deal_alert(self, deal: Deal, config: AlertConfig) -> None:
        """Send alert notification for a deal."""
        # Check frequency limits
        if not await self._check_frequency_limits(config):
            return
        
        # Check quiet hours
        if not await self._check_quiet_hours(config):
            return
        
        # Create alert message
        message = self._create_alert_message(deal, config)
        
        # Create alert record
        alert = DealAlert(
            alert_id=config.alert_id,
            deal_id=deal.deal_id,
            user_id=config.user_id,
            alert_type=deal.deal_type,
            severity=deal.severity,
            message=message
        )
        
        # Send notifications through configured channels
        sent_channels = []
        for channel in config.notification_channels:
            if await self._send_notification(alert, channel):
                sent_channels.append(channel)
        
        alert.channels_sent = sent_channels
        
        # Store alert in database
        await self._store_alert(alert)
        
        # Update configuration stats
        await self._update_config_stats(config.alert_id)
    
    async def _check_frequency_limits(self, config: AlertConfig) -> bool:
        """Check if alert frequency limits are respected."""
        today = datetime.now().date()
        
        # Count alerts sent today for this config
        alerts_today = await self.deal_alerts_collection.count_documents({
            "alert_id": config.alert_id,
            "sent_at": {
                "$gte": datetime.combine(today, datetime.min.time()),
                "$lt": datetime.combine(today, datetime.max.time())
            }
        })
        
        return alerts_today < config.frequency_limit
    
    async def _check_quiet_hours(self, config: AlertConfig) -> bool:
        """Check if current time is within quiet hours."""
        if not config.quiet_hours_start or not config.quiet_hours_end:
            return True
        
        # **MANUAL IMPLEMENTATION NEEDED**: Implement timezone-aware quiet hours check
        # For now, assume UTC and simple time comparison
        current_time = datetime.now().time()
        start_time = datetime.strptime(config.quiet_hours_start, "%H:%M").time()
        end_time = datetime.strptime(config.quiet_hours_end, "%H:%M").time()
        
        if start_time <= end_time:
            return not (start_time <= current_time <= end_time)
        else:  # Crosses midnight
            return not (current_time >= start_time or current_time <= end_time)
    
    def _create_alert_message(self, deal: Deal, config: AlertConfig) -> str:
        """Create alert message for a deal."""
        discount_text = f"{deal.discount_percentage:.0f}% off"
        price_text = f"${deal.current_price:.2f} (was ${deal.original_price:.2f})"
        
        return f"🔥 {deal.title} - {discount_text} - {price_text} on {deal.marketplace}"
    
    async def _send_notification(self, alert: DealAlert, channel: NotificationChannel) -> bool:
        """Send notification through specified channel."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement actual notification sending
        # - Email notifications
        # - Push notifications
        # - SMS notifications
        # - In-app notifications
        
        logger.info(f"Sending {channel.value} notification for alert {alert.alert_id}")
        return True  # Mock success
    
    async def _store_alert(self, alert: DealAlert) -> None:
        """Store alert in database."""
        alert_doc = DealAlertDocument(
            alert_id=alert.alert_id,
            deal_id=alert.deal_id,
            user_id=alert.user_id,
            alert_type=alert.alert_type.value,
            severity=alert.severity.value,
            message=alert.message,
            channels_sent=[c.value for c in alert.channels_sent],
            sent_at=alert.sent_at,
            read_at=alert.read_at,
            clicked_at=alert.clicked_at,
            metadata=alert.metadata
        )
        
        await self.deal_alerts_collection.insert_one(alert_doc.model_dump())
    
    async def _update_config_stats(self, alert_id: str) -> None:
        """Update alert configuration statistics."""
        await self.alert_configs_collection.update_one(
            {"alert_id": alert_id},
            {
                "$set": {"last_triggered": datetime.now()},
                "$inc": {"triggers_today": 1}
            }
        )
    
    # User Interaction and Management
    async def get_user_deals(self, user_id: str, limit: int = 50) -> List[Deal]:
        """Get deals relevant to a user."""
        deals = []
        
        # Get user's alert configurations
        user_configs = await self.get_user_alert_configs(user_id)
        
        # Find deals that match user's configurations
        for config in user_configs:
            config_deals = await self._find_deals_for_config(config, limit)
            deals.extend(config_deals)
        
        # Remove duplicates and sort by relevance
        unique_deals = {deal.deal_id: deal for deal in deals}
        sorted_deals = sorted(
            unique_deals.values(),
            key=lambda d: (d.severity.value, d.discount_percentage),
            reverse=True
        )
        
        return sorted_deals[:limit]
    
    async def _find_deals_for_config(self, config: AlertConfig, limit: int) -> List[Deal]:
        """Find deals that match a configuration."""
        # **MANUAL IMPLEMENTATION NEEDED**: Implement efficient deal querying
        # This would involve complex MongoDB queries based on config filters
        
        # Mock implementation
        cursor = self.deals_collection.find({}).limit(limit)
        deals = []
        
        async for deal_doc in cursor:
            deal = Deal(
                deal_id=deal_doc["deal_id"],
                product_id=deal_doc["product_id"],
                marketplace=deal_doc["marketplace"],
                title=deal_doc["title"],
                description=deal_doc.get("description"),
                image_url=deal_doc.get("image_url"),
                product_url=deal_doc["product_url"],
                category=deal_doc.get("category"),
                brand=deal_doc.get("brand"),
                current_price=deal_doc["current_price"],
                original_price=deal_doc["original_price"],
                discount_amount=deal_doc["discount_amount"],
                discount_percentage=deal_doc["discount_percentage"],
                currency=deal_doc.get("currency", "USD"),
                deal_type=AlertType(deal_doc["deal_type"]),
                severity=DealSeverity(deal_doc["severity"]),
                detected_at=deal_doc.get("detected_at", datetime.now()),
                expires_at=deal_doc.get("expires_at"),
                rating=deal_doc.get("rating"),
                review_count=deal_doc.get("review_count"),
                in_stock=deal_doc.get("in_stock", True),
                tags=deal_doc.get("tags", []),
                metadata=deal_doc.get("metadata", {})
            )
            
            if await self._deal_matches_config(deal, config):
                deals.append(deal)
        
        return deals
    
    async def mark_alert_read(self, alert_id: str, user_id: str) -> bool:
        """Mark an alert as read."""
        result = await self.deal_alerts_collection.update_one(
            {"alert_id": alert_id, "user_id": user_id},
            {"$set": {"read_at": datetime.now()}}
        )
        return result.modified_count > 0
    
    async def mark_alert_clicked(self, alert_id: str, user_id: str) -> bool:
        """Mark an alert as clicked."""
        result = await self.deal_alerts_collection.update_one(
            {"alert_id": alert_id, "user_id": user_id},
            {"$set": {"clicked_at": datetime.now()}}
        )
        return result.modified_count > 0
    
    # Statistics and Analytics
    async def get_hunting_stats(self, user_id: str, days: int = 30) -> DealHuntingStats:
        """Get deal hunting statistics for a user."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Count active alerts
        active_alerts = await self.alert_configs_collection.count_documents({
            "user_id": user_id,
            "is_active": True
        })
        
        # Count alerts sent
        alerts_sent = await self.deal_alerts_collection.count_documents({
            "user_id": user_id,
            "sent_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # Count alerts clicked
        alerts_clicked = await self.deal_alerts_collection.count_documents({
            "user_id": user_id,
            "clicked_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # **MANUAL IMPLEMENTATION NEEDED**: Implement comprehensive statistics
        # - Deals by severity
        # - Deals by category
        # - Deals by marketplace
        # - Savings calculations
        
        stats = DealHuntingStats(
            user_id=user_id,
            period_start=start_date,
            period_end=end_date,
            total_alerts_configured=active_alerts,
            total_deals_found=0,  # Would be calculated from deals matching user configs
            total_alerts_sent=alerts_sent,
            alerts_clicked=alerts_clicked,
            deals_saved=0,  # Would be calculated from wishlist additions
            deals_purchased=0,  # Would be calculated from purchase tracking
            total_potential_savings=0.0,
            average_discount_percentage=0.0,
            best_deal_savings=0.0
        )
        
        return stats
    
    # Background Tasks and Maintenance
    async def start_hunting_service(self):
        """Start the background deal hunting service."""
        logger.info("Starting automated deal hunting service...")
        
        while self.hunting_enabled:
            try:
                await self.hunt_for_deals()
                await asyncio.sleep(self.hunt_interval)
            except Exception as e:
                logger.error(f"Error in hunting service: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    def stop_hunting_service(self):
        """Stop the background deal hunting service."""
        self.hunting_enabled = False
        logger.info("Stopped automated deal hunting service")
    
    async def cleanup_old_deals(self, days: int = 30):
        """Clean up old deals and alerts."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Remove old deals
        deals_result = await self.deals_collection.delete_many({
            "detected_at": {"$lt": cutoff_date}
        })
        
        # Remove old alerts
        alerts_result = await self.deal_alerts_collection.delete_many({
            "sent_at": {"$lt": cutoff_date}
        })
        
        logger.info(f"Cleaned up {deals_result.deleted_count} old deals and {alerts_result.deleted_count} old alerts")