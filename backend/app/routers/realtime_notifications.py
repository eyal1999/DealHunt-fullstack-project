"""
Real-time notifications router using Server-Sent Events.
"""
from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import StreamingResponse

from app.auth.jwt import get_current_active_user
from app.models.db_models import User
from app.services.notification_service import get_notification_service, NotificationService
from app.db import db as database


router = APIRouter(prefix="/realtime", tags=["Real-time Notifications"])


def get_notification_service_instance() -> NotificationService:
    """Get notification service instance."""
    return get_notification_service(database)


@router.get("/stream")
async def notification_stream(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service_instance)
):
    """
    Server-Sent Events endpoint for real-time notifications.
    
    Usage from frontend:
    ```javascript
    const eventSource = new EventSource('/api/realtime/stream', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('Notification:', data);
    };
    ```
    """
    return await service.create_sse_stream(current_user.id, request)


@router.get("/summary")
async def get_notification_summary(
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service_instance)
):
    """Get notification summary for current user."""
    return await service.get_notification_summary(current_user.id)


@router.post("/test")
async def send_test_notification(
    message: str = "This is a test notification",
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service_instance)
):
    """Send a test notification (for development/testing)."""
    from app.models.social import NotificationType
    
    notification = await service.send_notification_to_user(
        user_id=current_user.id,
        notification_type=NotificationType.SYSTEM_UPDATE,
        title="Test Notification",
        message=message,
        action_url="/dashboard"
    )
    
    return {
        "message": "Test notification sent",
        "notification_id": notification.id
    }


@router.post("/price-alert")
async def send_price_alert(
    user_id: str,
    product_title: str,
    old_price: float,
    new_price: float,
    product_url: str,
    product_image: str = None,
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service_instance)
):
    """
    Send a price alert notification.
    **MANUAL IMPLEMENTATION NEEDED**: Add admin role check or restrict to price monitoring service.
    """
    # For now, allow any authenticated user to send price alerts
    # In production, this should be restricted to admin users or the price monitoring service
    
    await service.send_price_alert(
        user_id=user_id,
        product_title=product_title,
        old_price=old_price,
        new_price=new_price,
        product_url=product_url,
        product_image=product_image
    )
    
    return {"message": "Price alert sent successfully"}


@router.post("/stock-alert")
async def send_stock_alert(
    user_id: str,
    product_title: str,
    product_url: str,
    product_image: str = None,
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service_instance)
):
    """
    Send a stock alert notification.
    **MANUAL IMPLEMENTATION NEEDED**: Add admin role check or restrict to inventory monitoring service.
    """
    await service.send_stock_alert(
        user_id=user_id,
        product_title=product_title,
        product_url=product_url,
        product_image=product_image
    )
    
    return {"message": "Stock alert sent successfully"}


@router.post("/deal-alert")
async def send_deal_alert(
    user_id: str,
    deal_title: str,
    deal_description: str,
    deal_url: str,
    deal_image: str = None,
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service_instance)
):
    """
    Send a deal alert notification.
    **MANUAL IMPLEMENTATION NEEDED**: Add admin role check or restrict to deal discovery service.
    """
    await service.send_deal_alert(
        user_id=user_id,
        deal_title=deal_title,
        deal_description=deal_description,
        deal_url=deal_url,
        deal_image=deal_image
    )
    
    return {"message": "Deal alert sent successfully"}