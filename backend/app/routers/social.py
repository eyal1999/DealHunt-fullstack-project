"""
Social features router - reviews, sharing, follows, notifications.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from pydantic import BaseModel
from bson import ObjectId

from app.auth.jwt import get_current_active_user
from app.models.db_models import User
from app.models.social import (
    ProductReview, ReviewReply, SocialShare, UserProfile, 
    Notification, ActivityFeed, ShareType, NotificationType
)
from app.services.social_service import SocialService
from app.db import db as database


router = APIRouter(prefix="/social", tags=["Social Features"])


def get_social_service() -> SocialService:
    """Get social service instance."""
    return SocialService(database)


# Request models
class CreateReviewRequest(BaseModel):
    product_id: str
    marketplace: str
    rating: int
    title: str
    content: str
    verified_purchase: bool = False
    images: List[str] = []
    videos: List[str] = []


class CreateShareRequest(BaseModel):
    share_type: ShareType
    content_id: str
    content_title: str
    content_url: str
    content_image: Optional[str] = None
    platform: str
    message: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    profile_public: Optional[bool] = None
    show_wishlists: Optional[bool] = None
    show_reviews: Optional[bool] = None


# === REVIEWS ===

@router.post("/reviews", response_model=ProductReview)
async def create_review(
    request: CreateReviewRequest,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Create a new product review."""
    # **MANUAL IMPLEMENTATION NEEDED**: Verify user actually purchased the product
    # You'll need to check your order/purchase history to set verified_purchase correctly
    
    review = await service.create_review(
        user_id=current_user.id,
        review_data=request.model_dump()
    )
    return review


@router.get("/reviews/product/{marketplace}/{product_id}")
async def get_product_reviews(
    marketplace: str,
    product_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    sort_by: str = Query("newest", regex="^(newest|oldest|highest_rated|lowest_rated|most_helpful)$"),
    service: SocialService = Depends(get_social_service)
):
    """Get reviews for a specific product."""
    return await service.get_product_reviews(
        product_id=product_id,
        marketplace=marketplace,
        page=page,
        limit=limit,
        sort_by=sort_by
    )


@router.post("/reviews/{review_id}/vote")
async def vote_on_review(
    review_id: str,
    is_helpful: bool,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Vote on a review's helpfulness."""
    success = await service.vote_on_review(
        user_id=current_user.id,
        review_id=review_id,
        is_helpful=is_helpful
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to vote on review"
        )
    
    return {"message": "Vote recorded successfully"}


@router.post("/reviews/{review_id}/reply", response_model=ReviewReply)
async def reply_to_review(
    review_id: str,
    content: str,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Reply to a review."""
    reply = await service.reply_to_review(
        user_id=current_user.id,
        review_id=review_id,
        content=content
    )
    return reply


# === SOCIAL SHARING ===

@router.post("/share", response_model=SocialShare)
async def create_share(
    request: CreateShareRequest,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Share content on social media."""
    share = await service.create_share(
        user_id=current_user.id,
        share_data=request.model_dump()
    )
    return share


@router.post("/share/{share_id}/click")
async def track_share_click(
    share_id: str,
    service: SocialService = Depends(get_social_service)
):
    """Track a click on shared content."""
    success = await service.track_share_click(share_id)
    return {"tracked": success}


# === USER FOLLOWING ===

@router.post("/follow/{user_id}")
async def follow_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Follow another user."""
    success = await service.follow_user(
        follower_id=current_user.id,
        followed_id=user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to follow user"
        )
    
    return {"message": "User followed successfully"}


@router.delete("/follow/{user_id}")
async def unfollow_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Unfollow a user."""
    success = await service.unfollow_user(
        follower_id=current_user.id,
        followed_id=user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow relationship not found"
        )
    
    return {"message": "User unfollowed successfully"}


@router.get("/users/{user_id}/followers")
async def get_user_followers(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    service: SocialService = Depends(get_social_service)
):
    """Get followers of a user."""
    return await service.get_user_followers(user_id, page, limit)


@router.get("/users/{user_id}/following")
async def get_user_following(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    service: SocialService = Depends(get_social_service)
):
    """Get users that this user is following."""
    # Get following relationships
    skip = (page - 1) * limit
    
    cursor = service.follows_collection.find({"follower_id": user_id}).skip(skip).limit(limit)
    follows = await cursor.to_list(length=limit)
    
    # Get followed user profiles
    followed_ids = [follow["followed_id"] for follow in follows]
    profiles = await service._get_user_profiles_by_ids(followed_ids)
    
    total_count = await service.follows_collection.count_documents({"follower_id": user_id})
    
    return {
        "following": profiles,
        "total_count": total_count,
        "page": page,
        "pages": (total_count + limit - 1) // limit
    }


# === USER PROFILES ===

@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(
    user_id: str,
    service: SocialService = Depends(get_social_service)
):
    """Get a user's public profile."""
    profile = await service.get_user_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    return profile


@router.get("/profile/me", response_model=UserProfile)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Get current user's profile."""
    profile = await service.get_user_profile(current_user.id)
    if not profile:
        # Create default profile if doesn't exist
        profile = await service.create_or_update_profile(
            user_id=current_user.id,
            profile_data={"display_name": current_user.email.split("@")[0]}
        )
    return profile


@router.put("/profile/me", response_model=UserProfile)
async def update_my_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Update current user's profile."""
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    
    profile = await service.create_or_update_profile(
        user_id=current_user.id,
        profile_data=update_data
    )
    return profile


# === NOTIFICATIONS ===

@router.get("/notifications")
async def get_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Get user notifications."""
    return await service.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        page=page,
        limit=limit
    )


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Mark a notification as read."""
    success = await service.mark_notification_read(
        user_id=current_user.id,
        notification_id=notification_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Mark all notifications as read."""
    count = await service.mark_all_notifications_read(current_user.id)
    return {"message": f"Marked {count} notifications as read"}


# === ACTIVITY FEED ===

@router.get("/feed")
async def get_activity_feed(
    following_only: bool = Query(True),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Get activity feed."""
    return await service.get_activity_feed(
        user_id=current_user.id,
        following_only=following_only,
        page=page,
        limit=limit
    )


# === UTILITY ENDPOINTS ===

@router.get("/share-url")
async def generate_share_url(
    content_type: str,
    content_id: str,
    platform: str = Query(..., regex="^(facebook|twitter|linkedin|whatsapp|email|copy)$")
):
    """Generate a share URL for different platforms."""
    # **MANUAL IMPLEMENTATION NEEDED**: Replace with your actual domain
    base_url = "https://yourdomain.com"  # Update this to your actual domain
    
    if content_type == "product":
        content_url = f"{base_url}/product/{content_id}"
        title = "Check out this amazing product on DealHunt!"
    elif content_type == "wishlist":
        content_url = f"{base_url}/wishlist/shared/{content_id}"
        title = "Check out my wishlist on DealHunt!"
    else:
        content_url = f"{base_url}/{content_type}/{content_id}"
        title = f"Check this out on DealHunt!"
    
    # Generate platform-specific URLs
    share_urls = {
        "facebook": f"https://www.facebook.com/sharer/sharer.php?u={content_url}",
        "twitter": f"https://twitter.com/intent/tweet?url={content_url}&text={title}",
        "linkedin": f"https://www.linkedin.com/sharing/share-offsite/?url={content_url}",
        "whatsapp": f"https://wa.me/?text={title} {content_url}",
        "email": f"mailto:?subject={title}&body=Check this out: {content_url}",
        "copy": content_url
    }
    
    return {
        "share_url": share_urls.get(platform, content_url),
        "content_url": content_url,
        "title": title
    }


@router.get("/stats/me")
async def get_my_social_stats(
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Get current user's social statistics."""
    profile = await service.get_user_profile(current_user.id)
    
    if not profile:
        return {
            "reviews_written": 0,
            "helpful_votes_received": 0,
            "followers": 0,
            "following": 0,
            "wishlists_shared": 0,
            "deals_shared": 0
        }
    
    return {
        "reviews_written": profile.review_count,
        "helpful_votes_received": profile.helpful_votes_received,
        "followers": profile.follower_count,
        "following": profile.following_count,
        "wishlists_shared": profile.wishlists_shared,
        "deals_shared": profile.deals_shared
    }


# === ADMIN ENDPOINTS (for content moderation) ===

@router.get("/admin/reviews/pending")
async def get_pending_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Get pending reviews for moderation. (Admin only)"""
    # **MANUAL IMPLEMENTATION NEEDED**: Add admin role check
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    skip = (page - 1) * limit
    cursor = service.reviews_collection.find({"status": "pending"}).skip(skip).limit(limit)
    reviews = await cursor.to_list(length=limit)
    
    total_count = await service.reviews_collection.count_documents({"status": "pending"})
    
    return {
        "reviews": reviews,
        "total_count": total_count,
        "page": page,
        "pages": (total_count + limit - 1) // limit
    }


@router.put("/admin/reviews/{review_id}/approve")
async def approve_review(
    review_id: str,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Approve a pending review. (Admin only)"""
    # **MANUAL IMPLEMENTATION NEEDED**: Add admin role check
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await service.reviews_collection.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": {"status": "approved"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return {"message": "Review approved"}


@router.put("/admin/reviews/{review_id}/reject")
async def reject_review(
    review_id: str,
    reason: str,
    current_user: User = Depends(get_current_active_user),
    service: SocialService = Depends(get_social_service)
):
    """Reject a pending review. (Admin only)"""
    # **MANUAL IMPLEMENTATION NEEDED**: Add admin role check
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await service.reviews_collection.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": {"status": "rejected", "rejection_reason": reason}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return {"message": "Review rejected"}