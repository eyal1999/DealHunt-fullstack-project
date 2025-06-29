"""
Social features models - reviews, sharing, likes, follows.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ReviewStatus(str, Enum):
    """Review status options."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class ShareType(str, Enum):
    """Types of shares."""
    PRODUCT = "product"
    WISHLIST = "wishlist"
    DEAL = "deal"
    REVIEW = "review"


class NotificationType(str, Enum):
    """Types of notifications."""
    PRICE_DROP = "price_drop"
    REVIEW_REPLY = "review_reply"
    WISHLIST_SHARED = "wishlist_shared"
    PRODUCT_BACK_IN_STOCK = "product_back_in_stock"
    NEW_FOLLOWER = "new_follower"
    DEAL_ALERT = "deal_alert"
    SYSTEM_UPDATE = "system_update"


class ProductReview(BaseModel):
    """Product review model."""
    id: Optional[str] = Field(None, description="Review ID")
    user_id: str = Field(..., description="User who wrote the review")
    product_id: str = Field(..., description="Product being reviewed")
    marketplace: str = Field(..., description="Product marketplace")
    
    # Review content
    rating: int = Field(..., ge=1, le=5, description="Star rating (1-5)")
    title: str = Field(..., min_length=5, max_length=100, description="Review title")
    content: str = Field(..., min_length=10, max_length=2000, description="Review content")
    
    # Review metadata
    verified_purchase: bool = Field(False, description="User purchased this product")
    helpful_votes: int = Field(0, description="Number of helpful votes")
    total_votes: int = Field(0, description="Total votes received")
    
    # Media attachments
    images: List[str] = Field(default_factory=list, description="Review image URLs")
    videos: List[str] = Field(default_factory=list, description="Review video URLs")
    
    # Status and moderation
    status: ReviewStatus = Field(ReviewStatus.PENDING, description="Review moderation status")
    flagged_count: int = Field(0, description="Number of times flagged")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now, description="Review creation time")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update time")
    verified_at: Optional[datetime] = Field(None, description="When review was verified")
    
    # User info (populated from user collection)
    user_name: Optional[str] = Field(None, description="Reviewer name")
    user_avatar: Optional[str] = Field(None, description="Reviewer avatar")
    user_review_count: Optional[int] = Field(None, description="User's total review count")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ReviewReply(BaseModel):
    """Reply to a product review."""
    id: Optional[str] = Field(None, description="Reply ID")
    review_id: str = Field(..., description="Parent review ID")
    user_id: str = Field(..., description="User who wrote the reply")
    content: str = Field(..., min_length=5, max_length=500, description="Reply content")
    
    # Metadata
    helpful_votes: int = Field(0, description="Helpful votes for this reply")
    is_seller_response: bool = Field(False, description="Whether this is from the seller")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now, description="Reply creation time")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update time")
    
    # User info
    user_name: Optional[str] = Field(None, description="Replier name")
    user_avatar: Optional[str] = Field(None, description="Replier avatar")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ReviewVote(BaseModel):
    """Vote on a review (helpful/not helpful)."""
    user_id: str = Field(..., description="User who voted")
    review_id: str = Field(..., description="Review being voted on")
    is_helpful: bool = Field(..., description="Whether vote is helpful or not")
    voted_at: datetime = Field(default_factory=datetime.now, description="Vote timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SocialShare(BaseModel):
    """Social sharing record."""
    id: Optional[str] = Field(None, description="Share ID")
    user_id: str = Field(..., description="User who shared")
    share_type: ShareType = Field(..., description="Type of content shared")
    
    # Content being shared
    content_id: str = Field(..., description="ID of content being shared")
    content_title: str = Field(..., description="Title of shared content")
    content_url: str = Field(..., description="URL of shared content")
    content_image: Optional[str] = Field(None, description="Image for shared content")
    
    # Share details
    platform: str = Field(..., description="Platform shared to (facebook, twitter, etc.)")
    message: Optional[str] = Field(None, description="Custom message with share")
    
    # Tracking
    clicks: int = Field(0, description="Number of clicks on shared content")
    shared_at: datetime = Field(default_factory=datetime.now, description="Share timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserFollow(BaseModel):
    """User following relationship."""
    follower_id: str = Field(..., description="User who is following")
    followed_id: str = Field(..., description="User being followed")
    followed_at: datetime = Field(default_factory=datetime.now, description="Follow timestamp")
    
    # Follow metadata
    notifications_enabled: bool = Field(True, description="Receive notifications from this user")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserProfile(BaseModel):
    """Extended user profile for social features."""
    user_id: str = Field(..., description="User ID")
    
    # Public profile info
    display_name: str = Field(..., description="Public display name")
    bio: Optional[str] = Field(None, max_length=300, description="User bio")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    location: Optional[str] = Field(None, description="User location")
    website: Optional[str] = Field(None, description="User website")
    
    # Social stats
    follower_count: int = Field(0, description="Number of followers")
    following_count: int = Field(0, description="Number of users following")
    review_count: int = Field(0, description="Number of reviews written")
    helpful_votes_received: int = Field(0, description="Total helpful votes on reviews")
    
    # Activity stats
    wishlists_shared: int = Field(0, description="Number of wishlists shared")
    deals_shared: int = Field(0, description="Number of deals shared")
    badges: List[str] = Field(default_factory=list, description="User badges/achievements")
    
    # Privacy settings
    profile_public: bool = Field(True, description="Whether profile is public")
    show_wishlists: bool = Field(True, description="Show wishlists on profile")
    show_reviews: bool = Field(True, description="Show reviews on profile")
    
    # Timestamps
    joined_at: datetime = Field(default_factory=datetime.now, description="Profile creation time")
    last_active: datetime = Field(default_factory=datetime.now, description="Last activity time")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Notification(BaseModel):
    """User notification model."""
    id: Optional[str] = Field(None, description="Notification ID")
    user_id: str = Field(..., description="User receiving notification")
    
    # Notification content
    type: NotificationType = Field(..., description="Type of notification")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    
    # Action and data
    action_url: Optional[str] = Field(None, description="URL to navigate when clicked")
    action_data: Dict[str, Any] = Field(default_factory=dict, description="Additional action data")
    
    # Sender info (for user-generated notifications)
    sender_id: Optional[str] = Field(None, description="User who triggered notification")
    sender_name: Optional[str] = Field(None, description="Sender display name")
    sender_avatar: Optional[str] = Field(None, description="Sender avatar URL")
    
    # Status
    read: bool = Field(False, description="Whether notification has been read")
    delivered: bool = Field(False, description="Whether notification was delivered")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now, description="Notification creation time")
    read_at: Optional[datetime] = Field(None, description="When notification was read")
    expires_at: Optional[datetime] = Field(None, description="When notification expires")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ActivityFeed(BaseModel):
    """User activity feed item."""
    id: Optional[str] = Field(None, description="Activity ID")
    user_id: str = Field(..., description="User who performed the activity")
    
    # Activity details
    activity_type: str = Field(..., description="Type of activity")
    title: str = Field(..., description="Activity title")
    description: str = Field(..., description="Activity description")
    
    # Related content
    content_type: Optional[str] = Field(None, description="Type of related content")
    content_id: Optional[str] = Field(None, description="ID of related content")
    content_url: Optional[str] = Field(None, description="URL of related content")
    content_image: Optional[str] = Field(None, description="Image for related content")
    
    # Visibility
    public: bool = Field(True, description="Whether activity is public")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now, description="Activity timestamp")
    
    # User info
    user_name: Optional[str] = Field(None, description="User display name")
    user_avatar: Optional[str] = Field(None, description="User avatar")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ReportContent(BaseModel):
    """Content reporting model."""
    id: Optional[str] = Field(None, description="Report ID")
    reporter_id: str = Field(..., description="User who made the report")
    
    # Content being reported
    content_type: str = Field(..., description="Type of content (review, comment, profile)")
    content_id: str = Field(..., description="ID of reported content")
    content_owner_id: str = Field(..., description="Owner of reported content")
    
    # Report details
    reason: str = Field(..., description="Reason for report")
    description: Optional[str] = Field(None, description="Additional description")
    
    # Status
    status: str = Field("pending", description="Report status")
    resolved_by: Optional[str] = Field(None, description="Admin who resolved")
    resolution: Optional[str] = Field(None, description="Resolution details")
    
    # Timestamps
    reported_at: datetime = Field(default_factory=datetime.now, description="Report timestamp")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }