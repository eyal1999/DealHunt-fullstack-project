# backend/app/main.py
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import asyncio

import logging

from app.routers import search, auth, wishlist, google_auth, admin, images, price_tracking, user_activity, enhanced_wishlist, recommendations, social, realtime_notifications, analytics, internationalization, deal_hunting, user_management, user, smart_recommendations
from app.services.price_monitor import price_monitor
from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable for database
database = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting up...")
    logger.info(f"Database name: {settings.db_name}")
    await connect_to_mongo()
    
    # Start price monitoring as a background task
    logger.info("Starting price monitoring service...")
    price_monitoring_task = asyncio.create_task(price_monitor.start_monitoring())
    app.price_monitoring_task = price_monitoring_task
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    
    # Stop price monitoring
    logger.info("Stopping price monitoring service...")
    price_monitor.stop_monitoring()
    if hasattr(app, 'price_monitoring_task'):
        app.price_monitoring_task.cancel()
        try:
            await app.price_monitoring_task
        except asyncio.CancelledError:
            logger.info("Price monitoring task cancelled")
    
    await close_mongo_connection()

app = FastAPI(
    title="DealHunt app",
    description="FastAPI application with MongoDB and Google OAuth",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search.router)
app.include_router(auth.router)
app.include_router(google_auth.router)  # Add Google auth router
app.include_router(wishlist.router)
app.include_router(admin.router)  # Add admin router
app.include_router(images.router)  # Add images router
app.include_router(price_tracking.router)  # Add price tracking router
app.include_router(user_activity.router)  # Add user activity router
app.include_router(enhanced_wishlist.router)  # Add enhanced wishlist router
app.include_router(recommendations.router)  # Add AI recommendations router
app.include_router(social.router)  # Add social features router
app.include_router(realtime_notifications.router)  # Add real-time notifications router
app.include_router(analytics.router)  # Add analytics and dashboard router
app.include_router(internationalization.router)  # Add internationalization and multi-currency router
app.include_router(deal_hunting.router)  # Add automated deal hunting and alerts router
app.include_router(user_management.router)  # Add advanced user management and roles router
app.include_router(user.router)  # Add user profile and settings router
app.include_router(smart_recommendations.router)  # Add smart recommendations router

# Mount static files for profile pictures
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {"message": "Welcome to DealHunt with Google OAuth!"}

@app.get("/health")
def health_check():
    """Health check endpoint for Docker containers."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

async def connect_to_mongo():
    """Create database connection."""
    global database
    try:
        logger.info(f"Connecting to MongoDB at: {settings.mongodb_uri}")
        
        client = AsyncIOMotorClient(settings.mongodb_uri)
        
        # Test the connection
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        database = client[settings.db_name]
        app.mongodb_client = client
        app.database = database
        
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection."""
    if hasattr(app, 'mongodb_client'):
        app.mongodb_client.close()
        logger.info("MongoDB connection closed")