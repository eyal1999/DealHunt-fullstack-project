"""Admin endpoints for system management."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any

from app.auth.jwt import get_current_active_user
from app.models.db_models import User
from app.services.price_monitor import price_monitor

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/trigger-price-check", response_model=dict)
async def trigger_price_check(current_user: User = Depends(get_current_active_user)) -> Any:
    """Manually trigger a price check for all users (admin endpoint)."""
    try:
        await price_monitor.check_all_prices()
        return {"message": "Price check triggered successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger price check: {str(e)}"
        )

@router.get("/price-monitor-status", response_model=dict)
async def get_price_monitor_status(current_user: User = Depends(get_current_active_user)) -> Any:
    """Get the current status of the price monitoring service."""
    return {
        "is_running": price_monitor.is_running,
        "check_interval": price_monitor.check_interval
    }