"""
User profile and settings API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from app.auth.jwt import get_current_user
from app.models.db_models import User
from app.db import users_collection

router = APIRouter(prefix="/user", tags=["User"])


class SearchHistoryRequest(BaseModel):
    """Request model for updating search history."""
    search_history: List[str]


class SearchHistoryResponse(BaseModel):
    """Response model for search history."""
    search_history: List[str]


@router.get("/search-history", response_model=SearchHistoryResponse)
async def get_search_history(
    current_user: User = Depends(get_current_user)
):
    """Get user's search history."""
    try:
        # Get user document from database
        user_doc = await users_collection.find_one({"_id": ObjectId(current_user.id)})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Return search history (empty list if not exists)
        search_history = user_doc.get("search_history", [])
        
        return SearchHistoryResponse(search_history=search_history)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get search history")


@router.post("/search-history")
async def update_search_history(
    request: SearchHistoryRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user's search history."""
    try:
        # Validate search history (max 20 items, no empty strings)
        search_history = [item.strip() for item in request.search_history if item.strip()]
        search_history = search_history[:20]  # Limit to 20 items
        
        # Update user document
        result = await users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "search_history": search_history,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Search history updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update search history")


@router.delete("/search-history")
async def clear_search_history(
    current_user: User = Depends(get_current_user)
):
    """Clear user's search history."""
    try:
        # Clear search history
        result = await users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "search_history": [],
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Search history cleared successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to clear search history")