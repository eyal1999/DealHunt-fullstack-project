"""MongoDB database connection setup."""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure

from app.config import settings

# MongoDB client - use AsyncIOMotorClient for async operations
client = AsyncIOMotorClient(settings.mongodb_uri)

# Get database
db = client[settings.db_name]

# Collections
users_collection = db.users
products_collection = db.products
wishlist_collection = db.wishlist
search_cache_collection = db.search_cache

async def ping_database():
    """Check if the database connection is working."""
    try:
        await client.admin.command('ping')
        return True
    except ConnectionFailure:
        return False

def get_collection(name):
    """Get a database collection by name."""
    return db[name]