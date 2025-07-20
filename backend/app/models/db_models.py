from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId

class PyObjectId(ObjectId):
    """Custom ObjectId for Pydantic v2."""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema: Dict[str, Any], model: Any) -> Dict[str, Any]:
        """Updated method for Pydantic v2."""
        field_schema.update(type="string")
        return field_schema

# ── Authentication Models ──────────────────────────────────────

class UserCreate(BaseModel):
    """Model for user registration data."""
    email: EmailStr
    full_name: str
    password: str  # Only for regular registration, not Google

class GoogleUserCreate(BaseModel):
    """Model for Google user registration data."""
    email: EmailStr
    full_name: str
    google_id: str
    picture_url: Optional[str] = None

class UserInDB(BaseModel):
    """Model for user data stored in database."""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    full_name: str
    
    # Traditional auth fields (optional for Google users)
    hashed_password: Optional[str] = None
    
    # Google auth fields (optional for regular users)
    google_id: Optional[str] = None
    picture_url: Optional[str] = None
    
    # Account metadata
    auth_provider: str = "email"  # "email" or "google" or "both"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # Email verification fields
    email_verified: bool = False
    verification_token: Optional[str] = None
    verification_token_expires: Optional[datetime] = None
    verification_sent_at: Optional[datetime] = None
    
    # Email notification preferences
    email_notifications: bool = True
    price_drop_notifications: bool = True
    
    # User activity and preferences
    search_history: List[str] = Field(default_factory=list)
    updated_at: Optional[datetime] = None

class User(BaseModel):
    """Model for user data returned to client (public data only)."""
    id: str
    email: EmailStr
    full_name: str
    picture_url: Optional[str] = None
    auth_provider: str = "email"  # Add default value
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    email_verified: bool = False
    email_notifications: bool = True
    price_drop_notifications: bool = True

class Token(BaseModel):
    """Model for authentication token response."""
    access_token: str
    token_type: str = "bearer"
    user: User

class TokenData(BaseModel):
    """Model for token payload data."""
    email: str
    exp: Optional[int] = None

# ── Wishlist Models ────────────────────────────────────────────

class WishlistItem(BaseModel):
    """Model for wishlist item creation."""
    product_id: str
    marketplace: str
    title: str
    original_price: float
    sale_price: float
    image: str
    detail_url: str
    affiliate_link: str

class WishlistItemOut(BaseModel):
    """Model for wishlist item response."""
    id: str
    product_id: str
    marketplace: str
    title: str
    original_price: float
    sale_price: float
    image: str
    detail_url: str
    affiliate_link: str
    added_at: datetime
    
    # Price tracking for notifications
    last_checked_price: Optional[float] = None
    price_history: List[Dict[str, Any]] = Field(default_factory=list)

# ── Notification Models ────────────────────────────────────────

class NotificationPreferences(BaseModel):
    """Model for updating notification preferences."""
    email_notifications: bool
    price_drop_notifications: bool