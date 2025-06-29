"""
Real-time notification service using Server-Sent Events (SSE).
"""
import asyncio
import json
from typing import Dict, List, Optional, Set
from datetime import datetime
from fastapi import Request
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.social import Notification, NotificationType


class NotificationService:
    """Service for real-time notifications using Server-Sent Events."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.notifications_collection = database.notifications
        self.connected_users: Dict[str, Set[asyncio.Queue]] = {}
        
    async def connect_user(self, user_id: str) -> asyncio.Queue:
        """Connect a user to the notification stream."""
        queue = asyncio.Queue()
        
        if user_id not in self.connected_users:
            self.connected_users[user_id] = set()
        
        self.connected_users[user_id].add(queue)
        return queue
    
    async def disconnect_user(self, user_id: str, queue: asyncio.Queue):
        """Disconnect a user from the notification stream."""
        if user_id in self.connected_users:
            self.connected_users[user_id].discard(queue)
            if not self.connected_users[user_id]:
                del self.connected_users[user_id]
    
    async def send_notification_to_user(
        self, 
        user_id: str, 
        notification_type: NotificationType,
        title: str,
        message: str,
        sender_id: Optional[str] = None,
        action_url: Optional[str] = None,
        action_data: Dict = None
    ) -> Notification:
        """Send a real-time notification to a user."""
        
        # Create notification in database
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            sender_id=sender_id,
            action_url=action_url,
            action_data=action_data or {}
        )
        
        result = await self.notifications_collection.insert_one(notification.model_dump())
        notification.id = str(result.inserted_id)
        
        # Send real-time notification to connected clients
        await self._broadcast_to_user(user_id, {
            "type": "notification",
            "data": notification.model_dump()
        })
        
        return notification
    
    async def send_price_alert(
        self,
        user_id: str,
        product_title: str,
        old_price: float,
        new_price: float,
        product_url: str,
        product_image: Optional[str] = None
    ):
        """Send a price drop alert notification."""
        discount_percent = int(((old_price - new_price) / old_price) * 100)
        
        await self.send_notification_to_user(
            user_id=user_id,
            notification_type=NotificationType.PRICE_DROP,
            title=f"💸 Price Drop Alert!",
            message=f"{product_title} is now ${new_price:.2f} (was ${old_price:.2f}) - {discount_percent}% off!",
            action_url=product_url,
            action_data={
                "product_title": product_title,
                "old_price": old_price,
                "new_price": new_price,
                "discount_percent": discount_percent,
                "product_image": product_image
            }
        )
    
    async def send_stock_alert(
        self,
        user_id: str,
        product_title: str,
        product_url: str,
        product_image: Optional[str] = None
    ):
        """Send a back-in-stock alert notification."""
        await self.send_notification_to_user(
            user_id=user_id,
            notification_type=NotificationType.PRODUCT_BACK_IN_STOCK,
            title=f"📦 Back in Stock!",
            message=f"{product_title} is now available again!",
            action_url=product_url,
            action_data={
                "product_title": product_title,
                "product_image": product_image
            }
        )
    
    async def send_deal_alert(
        self,
        user_id: str,
        deal_title: str,
        deal_description: str,
        deal_url: str,
        deal_image: Optional[str] = None
    ):
        """Send a special deal alert notification."""
        await self.send_notification_to_user(
            user_id=user_id,
            notification_type=NotificationType.DEAL_ALERT,
            title=f"🔥 Hot Deal Alert!",
            message=f"{deal_title} - {deal_description}",
            action_url=deal_url,
            action_data={
                "deal_title": deal_title,
                "deal_description": deal_description,
                "deal_image": deal_image
            }
        )
    
    async def _broadcast_to_user(self, user_id: str, data: Dict):
        """Broadcast data to all connected clients for a user."""
        if user_id not in self.connected_users:
            return
        
        message = f"data: {json.dumps(data)}\n\n"
        
        # Send to all connected clients for this user
        disconnected_queues = []
        for queue in self.connected_users[user_id].copy():
            try:
                await queue.put(message)
            except Exception:
                # Queue is closed, mark for removal
                disconnected_queues.append(queue)
        
        # Clean up disconnected queues
        for queue in disconnected_queues:
            self.connected_users[user_id].discard(queue)
    
    async def create_sse_stream(self, user_id: str, request: Request):
        """Create Server-Sent Events stream for a user."""
        queue = await self.connect_user(user_id)
        
        async def event_generator():
            try:
                # Send initial connection message
                yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected to notifications'})}\n\n"
                
                # Send any unread notifications on connection
                unread_notifications = await self._get_unread_notifications(user_id, limit=5)
                if unread_notifications:
                    yield f"data: {json.dumps({'type': 'unread_notifications', 'data': unread_notifications})}\n\n"
                
                # Keep connection alive and send notifications as they come
                while True:
                    try:
                        # Check if client disconnected
                        if await request.is_disconnected():
                            break
                        
                        # Wait for notification with timeout for heartbeat
                        message = await asyncio.wait_for(queue.get(), timeout=30.0)
                        yield message
                        
                    except asyncio.TimeoutError:
                        # Send heartbeat to keep connection alive
                        yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
                    
            except Exception as e:
                print(f"SSE stream error for user {user_id}: {e}")
            finally:
                await self.disconnect_user(user_id, queue)
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
    
    async def _get_unread_notifications(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get unread notifications for a user."""
        cursor = self.notifications_collection.find({
            "user_id": user_id,
            "read": False
        }).sort("created_at", -1).limit(limit)
        
        notifications = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and add id field
        for notif in notifications:
            notif["id"] = str(notif["_id"])
            del notif["_id"]
        
        return notifications
    
    async def get_notification_summary(self, user_id: str) -> Dict:
        """Get notification summary for a user."""
        unread_count = await self.notifications_collection.count_documents({
            "user_id": user_id,
            "read": False
        })
        
        recent_notifications = await self._get_unread_notifications(user_id, limit=3)
        
        return {
            "unread_count": unread_count,
            "recent_notifications": recent_notifications,
            "has_notifications": unread_count > 0
        }


# Global notification service instance
notification_service: Optional[NotificationService] = None

def get_notification_service(database: AsyncIOMotorDatabase) -> NotificationService:
    """Get or create notification service instance."""
    global notification_service
    if notification_service is None:
        notification_service = NotificationService(database)
    return notification_service