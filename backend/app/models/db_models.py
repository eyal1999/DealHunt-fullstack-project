"""Database models using Pydantic v2."""
from datetime import datetime
from typing import List, Optional, Any, Annotated
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from bson import ObjectId

# ObjectId validator
def validate_object_id(v: Any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError(f"Invalid ObjectId: {v}")

# Type for ObjectId fields
PydanticObjectId = Annotated[ObjectId, BeforeValidator(validate_object_id)]

# User models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: PydanticObjectId = Field(default_factory=ObjectId, alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={"example": {"email": "user@example.com"}}
    )
    
    # Method to convert ObjectId to str for JSON responses
    def model_dump(self, **kwargs):
        dump = super().model_dump(**kwargs)
        if "_id" in dump:
            dump["_id"] = str(dump["_id"])
        if "id" in dump:
            dump["id"] = str(dump["id"])
        return dump

class User(UserBase):
    id: str
    created_at: datetime
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

# Wishlist models
class WishlistItem(BaseModel):
    id: PydanticObjectId = Field(default_factory=ObjectId, alias="_id")
    user_id: PydanticObjectId
    product_id: str
    marketplace: str
    title: str
    original_price: float
    sale_price: float
    image: str
    detail_url: str
    affiliate_link: str
    added_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )
    
    # Method to convert ObjectId to str for JSON responses
    def model_dump(self, **kwargs):
        dump = super().model_dump(**kwargs)
        if "_id" in dump:
            dump["_id"] = str(dump["_id"])
        if "id" in dump:
            dump["id"] = str(dump["id"])
        if "user_id" in dump:
            dump["user_id"] = str(dump["user_id"])
        return dump

class WishlistItemOut(BaseModel):
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
    
    model_config = ConfigDict(from_attributes=True)

# Token models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None
    exp: Optional[datetime] = None