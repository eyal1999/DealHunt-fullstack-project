from datetime import timedelta, datetime
from typing import Any
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
import os
import uuid
from PIL import Image, ImageOps
import io
from bson import ObjectId

from app.auth.hashing import get_password_hash, verify_password
from app.auth.jwt import create_access_token, get_current_active_user
from app.config import settings
from app.db import users_collection, password_reset_collection
from app.models.db_models import Token, User, UserCreate, UserInDB, NotificationPreferences
from app.models.password_reset import PasswordResetRequest, PasswordResetConfirm, PasswordResetToken
from app.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=User)
async def register(user_data: UserCreate) -> Any:
    """Register a new user."""
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_dict = user_data.model_dump()
    
    # Remove password from dict and add hashed password
    plain_password = user_dict.pop("password")
    hashed_password = get_password_hash(plain_password)
    
    # Create UserInDB model with email auth provider
    user_db = UserInDB(
        email=user_dict["email"],
        full_name=user_dict["full_name"],
        hashed_password=hashed_password,
        auth_provider="email"  # Explicitly set for email registration
    )
    
    # Insert user into database
    result = await users_collection.insert_one(user_db.model_dump(by_alias=True))
    
    # Get newly created user
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    
    # Return user data (without hashed password)
    return User(
        id=str(created_user["_id"]),
        email=created_user["email"],
        full_name=created_user["full_name"],
        picture_url=created_user.get("picture_url"),
        auth_provider=created_user.get("auth_provider", "email"),
        created_at=created_user["created_at"],
        is_active=created_user["is_active"],
        last_login=created_user.get("last_login")
    )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """Authenticate and login a user."""
    
    # Find user by email
    user = await users_collection.find_one({"email": form_data.username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    user_obj = UserInDB(**user)
    if not user_obj.hashed_password or not verify_password(form_data.password, user_obj.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = await create_access_token(
        data={"sub": user_obj.email}, expires_delta=access_token_expires
    )
    
    # Create User response object
    user_response = User(
        id=str(user_obj.id),
        email=user_obj.email,
        full_name=user_obj.full_name,
        picture_url=user_obj.picture_url,
        auth_provider=user_obj.auth_provider,
        created_at=user_obj.created_at,
        is_active=user_obj.is_active,
        last_login=user_obj.last_login
    )
    
    # Return token and user info
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_active_user)) -> Any:
    """Get current user information."""
    return current_user

@router.post("/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload and update user's profile picture.
    """
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file size (max 5MB)
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    try:
        # Create uploads directory if it doesn't exist
        uploads_dir = "uploads/profile_pictures"
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Fix orientation based on EXIF data automatically
        image = ImageOps.exif_transpose(image)
        
        # Convert to RGB and resize to 300x300 for consistency
        image = image.convert('RGB')
        image = image.resize((300, 300), Image.Resampling.LANCZOS)
        
        # Save processed image
        image.save(file_path, 'JPEG', quality=85)
        
        # Create URL for the uploaded image
        picture_url = f"/uploads/profile_pictures/{unique_filename}"
        
        # Update user's profile picture in database
        await users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"picture_url": picture_url}}
        )
        
        return {
            "message": "Profile picture uploaded successfully",
            "picture_url": picture_url
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )

@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """
    Send password reset email to user.
    """
    # Check if user exists
    user = await users_collection.find_one({"email": request.email})
    
    # Always return success to prevent email enumeration attacks
    if not user:
        return {"message": "If an account with that email exists, we've sent a password reset link."}
    
    # Check if user has a password (Google-only users cannot reset password)
    if not user.get("hashed_password"):
        return {"message": "This account uses Google sign-in. Please sign in with Google instead."}
    
    # Generate secure reset token
    reset_token = secrets.token_urlsafe(32)
    
    # Create reset token document
    expires_at = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
    reset_doc = PasswordResetToken(
        email=request.email,
        token=reset_token,
        expires_at=expires_at
    )
    
    # Store in database
    await password_reset_collection.insert_one(reset_doc.model_dump(by_alias=True))
    
    # Send email
    try:
        await email_service.send_password_reset_email(request.email, reset_token)
    except Exception as e:
        print(f"Failed to send email: {e}")
        # In development, continue anyway
    
    return {"message": "If an account with that email exists, we've sent a password reset link."}

@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """
    Reset user password with token.
    """
    # Find and validate reset token
    reset_doc = await password_reset_collection.find_one({
        "token": request.token,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Find user
    user = await users_collection.find_one({"email": reset_doc["email"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Hash new password
    hashed_password = get_password_hash(request.new_password)
    
    # Update user password
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    # Mark token as used
    await password_reset_collection.update_one(
        {"_id": reset_doc["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

@router.put("/notification-preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update user's notification preferences.
    """
    # Update user preferences in database
    await users_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {
            "email_notifications": preferences.email_notifications,
            "price_drop_notifications": preferences.price_drop_notifications
        }}
    )
    
    return {
        "message": "Notification preferences updated successfully",
        "preferences": {
            "email_notifications": preferences.email_notifications,
            "price_drop_notifications": preferences.price_drop_notifications
        }
    }
