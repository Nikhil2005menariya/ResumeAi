"""
LangGraph Agent State Graph
Defines the agent workflow for resume generation and job search
"""

from typing import Dict, List, Any, Optional, TypedDict, Annotated
from enum import Enum
import operator
import logging
from datetime import datetime
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

from app.agent.memory import AgentMemory
from app.agent.tools import (
    get_user_profile,
    get_user_projects,
    extract_keywords_from_jd,
    select_relevant_projects,
    select_relevant_experience,
    generate_latex_resume,
    compile_latex_to_pdf,
    search_jobs_serpapi,
    calculate_job_relevance,
    generate_with_gemini,
    analyze_job_description,
)
from app.agent.prompts import (
    RESUME_AGENT_SYSTEM_PROMPT,
    RESUME_GENERATION_PROMPT,
    RESUME_REFINEMENT_PROMPT,
    JOB_SEARCH_PROMPT,
)


# ==================== State Definitions ====================

class AgentStatus(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    RETRIEVING_DATA = "retrieving_data"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    COMPILING = "compiling"
    SEARCHING = "searching"
    REFINING = "refining"
    COMPLETED = "completed"
    ERROR = "error"


class AgentState(TypedDict):
    """State for the agent graph"""
    # User context
    user_id: str
    session_id: Optional[str]
    
    # Input
    task_type: str  # resume_generation, job_search, resume_refinement
    job_description: Optional[str]
    user_instructions: Optional[str]
    user_message: Optional[str]
    search_query: Optional[str]
    current_resume_id: Optional[str]
    
    # Retrieved data
    profile: Optional[Dict]
    projects: Optional[List[Dict]]
    
    # Analysis results
    jd_keywords: Optional[List[str]]
    jd_analysis: Optional[Dict]
    selected_projects: Optional[List[Dict]]
    selected_experience: Optional[List[Dict]]
    
    # Generation results
    latex_code: Optional[str]
    pdf_data: Optional[bytes]
    resume_id: Optional[str]
    ats_score: Optional[float]
    
    # Job search results
    jobs: Optional[List[Dict]]
    
    # Agent state
    status: str
    status_message: str
    messages: Annotated[List[Dict], operator.add]
    error: Optional[str]


# ==================== Node Functions ====================

async def plan_task(state: AgentState) -> Dict:
    """Plan the task based on type"""
    task_type = state.get("task_type", "resume_generation")
    
    status_messages = {
        "resume_generation": "Planning resume generation...",
        "resume_refinement": "Planning resume refinement...",
        "job_search": "Planning job search..."
    }
    
    return {
        "status": AgentStatus.PLANNING.value,
        "status_message": status_messages.get(task_type, "Planning..."),
        "messages": [{"role": "system", "content": f"Starting {task_type} task"}]
    }


async def retrieve_user_data(state: AgentState) -> Dict:
    """Retrieve user profile and projects"""
    user_id = state["user_id"]
    
    logger.info(f"📥 Retrieving user data for user_id: {user_id}")
    
    profile = await get_user_profile(user_id)
    projects = await get_user_projects(user_id)
    
    logger.info(f"✅ Retrieved:")
    logger.info(f"   Profile: {list(profile.keys()) if profile else 'Empty'}")
    logger.info(f"   Projects: {len(projects)}")
    logger.info(f"   Skills: {[s.get('name', '') for s in profile.get('skills', [])][:5] if profile else []}")
    
    return {
        "profile": profile,
        "projects": projects,
        "status": AgentStatus.RETRIEVING_DATA.value,
        "status_message": f"Retrieved profile and {len(projects)} projects",
        "messages": [{"role": "system", "content": f"Retrieved user data: {len(projects)} projects"}]
    }


async def analyze_job_description_node(state: AgentState) -> Dict:
    """Analyze job description and extract keywords"""
    job_description = state.get("job_description", "")
    
    if not job_description:
        return {
            "jd_keywords": [],
            "jd_analysis": {},
            "status": AgentStatus.ANALYZING.value,
            "status_message": "No job description provided",
            "messages": []
        }
    
    # Extract keywords using regex
    print("🔍 Extracting keywords from job description...")
    keywords = extract_keywords_from_jd(job_description)
    
    # AI analysis using Gemini
    print("🤖 Running AI analysis of job description...")
    analysis = await analyze_job_description(job_description)
    
    # Combine keywords
    ai_keywords = analysis.get("required_skills", [])
    all_keywords = list(set(keywords + ai_keywords))
    
    print(f"✅ Found {len(keywords)} regex keywords + {len(ai_keywords)} AI keywords = {len(all_keywords)} total")
    
    return {
        "jd_keywords": all_keywords,
        "jd_analysis": analysis,
        "status": AgentStatus.ANALYZING.value,
        "status_message": f"Analyzed JD: {len(all_keywords)} keywords, {analysis.get('experience_years', 'Unknown')} experience level",
        "messages": [{"role": "system", "content": f"Key requirements: {', '.join(all_keywords[:8])}"}]
    }


async def select_content(state: AgentState) -> Dict:
    """Select relevant projects and experience"""
    profile = state.get("profile", {})
    projects = state.get("projects", [])
    keywords = state.get("jd_keywords", [])
    
    print(f"📋 Selecting content from {len(projects)} projects using {len(keywords)} keywords")
    
    # Select relevant projects
    selected_projects = select_relevant_projects(projects, keywords, max_projects=3)
    
    # Select relevant experience
    experience = profile.get("experience", [])
    selected_experience = select_relevant_experience(experience, keywords, max_experience=2)
    
    print(f"✅ Selected {len(selected_projects)} projects and {len(selected_experience)} experiences")
    
    project_names = [p.get("title", "Unknown") for p in selected_projects]
    exp_names = [f"{e.get('position', 'Unknown')} at {e.get('company', 'Unknown')}" for e in selected_experience]
    
    return {
        "selected_projects": selected_projects,
        "selected_experience": selected_experience,
        "status": AgentStatus.ANALYZING.value,
        "status_message": f"Selected: {', '.join(project_names[:2])} + {len(selected_experience)} experiences",
        "messages": [{"role": "system", "content": f"Selected projects: {', '.join(project_names)} | Selected experience: {', '.join(exp_names)}"}]
    }


async def generate_resume(state: AgentState) -> Dict:
    """Generate LaTeX resume using AI"""
    profile = state.get("profile", {})
    selected_projects = state.get("selected_projects", [])
    selected_experience = state.get("selected_experience", [])
    keywords = state.get("jd_keywords", [])
    jd_analysis = state.get("jd_analysis", {})
    user_instructions = state.get("user_instructions", "")
    job_description = state.get("job_description", "")
    
    # Add full name from user data if not in profile
    if not profile.get("full_name"):
        from app.database import get_collection
        users_collection = get_collection("users")
        from bson import ObjectId
        user = await users_collection.find_one({"_id": ObjectId(state["user_id"])})
        if user:
            profile["full_name"] = user.get("full_name", "Your Name")
            profile["email"] = user.get("email", "")
    
    # Update profile with selected experience
    profile_with_exp = {**profile}
    profile_with_exp["experience"] = selected_experience
    
    # Use AI to generate optimized resume content
    from app.agent.tools import generate_ai_resume
    latex_code = await generate_ai_resume(
        profile=profile_with_exp,
        projects=selected_projects,
        experience=selected_experience,
        keywords=keywords,
        jd_analysis=jd_analysis,
        job_description=job_description,
        user_instructions=user_instructions
    )
    
    return {
        "latex_code": latex_code,
        "status": AgentStatus.GENERATING.value,
        "status_message": "AI-generated resume complete",
        "messages": [{"role": "assistant", "content": "Resume generated with AI optimization!"}]
    }



async def compile_pdf(state: AgentState) -> Dict:
    """Compile LaTeX to PDF"""
    latex_code = state.get("latex_code", "")
    
    if not latex_code:
        return {
            "error": "No LaTeX code to compile",
            "status": AgentStatus.ERROR.value,
            "status_message": "Failed to compile PDF",
            "messages": []
        }
    
    pdf_data = compile_latex_to_pdf(latex_code)
    
    if pdf_data:
        return {
            "pdf_data": pdf_data,
            "status": AgentStatus.COMPILING.value,
            "status_message": "PDF compiled successfully",
            "messages": [{"role": "system", "content": "PDF compilation complete"}]
        }
    else:
        return {
            "pdf_data": None,
            "status": AgentStatus.COMPILING.value,
            "status_message": "PDF compilation skipped (pdflatex not available)",
            "messages": [{"role": "system", "content": "PDF compilation skipped - LaTeX code is available for manual compilation"}]
        }


async def save_resume(state: AgentState) -> Dict:
    """Save resume to database"""
    from app.database import get_collection
    from bson import ObjectId
    
    resumes_collection = get_collection("resumes")
    
    # Calculate ATS score based on keyword density
    latex_code = state.get("latex_code", "")
    keywords = state.get("jd_keywords", [])
    
    ats_score = calculate_ats_score(latex_code, keywords)
    
    resume_data = {
        "user_id": state["user_id"],
        "title": f"Resume - {datetime.utcnow().strftime('%Y-%m-%d')}",
        "job_description": state.get("job_description"),
        "custom_instructions": state.get("user_instructions"),
        "latex_code": state.get("latex_code"),
        "pdf_data": state.get("pdf_data"),
        "ats_score": ats_score,
        "selected_projects": [p.get("_id") for p in (state.get("selected_projects") or []) if p and isinstance(p, dict)],
        "version": 1,
        "is_latest": True,
        "updated_at": datetime.utcnow()
    }
    
    # Check if this is updating an existing resume (refinement)
    current_resume_id = state.get("current_resume_id") or state.get("resume_id")
    
    if current_resume_id:
        # Update existing resume
        resume_data["updated_at"] = datetime.utcnow()
        
        # Delete old PDF cache to ensure preview shows updated content
        from pathlib import Path
        PDF_STORAGE_DIR = Path(__file__).parent.parent.parent / "storage" / "pdfs"
        pdf_path = PDF_STORAGE_DIR / f"{current_resume_id}.pdf"
        if pdf_path.exists():
            pdf_path.unlink()
            print(f"🗑️ Deleted old PDF cache for resume {current_resume_id}")
        
        result = await resumes_collection.update_one(
            {"_id": ObjectId(current_resume_id)},
            {"$set": resume_data}
        )
        
        if result.modified_count > 0:
            print(f"💾 Resume updated with ATS score: {ats_score:.1f}/100")
            resume_id = current_resume_id
        else:
            print(f"⚠️  Resume update failed, creating new one")
            # Fallback to creating new if update fails
            resume_data["created_at"] = datetime.utcnow()
            # Mark previous versions as not latest
            await resumes_collection.update_many(
                {"user_id": state["user_id"], "is_latest": True},
                {"$set": {"is_latest": False}}
            )
            result = await resumes_collection.insert_one(resume_data)
            resume_id = str(result.inserted_id)
    else:
        # Create new resume
        resume_data["created_at"] = datetime.utcnow()
        
        # Mark previous versions as not latest
        await resumes_collection.update_many(
            {"user_id": state["user_id"], "is_latest": True},
            {"$set": {"is_latest": False}}
        )
        
        result = await resumes_collection.insert_one(resume_data)
        resume_id = str(result.inserted_id)
        print(f"💾 New resume created with ATS score: {ats_score:.1f}/100")
    
    return {
        "resume_id": resume_id,
        "ats_score": ats_score,
        "status": AgentStatus.COMPLETED.value,
        "status_message": f"Resume {'updated' if current_resume_id else 'saved'}! ATS Score: {ats_score:.1f}/100",
        "messages": [{"role": "assistant", "content": f"✅ Resume ready! ATS Score: {ats_score:.1f}/100. {'Great job!' if ats_score >= 80 else 'Consider adding more relevant keywords.' if ats_score >= 60 else 'Low ATS score - try different keywords or projects.'}"}]
    }


def calculate_ats_score(latex_code: str, keywords: List[str]) -> float:
    """Calculate ATS score based on keyword presence and density"""
    if not latex_code or not keywords:
        return 0.0
    
    text_lower = latex_code.lower()
    keyword_matches = 0
    
    for keyword in keywords:
        if keyword.lower() in text_lower:
            # Count occurrences (up to 3 for diminishing returns)
            count = min(text_lower.count(keyword.lower()), 3)
            keyword_matches += count
    
    # Base score on keyword coverage
    keyword_coverage = len([k for k in keywords if k.lower() in text_lower]) / len(keywords)
    
    # Bonus for frequency
    frequency_bonus = min(keyword_matches / len(keywords), 1.0)
    
    # Final score (0-100)
    score = (keyword_coverage * 70) + (frequency_bonus * 30)
    
    return round(score, 1)


async def refine_resume(state: AgentState) -> Dict:
    """Refine resume based on user feedback"""
    print(f"🔧 REFINE_RESUME CALLED - State type: {type(state)}")
    print(f"🔧 State keys: {list(state.keys()) if hasattr(state, 'keys') else 'No keys method'}")
    
    try:
        current_latex = state.get("latex_code", "")
        user_message = state.get("user_message", "")
        current_resume_id = state.get("current_resume_id") or state.get("resume_id")
        
        print(f"🔧 Refining resume - LaTeX length: {len(current_latex) if current_latex else 0}, Message: {user_message[:50] if user_message else 'None'}...")
        print(f"🔧 Resume ID: {current_resume_id}")
        
        if not current_latex or not user_message:
            print(f"🔧 Missing data - LaTeX: {bool(current_latex)}, Message: {bool(user_message)}")
            return {
                "error": "Missing resume or refinement request",
                "status": AgentStatus.ERROR.value,
                "status_message": "Cannot refine without current resume",
                "messages": []
            }
    except Exception as e:
        print(f"🔧 ERROR in refine_resume state access: {str(e)}")
        print(f"🔧 State content: {state}")
        return {
            "error": f"State access error: {str(e)}",
            "status": AgentStatus.ERROR.value,
            "status_message": "Failed to access resume data",
            "messages": []
        }
    
    prompt = RESUME_REFINEMENT_PROMPT.format(
        current_latex=current_latex,
        user_request=user_message
    )
    
    try:
        print(f"🔧 Sending refinement prompt to Gemini...")
        new_latex = await generate_with_gemini(prompt, RESUME_AGENT_SYSTEM_PROMPT)
        print(f"🔧 Gemini response length: {len(new_latex) if new_latex else 0}")
        
        # Extract LaTeX code from response
        if new_latex and "\\documentclass" in new_latex:
            # Find the LaTeX code
            start = new_latex.find("\\documentclass")
            end = new_latex.rfind("\\end{document}") + len("\\end{document}")
            new_latex = new_latex[start:end]
            print(f"🔧 Extracted LaTeX length: {len(new_latex)}")
        else:
            print(f"🔧 WARNING: No valid LaTeX found in response")
            # If no valid LaTeX, keep the original
            if not new_latex or "\\documentclass" not in new_latex:
                new_latex = current_latex
        
        # Validate that changes were actually made
        if new_latex.strip() == current_latex.strip():
            print(f"⚠️  WARNING: LaTeX was not modified by the agent. Using original.")
            status_msg = "No changes were made to the resume. Please try rephrasing your request."
        else:
            status_msg = f"Resume refined based on your feedback"
            print(f"✅ LaTeX was modified ({len(new_latex)} chars vs {len(current_latex)} original)")
        
        return {
            "latex_code": new_latex,
            "current_resume_id": current_resume_id,  # Preserve resume ID
            "resume_id": current_resume_id,  # Also set resume_id
            "status": AgentStatus.REFINING.value,
            "status_message": status_msg,
            "status_message": "Resume refined based on your feedback",
            "messages": [{"role": "assistant", "content": "I've updated the resume. Compiling PDF..."}]
        }
    except Exception as e:
        print(f"🔧 ERROR in Gemini call: {str(e)}")
        return {
            "error": str(e),
            "status": AgentStatus.ERROR.value,
            "status_message": "Failed to refine resume",
            "messages": [{"role": "assistant", "content": f"Sorry, I couldn't apply those changes: {e}"}]
        }


async def search_jobs_node(state: AgentState) -> Dict:
    """Search for jobs based on user query and profile"""
    logger.info("=" * 80)
    logger.info("🔍 SEARCH_JOBS_NODE STARTED")
    logger.info("=" * 80)
    
    search_query = state.get("search_query", "")
    profile = state.get("profile", {})
    
    logger.info(f"📋 Input State:")
    logger.info(f"   Search Query: '{search_query}'")
    logger.info(f"   Profile Keys: {list(profile.keys())}")
    logger.info(f"   Skills: {[s.get('name', '') for s in profile.get('skills', [])][:3]}...")
    
    if not search_query:
        logger.error("❌ No search query provided")
        return {
            "jobs": [],
            "error": "No search query provided",
            "status": AgentStatus.ERROR.value,
            "status_message": "Please provide a search query",
            "messages": []
        }
    
    # Enhance search query with user profile context
    enhanced_query = _enhance_job_search_query(search_query, profile)
    location = profile.get("location", "")
    
    logger.info(f"🔧 Query Enhancement:")
    logger.info(f"   Original: '{search_query}'")
    logger.info(f"   Enhanced: '{enhanced_query}'")
    logger.info(f"   Location: '{location}'")
    
    # Search for jobs
    logger.info(f"📡 Calling search_jobs_serpapi()...")
    jobs = await search_jobs_serpapi(enhanced_query, location)
    
    logger.info(f"📊 Search Results: {len(jobs)} jobs returned")
    
    if not jobs:
        logger.warning("⚠️  No jobs found after search")
        # Fallback message
        return {
            "jobs": [],
            "status": AgentStatus.SEARCHING.value,
            "status_message": "No jobs found. Try a different search query.",
            "messages": [{"role": "assistant", "content": "I couldn't find jobs matching your query. Try being more specific or using different keywords."}]
        }
    
    # Calculate relevance scores using full profile
    logger.info(f"⭐ Calculating relevance scores for {len(jobs)} jobs...")
    skills = [s.get("name", "") for s in profile.get("skills", [])]
    for idx, job in enumerate(jobs):
        score = calculate_job_relevance(job, profile, skills)
        job["relevance_score"] = score
        logger.debug(f"   [{idx+1}] {job.get('title', 'Unknown')[:50]}... → Score: {score:.1f}")
    
    # Sort by relevance
    jobs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    logger.info(f"✅ Jobs sorted by relevance score")
    
    logger.info(f"🎯 Final Results: {len(jobs)} jobs")
    logger.info("=" * 80)
    
    return {
        "jobs": jobs,
        "status": AgentStatus.COMPLETED.value,
        "status_message": f"Found {len(jobs)} matching jobs",
        "messages": [{"role": "assistant", "content": f"I found {len(jobs)} jobs matching your search! I've ranked them by relevance to your profile."}]
    }


def _enhance_job_search_query(base_query: str, profile: Dict) -> str:
    """Enhance job search query with user's skills and experience"""
    enhancements = []
    
    # Add top skills from profile
    skills = profile.get("skills", [])
    if skills:
        top_skills = [s.get("name", "") for s in skills[:3] if s.get("name")]
        if top_skills:
            enhancements.append(" ".join(top_skills))
    
    # Add tech stack from featured projects
    projects = profile.get("projects", [])
    featured_projects = [p for p in projects if p.get("featured")]
    if featured_projects:
        techs = []
        for project in featured_projects[:2]:
            if project.get("technologies"):
                techs.extend(project["technologies"].split(",")[:2])
        if techs:
            enhancements.append(" ".join([t.strip() for t in techs]))
    
    # Build enhanced query
    enhanced = base_query
    if enhancements:
        enhanced = f"{base_query} {' '.join(enhancements)}"
    
    return enhanced


# ==================== Router Functions ====================

def route_task(state: AgentState) -> str:
    """Route to appropriate task handler"""
    task_type = state.get("task_type", "resume_generation")
    
    if task_type == "job_search":
        return "retrieve_data_for_search"
    elif task_type == "resume_refinement":
        return "refine"
    else:
        return "retrieve_data"


def should_continue_after_compile(state: AgentState) -> str:
    """Decide whether to save or end"""
    if state.get("error"):
        return END
    return "save"


# ==================== Graph Construction ====================

def create_resume_agent_graph():
    """Create the resume generation agent graph"""
    
    # Create graph
    graph = StateGraph(AgentState)
    
    # Add nodes
    graph.add_node("plan", plan_task)
    graph.add_node("retrieve_data", retrieve_user_data)
    graph.add_node("retrieve_data_for_search", retrieve_user_data)
    graph.add_node("analyze_jd", analyze_job_description_node)
    graph.add_node("select_content", select_content)
    graph.add_node("generate", generate_resume)
    graph.add_node("compile", compile_pdf)
    graph.add_node("save", save_resume)
    graph.add_node("refine", refine_resume)
    graph.add_node("search_jobs", search_jobs_node)
    
    # Set entry point
    graph.set_entry_point("plan")
    
    # Add conditional routing
    graph.add_conditional_edges(
        "plan",
        route_task,
        {
            "retrieve_data": "retrieve_data",
            "retrieve_data_for_search": "retrieve_data_for_search",
            "refine": "refine"
        }
    )
    
    # Resume generation flow
    graph.add_edge("retrieve_data", "analyze_jd")
    graph.add_edge("analyze_jd", "select_content")
    graph.add_edge("select_content", "generate")
    graph.add_edge("generate", "compile")
    graph.add_conditional_edges(
        "compile",
        should_continue_after_compile,
        {
            "save": "save",
            END: END
        }
    )
    graph.add_edge("save", END)
    
    # Refinement flow - also needs to save after compile
    graph.add_edge("refine", "compile")
    # Note: compile node will route to save via should_continue_after_compile
    
    # Job search flow
    graph.add_edge("retrieve_data_for_search", "search_jobs")
    graph.add_edge("search_jobs", END)
    
    # Compile graph with memory saver for checkpointing
    memory = MemorySaver()
    return graph.compile(checkpointer=memory)


# Global agent instance
resume_agent = create_resume_agent_graph()


async def run_agent(
    user_id: str,
    task_type: str,
    job_description: str = None,
    user_instructions: str = None,
    search_query: str = None,
    user_message: str = None,
    current_resume_id: str = None,
    session_id: str = None,
    websocket = None
) -> Dict:
    """Run the agent with given inputs"""
    
    # Initialize memory for this session
    memory = AgentMemory(user_id, session_id)
    
    # Load previous session if exists
    if session_id:
        await memory.load_session(session_id)
    
    # Add user message to memory
    if user_message:
        memory.add_message("user", user_message)
    elif job_description:
        memory.add_message("user", f"Generate resume for: {job_description[:100]}...")
    elif search_query:
        memory.add_message("user", f"Search jobs: {search_query}")
    
    # Store task context in working memory
    memory.set("task_type", task_type)
    memory.set("current_task_start", datetime.utcnow())
    
    # Load existing resume data if refinement task
    existing_latex = None
    existing_jd = None
    if current_resume_id and task_type == "resume_refinement":
        print(f"🔍 Loading existing resume for refinement: {current_resume_id}")
        try:
            from app.database import get_collection
            from bson import ObjectId
            
            resumes_collection = get_collection("resumes")
            existing_resume = await resumes_collection.find_one({
                "_id": ObjectId(current_resume_id),
                "user_id": user_id
            })
            
            if existing_resume:
                existing_latex = existing_resume.get("latex_code")
                existing_jd = existing_resume.get("job_description")
                print(f"🔍 Loaded resume - LaTeX length: {len(existing_latex) if existing_latex else 0}")
                print(f"🔍 Loaded JD length: {len(existing_jd) if existing_jd else 0}")
                # Use existing JD if no new one provided
                if not job_description and existing_jd:
                    job_description = existing_jd
            else:
                print(f"🔍 Resume not found in database: {current_resume_id}")
        except Exception as e:
            print(f"🔍 Error loading existing resume: {str(e)}")
    
    print(f"🚀 Creating initial state with LaTeX: {len(existing_latex) if existing_latex else 0} chars")
    
    initial_state = AgentState(
        user_id=user_id,
        session_id=session_id,
        task_type=task_type,
        job_description=job_description,
        user_instructions=user_instructions,
        search_query=search_query,
        user_message=user_message,
        current_resume_id=current_resume_id,
        profile=None,
        projects=None,
        jd_keywords=None,
        jd_analysis=None,
        selected_projects=None,
        selected_experience=None,
        latex_code=existing_latex,  # Load existing LaTeX for refinement
        pdf_data=None,
        resume_id=current_resume_id if current_resume_id else None,  # Set resume_id for updates
        ats_score=None,
        jobs=None,
        status=AgentStatus.IDLE.value,
        status_message="Starting...",
        messages=[],
        error=None
    )
    
    config = {"configurable": {"thread_id": session_id or user_id}}
    
    # Run the graph with streaming
    final_state = None
    async for state in resume_agent.astream(initial_state, config):
        final_state = state
        
        # Extract current state from the streamed dict
        current_state = list(state.values())[0] if state else final_state
        
        # Stream status updates via WebSocket
        if websocket and current_state:
            try:
                await websocket.send_json({
                    "type": "status_update",
                    "status": current_state.get("status"),
                    "message": current_state.get("status_message"),
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                print(f"WebSocket send error: {e}")
    
    # Save to memory after completion
    if final_state:
        final_node_state = list(final_state.values())[0] if isinstance(final_state, dict) else final_state
        
        # Add assistant response to memory
        if final_node_state.get("messages"):
            for msg in final_node_state["messages"]:
                if msg.get("role") == "assistant":
                    memory.add_message("assistant", msg.get("content", ""))
        
        # Save successful patterns to long-term memory
        if task_type == "resume_generation" and not final_node_state.get("error"):
            await memory.save_resume_generation({
                "keywords": final_node_state.get("jd_keywords", []),
                "selected_projects": [p.get("title") if isinstance(p, dict) else str(p) for p in final_node_state.get("selected_projects", [])],
                "selected_experience": [e.get("position") if isinstance(e, dict) else str(e) for e in final_node_state.get("selected_experience", [])],
                "ats_score": final_node_state.get("ats_score"),
                "successful": True
            })
        
        if task_type == "job_search":
            await memory.save_job_search({
                "query": search_query,
                "results_count": len(final_node_state.get("jobs", []))
            })
        
        # Save session
        await memory.save_session()
        
        return final_node_state
    
    return final_state
