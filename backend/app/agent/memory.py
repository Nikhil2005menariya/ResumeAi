"""
Agent Memory Management System
Handles short-term, long-term, and working memory for the AI agent
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
from bson import ObjectId

from app.database import get_collection


class AgentMemory:
    """
    Memory management for the AI agent.
    
    Memory Types:
    - Short-term: Current conversation/session context
    - Long-term: User preferences, successful patterns, past interactions
    - Working: Active task state and intermediate results
    """
    
    def __init__(self, user_id: str, session_id: Optional[str] = None):
        self.user_id = user_id
        self.session_id = session_id
        self.working_memory: Dict[str, Any] = {}
        self.short_term: List[Dict] = []
    
    # ==================== Working Memory ====================
    
    def set(self, key: str, value: Any) -> None:
        """Set a value in working memory"""
        self.working_memory[key] = value
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from working memory"""
        return self.working_memory.get(key, default)
    
    def clear_working(self) -> None:
        """Clear working memory"""
        self.working_memory = {}
    
    # ==================== Short-term Memory ====================
    
    def add_message(self, role: str, content: str) -> None:
        """Add a message to short-term memory"""
        self.short_term.append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        })
    
    def get_conversation_history(self, limit: int = 10) -> List[Dict]:
        """Get recent conversation history"""
        return self.short_term[-limit:]
    
    def clear_short_term(self) -> None:
        """Clear short-term memory"""
        self.short_term = []
    
    # ==================== Long-term Memory ====================
    
    async def save_to_long_term(self, memory_type: str, data: Dict) -> str:
        """Save data to long-term memory (MongoDB)"""
        memory_collection = get_collection("agent_memory")
        
        memory_doc = {
            "user_id": self.user_id,
            "type": memory_type,
            "data": data,
            "created_at": datetime.utcnow()
        }
        
        result = await memory_collection.insert_one(memory_doc)
        return str(result.inserted_id)
    
    async def get_from_long_term(
        self, 
        memory_type: str, 
        limit: int = 10
    ) -> List[Dict]:
        """Retrieve data from long-term memory"""
        memory_collection = get_collection("agent_memory")
        
        cursor = memory_collection.find({
            "user_id": self.user_id,
            "type": memory_type
        }).sort("created_at", -1).limit(limit)
        
        memories = await cursor.to_list(length=limit)
        return [m["data"] for m in memories]
    
    async def save_resume_generation(self, data: Dict) -> str:
        """Save a successful resume generation to memory"""
        return await self.save_to_long_term("resume_generation", {
            "job_description_keywords": data.get("keywords", []),
            "selected_projects": data.get("selected_projects", []),
            "selected_experience": data.get("selected_experience", []),
            "ats_score": data.get("ats_score"),
            "user_feedback": data.get("user_feedback"),
            "successful": data.get("successful", True)
        })
    
    async def save_job_search(self, data: Dict) -> str:
        """Save a job search to memory"""
        return await self.save_to_long_term("job_search", {
            "query": data.get("query"),
            "filters": data.get("filters", {}),
            "results_count": data.get("results_count", 0),
            "selected_job": data.get("selected_job")
        })
    
    async def get_user_preferences(self) -> Dict:
        """Get user's learned preferences from past interactions"""
        # Get recent successful resume generations
        resume_memories = await self.get_from_long_term("resume_generation", limit=20)
        
        # Analyze patterns
        preferences = {
            "preferred_skills_order": [],
            "successful_keywords": [],
            "project_selection_patterns": [],
            "feedback_themes": []
        }
        
        for memory in resume_memories:
            if memory.get("successful"):
                preferences["successful_keywords"].extend(
                    memory.get("job_description_keywords", [])
                )
        
        return preferences
    
    # ==================== Session Persistence ====================
    
    async def save_session(self) -> str:
        """Save current session state to database"""
        sessions_collection = get_collection("agent_sessions")
        
        session_data = {
            "user_id": self.user_id,
            "session_type": self.working_memory.get("session_type", "general"),
            "messages": self.short_term,
            "context": self.working_memory,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if self.session_id:
            # Update existing session
            await sessions_collection.update_one(
                {"_id": ObjectId(self.session_id)},
                {"$set": {
                    "messages": self.short_term,
                    "context": self.working_memory,
                    "updated_at": datetime.utcnow()
                }}
            )
            return self.session_id
        else:
            # Create new session
            result = await sessions_collection.insert_one(session_data)
            self.session_id = str(result.inserted_id)
            return self.session_id
    
    async def load_session(self, session_id: str) -> bool:
        """Load a session from database"""
        sessions_collection = get_collection("agent_sessions")
        
        session = await sessions_collection.find_one({
            "_id": ObjectId(session_id),
            "user_id": self.user_id
        })
        
        if session:
            self.session_id = session_id
            self.short_term = session.get("messages", [])
            self.working_memory = session.get("context", {})
            return True
        
        return False
    
    # ==================== Context Building ====================
    
    async def get_full_context(self) -> Dict:
        """Get full context for agent including profile and projects"""
        profiles_collection = get_collection("profiles")
        projects_collection = get_collection("projects")
        
        # Get user profile
        profile = await profiles_collection.find_one({"user_id": self.user_id})
        
        # Get user projects
        cursor = projects_collection.find({"user_id": self.user_id})
        projects = await cursor.to_list(length=50)
        
        # Get preferences
        preferences = await self.get_user_preferences()
        
        return {
            "profile": profile,
            "projects": projects,
            "preferences": preferences,
            "conversation_history": self.get_conversation_history(),
            "working_memory": self.working_memory
        }
    
    def get_profile_summary(self, profile: Dict) -> str:
        """Generate a text summary of user profile"""
        if not profile:
            return "No profile information available."
        
        parts = []
        
        if profile.get("headline"):
            parts.append(f"**Headline:** {profile['headline']}")
        
        if profile.get("summary"):
            parts.append(f"**Summary:** {profile['summary']}")
        
        if profile.get("experience"):
            exp_summary = []
            for exp in profile["experience"][:3]:
                exp_summary.append(f"- {exp['position']} at {exp['company']}")
            parts.append("**Experience:**\n" + "\n".join(exp_summary))
        
        if profile.get("education"):
            edu_summary = []
            for edu in profile["education"][:2]:
                edu_summary.append(f"- {edu['degree']} from {edu['institution']}")
            parts.append("**Education:**\n" + "\n".join(edu_summary))
        
        if profile.get("skills"):
            skills = [s["name"] for s in profile["skills"][:10]]
            parts.append(f"**Skills:** {', '.join(skills)}")
        
        return "\n\n".join(parts)
    
    def get_projects_summary(self, projects: List[Dict]) -> str:
        """Generate a text summary of user projects"""
        if not projects:
            return "No projects available."
        
        summaries = []
        for proj in projects:
            tech = ", ".join(proj.get("tech_stack", [])[:5])
            summaries.append(
                f"**{proj['title']}** ({tech})\n{proj['description'][:200]}..."
            )
        
        return "\n\n".join(summaries)
