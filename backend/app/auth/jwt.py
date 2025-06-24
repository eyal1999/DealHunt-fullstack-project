from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError

from app.config import settings
from app.models.db_models import TokenData, User, UserInDB
from app.db import users_collection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT token."""
    to_encode = data.copy()
    
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta 
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Validate token and return current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT token
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        
        # Extract email from token
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        # Create token data
        token_data = TokenData(email=email, exp=payload.get("exp"))
    except (JWTError, ValidationError):
        raise credentials_exception
    
    # Find user in database
    user_dict = await users_collection.find_one({"email": token_data.email})
    if user_dict is None:
        raise credentials_exception
    
    # Convert to UserInDB model
    user_in_db = UserInDB(**user_dict)
    
    # Convert to User model (without password hash) with proper field handling
    user = User(
        id=str(user_in_db.id),
        email=user_in_db.email,
        full_name=user_in_db.full_name,
        picture_url=user_in_db.picture_url,
        auth_provider=user_in_db.auth_provider,
        created_at=user_in_db.created_at,
        is_active=user_in_db.is_active,
        last_login=user_in_db.last_login
    )
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Verify the user is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user