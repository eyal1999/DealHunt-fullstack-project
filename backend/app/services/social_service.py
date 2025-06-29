"""
Social features service - reviews, sharing, follows, notifications.
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.social import (
    ProductReview, ReviewReply, ReviewVote, SocialShare, UserFollow,
    UserProfile, Notification, ActivityFeed, ReportContent,
    ReviewStatus, ShareType, NotificationType
)


class SocialService:
    """Service for managing social features."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.reviews_collection = database.reviews
        self.review_replies_collection = database.review_replies
        self.review_votes_collection = database.review_votes
        self.shares_collection = database.social_shares
        self.follows_collection = database.user_follows
        self.profiles_collection = database.user_profiles
        self.notifications_collection = database.notifications
        self.activity_feed_collection = database.activity_feed
        self.reports_collection = database.content_reports
    
    # Review Management
    async def create_review(self, user_id: str, review_data: Dict[str, Any]) -> ProductReview:
        """Create a new product review."""
        # Get user info for review
        user_profile = await self.get_user_profile(user_id)
        
        review = ProductReview(
            user_id=user_id,
            product_id=review_data["product_id"],
            marketplace=review_data["marketplace"],
            rating=review_data["rating"],
            title=review_data["title"],
            content=review_data["content"],
            verified_purchase=review_data.get("verified_purchase", False),
            images=review_data.get("images", []),
            videos=review_data.get("videos", []),
            user_name=user_profile.display_name if user_profile else "Anonymous",
            user_avatar=user_profile.avatar_url if user_profile else None,
            user_review_count=(user_profile.review_count if user_profile else 0) + 1
        )
        
        # Insert review
        result = await self.reviews_collection.insert_one(review.model_dump())
        review.id = str(result.inserted_id)
        
        # Update user profile review count
        await self._update_user_review_count(user_id, 1)
        
        # Add to activity feed
        await self._add_activity(user_id, "review_created", f"Reviewed a product", {
            "product_id": review_data["product_id"],
            "rating": review_data["rating"]
        })
        
        return review
    
    async def get_product_reviews(
        self, 
        product_id: str, 
        marketplace: str,
        page: int = 1,
        limit: int = 10,
        sort_by: str = "newest"
    ) -> Dict[str, Any]:
        """Get reviews for a product."""
        skip = (page - 1) * limit
        
        # Build sort criteria
        sort_criteria = {}
        if sort_by == "newest":
            sort_criteria = {"created_at": -1}
        elif sort_by == "oldest":
            sort_criteria = {"created_at": 1}
        elif sort_by == "highest_rated":
            sort_criteria = {"rating": -1, "created_at": -1}
        elif sort_by == "lowest_rated":
            sort_criteria = {"rating": 1, "created_at": -1}
        elif sort_by == "most_helpful":
            sort_criteria = {"helpful_votes": -1, "created_at": -1}
        
        # Get reviews
        cursor = self.reviews_collection.find({
            "product_id": product_id,
            "marketplace": marketplace,
            "status": ReviewStatus.APPROVED
        }).sort(list(sort_criteria.items())).skip(skip).limit(limit)
        
        reviews = await cursor.to_list(length=limit)
        
        # Get total count
        total_count = await self.reviews_collection.count_documents({
            "product_id": product_id,
            "marketplace": marketplace,
            "status": ReviewStatus.APPROVED
        })
        
        # Calculate rating summary
        rating_summary = await self._calculate_rating_summary(product_id, marketplace)
        
        # Convert to ProductReview objects
        review_objects = []
        for review_doc in reviews:
            review_doc["id"] = str(review_doc["_id"])
            review_objects.append(ProductReview(**review_doc))
        
        return {
            "reviews": review_objects,
            "total_count": total_count,
            "page": page,
            "pages": (total_count + limit - 1) // limit,
            "rating_summary": rating_summary
        }
    
    async def vote_on_review(self, user_id: str, review_id: str, is_helpful: bool) -> bool:
        """Vote on a review's helpfulness."""
        # Check if user already voted
        existing_vote = await self.review_votes_collection.find_one({
            "user_id": user_id,
            "review_id": review_id
        })
        
        if existing_vote:
            # Update existing vote
            old_helpful = existing_vote["is_helpful"]
            await self.review_votes_collection.update_one(
                {"_id": existing_vote["_id"]},
                {"$set": {"is_helpful": is_helpful, "voted_at": datetime.now()}}
            )
            
            # Update review vote counts
            if old_helpful != is_helpful:
                if is_helpful:
                    # Changed from not helpful to helpful
                    await self.reviews_collection.update_one(
                        {"_id": ObjectId(review_id)},
                        {"$inc": {"helpful_votes": 1}}
                    )
                else:
                    # Changed from helpful to not helpful
                    await self.reviews_collection.update_one(
                        {"_id": ObjectId(review_id)},
                        {"$inc": {"helpful_votes": -1}}
                    )
        else:
            # Create new vote
            vote = ReviewVote(
                user_id=user_id,
                review_id=review_id,
                is_helpful=is_helpful
            )
            await self.review_votes_collection.insert_one(vote.model_dump())
            
            # Update review counts
            update_data = {"$inc": {"total_votes": 1}}
            if is_helpful:
                update_data["$inc"]["helpful_votes"] = 1
            
            await self.reviews_collection.update_one(
                {"_id": ObjectId(review_id)},
                update_data
            )
        
        return True
    
    async def reply_to_review(self, user_id: str, review_id: str, content: str) -> ReviewReply:
        """Reply to a review."""
        user_profile = await self.get_user_profile(user_id)
        
        reply = ReviewReply(
            review_id=review_id,
            user_id=user_id,
            content=content,
            user_name=user_profile.display_name if user_profile else "Anonymous",
            user_avatar=user_profile.avatar_url if user_profile else None
        )
        
        result = await self.review_replies_collection.insert_one(reply.model_dump())
        reply.id = str(result.inserted_id)
        
        # Notify original reviewer
        review = await self.reviews_collection.find_one({"_id": ObjectId(review_id)})
        if review and review["user_id"] != user_id:
            await self._create_notification(
                user_id=review["user_id"],
                notification_type=NotificationType.REVIEW_REPLY,
                title="Someone replied to your review",
                message=f"{user_profile.display_name if user_profile else 'Someone'} replied to your review",
                sender_id=user_id,
                action_url=f"/product/{review['marketplace']}/{review['product_id']}#review-{review_id}"
            )
        
        return reply
    
    # Social Sharing
    async def create_share(self, user_id: str, share_data: Dict[str, Any]) -> SocialShare:
        """Create a social share record."""
        share = SocialShare(
            user_id=user_id,
            share_type=share_data["share_type"],
            content_id=share_data["content_id"],
            content_title=share_data["content_title"],
            content_url=share_data["content_url"],
            content_image=share_data.get("content_image"),
            platform=share_data["platform"],
            message=share_data.get("message")
        )
        
        result = await self.shares_collection.insert_one(share.model_dump())
        share.id = str(result.inserted_id)
        
        # Add to activity feed
        await self._add_activity(user_id, "content_shared", f"Shared {share_data['share_type']}", {
            "content_id": share_data["content_id"],
            "platform": share_data["platform"]
        })
        
        return share
    
    async def track_share_click(self, share_id: str) -> bool:
        """Track a click on shared content."""
        result = await self.shares_collection.update_one(
            {"_id": ObjectId(share_id)},
            {"$inc": {"clicks": 1}}
        )
        return result.modified_count > 0
    
    # User Following
    async def follow_user(self, follower_id: str, followed_id: str) -> bool:
        """Follow another user."""
        if follower_id == followed_id:
            return False
        
        # Check if already following
        existing = await self.follows_collection.find_one({
            "follower_id": follower_id,
            "followed_id": followed_id
        })
        
        if existing:
            return False
        
        # Create follow relationship
        follow = UserFollow(
            follower_id=follower_id,
            followed_id=followed_id
        )
        
        await self.follows_collection.insert_one(follow.model_dump())
        
        # Update follower/following counts
        await self._update_follow_counts(follower_id, followed_id, 1)
        
        # Notify followed user
        follower_profile = await self.get_user_profile(follower_id)
        await self._create_notification(
            user_id=followed_id,
            notification_type=NotificationType.NEW_FOLLOWER,
            title="New Follower",
            message=f"{follower_profile.display_name if follower_profile else 'Someone'} started following you",
            sender_id=follower_id,
            action_url=f"/profile/{follower_id}"
        )
        
        # Add to activity feed
        await self._add_activity(follower_id, "user_followed", f"Started following a user", {
            "followed_id": followed_id
        })
        
        return True
    
    async def unfollow_user(self, follower_id: str, followed_id: str) -> bool:
        """Unfollow a user."""
        result = await self.follows_collection.delete_one({
            "follower_id": follower_id,
            "followed_id": followed_id
        })
        
        if result.deleted_count > 0:
            # Update follower/following counts
            await self._update_follow_counts(follower_id, followed_id, -1)
            return True
        
        return False
    
    async def get_user_followers(self, user_id: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Get followers of a user."""
        skip = (page - 1) * limit
        
        # Get follow relationships
        cursor = self.follows_collection.find({"followed_id": user_id}).skip(skip).limit(limit)
        follows = await cursor.to_list(length=limit)
        
        # Get follower profiles
        follower_ids = [follow["follower_id"] for follow in follows]
        profiles = await self._get_user_profiles_by_ids(follower_ids)
        
        total_count = await self.follows_collection.count_documents({"followed_id": user_id})
        
        return {
            "followers": profiles,
            "total_count": total_count,
            "page": page,
            "pages": (total_count + limit - 1) // limit
        }
    
    # User Profiles
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile."""
        profile_doc = await self.profiles_collection.find_one({"user_id": user_id})
        if profile_doc:
            profile_doc["user_id"] = user_id  # Ensure user_id is set
            return UserProfile(**profile_doc)
        return None
    
    async def create_or_update_profile(self, user_id: str, profile_data: Dict[str, Any]) -> UserProfile:
        """Create or update user profile."""
        existing = await self.profiles_collection.find_one({"user_id": user_id})
        
        if existing:
            # Update existing profile
            update_data = {k: v for k, v in profile_data.items() if v is not None}
            update_data["last_active"] = datetime.now()
            
            await self.profiles_collection.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
            
            # Get updated profile
            updated_doc = await self.profiles_collection.find_one({"user_id": user_id})
            return UserProfile(**updated_doc)
        else:
            # Create new profile
            profile = UserProfile(
                user_id=user_id,
                display_name=profile_data.get("display_name", "User"),
                bio=profile_data.get("bio"),
                avatar_url=profile_data.get("avatar_url"),
                location=profile_data.get("location"),
                website=profile_data.get("website")
            )
            
            await self.profiles_collection.insert_one(profile.model_dump())
            return profile
    
    # Notifications
    async def get_user_notifications(
        self, 
        user_id: str, 
        unread_only: bool = False,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get notifications for a user."""
        skip = (page - 1) * limit
        
        query = {"user_id": user_id}
        if unread_only:
            query["read"] = False
        
        # Get notifications
        cursor = self.notifications_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        notifications = await cursor.to_list(length=limit)
        
        # Convert to Notification objects
        notification_objects = []
        for notif_doc in notifications:
            notif_doc["id"] = str(notif_doc["_id"])
            notification_objects.append(Notification(**notif_doc))
        
        total_count = await self.notifications_collection.count_documents(query)
        unread_count = await self.notifications_collection.count_documents({
            "user_id": user_id,
            "read": False
        })
        
        return {
            "notifications": notification_objects,
            "total_count": total_count,
            "unread_count": unread_count,
            "page": page,
            "pages": (total_count + limit - 1) // limit
        }
    
    async def mark_notification_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a notification as read."""
        result = await self.notifications_collection.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"read": True, "read_at": datetime.now()}}
        )
        return result.modified_count > 0
    
    async def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        result = await self.notifications_collection.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True, "read_at": datetime.now()}}
        )
        return result.modified_count
    
    # Activity Feed
    async def get_activity_feed(
        self, 
        user_id: str, 
        following_only: bool = True,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get activity feed for a user."""
        skip = (page - 1) * limit
        
        if following_only:
            # Get users the current user follows
            follows = await self.follows_collection.find({"follower_id": user_id}).to_list(length=1000)
            following_ids = [follow["followed_id"] for follow in follows]
            following_ids.append(user_id)  # Include own activities
            
            query = {"user_id": {"$in": following_ids}, "public": True}
        else:
            query = {"public": True}
        
        # Get activities
        cursor = self.activity_feed_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        activities = await cursor.to_list(length=limit)
        
        # Convert to ActivityFeed objects
        activity_objects = []
        for activity_doc in activities:
            activity_doc["id"] = str(activity_doc["_id"])
            activity_objects.append(ActivityFeed(**activity_doc))
        
        total_count = await self.activity_feed_collection.count_documents(query)
        
        return {
            "activities": activity_objects,
            "total_count": total_count,
            "page": page,
            "pages": (total_count + limit - 1) // limit
        }
    
    # Helper Methods
    async def _calculate_rating_summary(self, product_id: str, marketplace: str) -> Dict[str, Any]:
        """Calculate rating summary for a product."""
        pipeline = [
            {
                "$match": {
                    "product_id": product_id,
                    "marketplace": marketplace,
                    "status": ReviewStatus.APPROVED
                }
            },
            {
                "$group": {
                    "_id": None,
                    "average_rating": {"$avg": "$rating"},
                    "total_reviews": {"$sum": 1},
                    "rating_breakdown": {
                        "$push": "$rating"
                    }
                }
            }
        ]
        
        result = await self.reviews_collection.aggregate(pipeline).to_list(length=1)
        
        if not result:
            return {
                "average_rating": 0,
                "total_reviews": 0,
                "rating_distribution": {str(i): 0 for i in range(1, 6)}
            }
        
        data = result[0]
        ratings = data["rating_breakdown"]
        
        # Calculate rating distribution
        distribution = {str(i): 0 for i in range(1, 6)}
        for rating in ratings:
            distribution[str(rating)] += 1
        
        return {
            "average_rating": round(data["average_rating"], 1),
            "total_reviews": data["total_reviews"],
            "rating_distribution": distribution
        }
    
    async def _update_user_review_count(self, user_id: str, delta: int):
        """Update user's review count."""
        await self.profiles_collection.update_one(
            {"user_id": user_id},
            {"$inc": {"review_count": delta}},
            upsert=True
        )
    
    async def _update_follow_counts(self, follower_id: str, followed_id: str, delta: int):
        """Update follower/following counts."""
        await asyncio.gather(
            self.profiles_collection.update_one(
                {"user_id": follower_id},
                {"$inc": {"following_count": delta}},
                upsert=True
            ),
            self.profiles_collection.update_one(
                {"user_id": followed_id},
                {"$inc": {"follower_count": delta}},
                upsert=True
            )
        )
    
    async def _create_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        sender_id: Optional[str] = None,
        action_url: Optional[str] = None,
        action_data: Dict[str, Any] = None
    ) -> Notification:
        """Create a new notification."""
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
        
        return notification
    
    async def _add_activity(
        self,
        user_id: str,
        activity_type: str,
        title: str,
        data: Dict[str, Any] = None
    ):
        """Add an activity to the feed."""
        user_profile = await self.get_user_profile(user_id)
        
        activity = ActivityFeed(
            user_id=user_id,
            activity_type=activity_type,
            title=title,
            description=f"{user_profile.display_name if user_profile else 'User'} {title.lower()}",
            user_name=user_profile.display_name if user_profile else None,
            user_avatar=user_profile.avatar_url if user_profile else None
        )
        
        if data:
            activity.content_type = data.get("content_type")
            activity.content_id = data.get("content_id")
            activity.content_url = data.get("content_url")
            activity.content_image = data.get("content_image")
        
        await self.activity_feed_collection.insert_one(activity.model_dump())
    
    async def _get_user_profiles_by_ids(self, user_ids: List[str]) -> List[UserProfile]:
        """Get user profiles by list of IDs."""
        cursor = self.profiles_collection.find({"user_id": {"$in": user_ids}})
        profile_docs = await cursor.to_list(length=len(user_ids))
        
        profiles = []
        for doc in profile_docs:
            profiles.append(UserProfile(**doc))
        
        return profiles