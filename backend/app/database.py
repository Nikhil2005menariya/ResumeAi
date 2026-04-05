from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from app.config import settings


class Database:
    client: Optional[AsyncIOMotorClient] = None
    
    async def connect(self):
        """Connect to MongoDB"""
        self.client = AsyncIOMotorClient(settings.mongodb_url)
        self.db = self.client[settings.database_name]
        
        # Create indexes
        await self._create_indexes()
        print(f"Connected to MongoDB: {settings.database_name}")
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")
    
    async def _create_indexes(self):
        """Create necessary indexes"""
        # Users collection
        await self.db.users.create_index("email", unique=True)
        await self.db.users.create_index("auth0_id", unique=True, sparse=True)
        
        # Profiles collection
        await self.db.profiles.create_index("user_id", unique=True)
        
        # Projects collection
        await self.db.projects.create_index("user_id")
        
        # Resumes collection
        await self.db.resumes.create_index("user_id")
        await self.db.resumes.create_index([("user_id", 1), ("created_at", -1)])
        
        # Jobs collection
        await self.db.jobs.create_index("user_id")
        await self.db.jobs.create_index([("user_id", 1), ("searched_at", -1)])
        
        # Agent sessions
        await self.db.agent_sessions.create_index("user_id")
        await self.db.agent_sessions.create_index([("user_id", 1), ("created_at", -1)])
        
        # OTP codes
        await self.db.otp_codes.create_index("email")
        await self.db.otp_codes.create_index("expires_at", expireAfterSeconds=0)


# Global database instance
db = Database()


def get_db():
    """Get database instance"""
    return db.db


def get_collection(collection_name: str):
    """Get a specific collection"""
    return db.db[collection_name]
