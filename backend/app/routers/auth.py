from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.auth.hashing import get_password_hash, verify_password
from app.auth.jwt import create_access_token, get_current_active_user
from app.config import settings
from app.db import users_collection
from app.models.db_models import Token, User, UserCreate, UserInDB

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