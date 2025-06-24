from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status, Depends
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
from bson import ObjectId

from app.auth.jwt import create_access_token, get_current_active_user
from app.config import settings
from app.db import users_collection
from app.models.db_models import Token, User, UserInDB

router = APIRouter(prefix="/auth/google", tags=["Google Authentication"])

# ── Pydantic Models for Google Auth ──

class GoogleTokenRequest(BaseModel):
    """Request model for Google token verification."""
    id_token: str  # The ID token from Google
    access_token: Optional[str] = None  # Optional: Google access token

class GoogleUserInfo(BaseModel):
    """Google user information model."""
    id: str  # Google user ID
    email: str
    name: str
    picture: Optional[str] = None
    email_verified: bool = True

# ── Google OAuth Configuration ──

# Get Google OAuth credentials from settings
try:
    GOOGLE_CLIENT_ID = settings.google_client_id
    GOOGLE_CLIENT_SECRET = settings.google_client_secret
except Exception as e:
    print("⚠️  Warning: Google OAuth credentials not configured properly.")
    GOOGLE_CLIENT_ID = None
    GOOGLE_CLIENT_SECRET = None

# ── Helper Functions ──

async def verify_google_token(id_token_string: str) -> GoogleUserInfo:
    """
    Verify Google ID token and extract user information.
    
    This function validates the Google ID token and returns user data.
    In a real application, you'd want to cache the Google certificates
    for better performance.
    """
    try:
        # Verify the token with Google
        # This automatically validates the token signature, expiration, etc.
        idinfo = id_token.verify_oauth2_token(
            id_token_string, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Verify the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        # Extract user information
        return GoogleUserInfo(
            id=idinfo['sub'],  # Google user ID (unique identifier)
            email=idinfo['email'],
            name=idinfo.get('name', ''),
            picture=idinfo.get('picture'),
            email_verified=idinfo.get('email_verified', False)
        )
        
    except ValueError as e:
        # Token verification failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        # Other errors (network, etc.)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification failed: {str(e)}"
        )

async def get_existing_google_user(google_user: GoogleUserInfo) -> UserInDB:
    """
    Get existing user by Google information. Used for sign-in (no auto-creation).
    
    This function handles the logic of:
    1. Finding existing users by Google ID
    2. Finding existing users by email (for account linking)
    3. Does NOT create new users - raises error instead
    """
    
    # First, try to find user by Google ID
    existing_google_user = await users_collection.find_one({
        "google_id": google_user.id
    })
    
    if existing_google_user:
        # User exists with this Google ID - update last login and return
        await users_collection.update_one(
            {"_id": existing_google_user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        return UserInDB(**existing_google_user)
    
    # Check if user exists with this email (for account linking)
    existing_email_user = await users_collection.find_one({
        "email": google_user.email
    })
    
    if existing_email_user:
        # User exists with this email but no Google ID
        # Link the Google account to existing user
        updated_user = {
            **existing_email_user,
            "google_id": google_user.id,
            "picture_url": google_user.picture,
            "auth_provider": "both",  # User can now login with email OR Google
            "last_login": datetime.utcnow()
        }
        
        await users_collection.update_one(
            {"_id": existing_email_user["_id"]},
            {"$set": {
                "google_id": google_user.id,
                "picture_url": google_user.picture,
                "auth_provider": "both",
                "last_login": datetime.utcnow()
            }}
        )
        
        return UserInDB(**updated_user)
    
    # No existing user found - raise error for sign-in
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No account found with email {google_user.email}. Please register first or use a different sign-in method."
    )

async def create_google_user(google_user: GoogleUserInfo) -> UserInDB:
    """
    Create new user from Google information. Used for registration.
    
    This function:
    1. Checks if user already exists (raises error if they do)
    2. Creates new user from Google data
    """
    
    # Check if user already exists by Google ID
    existing_google_user = await users_collection.find_one({
        "google_id": google_user.id
    })
    
    if existing_google_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this Google account already exists. Please sign in instead."
        )
    
    # Check if user exists with this email
    existing_email_user = await users_collection.find_one({
        "email": google_user.email
    })
    
    if existing_email_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email {google_user.email} already exists. Please sign in instead or use a different email."
        )
    
    # Create new Google user
    new_user = UserInDB(
        email=google_user.email,
        full_name=google_user.name,
        google_id=google_user.id,
        picture_url=google_user.picture,
        auth_provider="google",
        hashed_password=None,  # Google users don't have passwords
        is_active=True,
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow()
    )
    
    # Insert new user into database
    result = await users_collection.insert_one(new_user.model_dump(by_alias=True))
    
    # Get the created user with the new _id
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    
    return UserInDB(**created_user)

# ── API Endpoints ──

@router.post("/signin", response_model=Token)
async def google_signin(token_request: GoogleTokenRequest) -> Any:
    """
    Sign in existing user with Google ID token.
    
    This endpoint:
    1. Verifies the Google ID token
    2. Gets existing user from our database (does NOT create new users)
    3. Returns our own JWT token for subsequent API calls
    
    If no user exists, returns 404 error asking them to register first.
    """
    
    # Verify the Google token and get user info
    google_user = await verify_google_token(token_request.id_token)
    
    # Check if email is verified
    if not google_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google email not verified"
        )
    
    # Get existing user (will raise 404 if user doesn't exist)
    user_in_db = await get_existing_google_user(google_user)
    
    # Check if user account is active
    if not user_in_db.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is disabled"
        )
    
    # Create our own JWT token for this user
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = await create_access_token(
        data={"sub": user_in_db.email},
        expires_delta=access_token_expires
    )
    
    # Convert to public User model (no sensitive data)
    user_response = User(
        id=str(user_in_db.id),
        email=user_in_db.email,
        full_name=user_in_db.full_name,
        picture_url=user_in_db.picture_url,
        auth_provider=user_in_db.auth_provider,
        is_active=user_in_db.is_active,
        created_at=user_in_db.created_at,
        last_login=user_in_db.last_login
    )
    
    # Return token and user data
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.post("/register", response_model=Token)
async def google_register(token_request: GoogleTokenRequest) -> Any:
    """
    Register new user with Google ID token.
    
    This endpoint:
    1. Verifies the Google ID token
    2. Creates new user in our database (does NOT sign in existing users)
    3. Returns our own JWT token for subsequent API calls
    
    If user already exists, returns 400 error asking them to sign in instead.
    """
    
    # Verify the Google token and get user info
    google_user = await verify_google_token(token_request.id_token)
    
    # Check if email is verified
    if not google_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google email not verified"
        )
    
    # Create new user (will raise 400 if user already exists)
    user_in_db = await create_google_user(google_user)
    
    # Create our own JWT token for this user
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = await create_access_token(
        data={"sub": user_in_db.email},
        expires_delta=access_token_expires
    )
    
    # Convert to public User model (no sensitive data)
    user_response = User(
        id=str(user_in_db.id),
        email=user_in_db.email,
        full_name=user_in_db.full_name,
        picture_url=user_in_db.picture_url,
        auth_provider=user_in_db.auth_provider,
        is_active=user_in_db.is_active,
        created_at=user_in_db.created_at,
        last_login=user_in_db.last_login
    )
    
    # Return token and user data
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.get("/config")
async def get_google_config():
    """
    Get Google OAuth configuration for frontend.
    
    Returns the Google Client ID that the frontend needs
    for the Google Sign-In button.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    return {
        "google_client_id": GOOGLE_CLIENT_ID,
        "configured": True
    }

# ── Account Linking Endpoint (Optional) ──

@router.post("/link")
async def link_google_account(
    token_request: GoogleTokenRequest,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Link Google account to existing authenticated user.
    
    This allows users who registered with email/password
    to later link their Google account for convenience.
    """
    
    # Verify the Google token
    google_user = await verify_google_token(token_request.id_token)
    
    # Check if this Google ID is already linked to another account
    existing_google_user = await users_collection.find_one({
        "google_id": google_user.id
    })
    
    if existing_google_user and str(existing_google_user["_id"]) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This Google account is already linked to another user"
        )
    
    # Check if emails match (security measure)
    if google_user.email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email must match your current account email"
        )
    
    # Link the Google account
    await users_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {
            "google_id": google_user.id,
            "picture_url": google_user.picture,
            "auth_provider": "both"
        }}
    )
    
    return {"message": "Google account linked successfully"}

@router.delete("/unlink")
async def unlink_google_account(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Unlink Google account from current user.
    
    Note: Users can only unlink if they have a password set,
    otherwise they'd be locked out of their account.
    """
    
    # Get full user data to check if they have a password
    user_in_db = await users_collection.find_one({"_id": ObjectId(current_user.id)})
    
    if not user_in_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has a password set
    if not user_in_db.get("hashed_password"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unlink Google account: no password set. Please set a password first."
        )
    
    # Unlink Google account
    await users_collection.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$unset": {
            "google_id": "",
            "picture_url": ""
        },
        "$set": {
            "auth_provider": "email"
        }}
    )
    
    return {"message": "Google account unlinked successfully"}