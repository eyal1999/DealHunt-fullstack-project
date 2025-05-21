from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager

import logging

from app.routers import search, auth, wishlist
from .config import settings

#app = FastAPI(title="DealHunt API")

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
    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_mongo_connection()

app = FastAPI(
    title="DealHunt app",
    description="FastAPI application with MongoDB",
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
app.include_router(wishlist.router)

@app.get("/")
def root():
    return {"message": "Welcome to DealHunt!"}

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