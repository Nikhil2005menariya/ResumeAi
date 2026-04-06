# Resum.AI - AI-Powered Resume Generator & Job Matcher

A full-stack web application that generates professional, ATS-optimized resumes using AI and matches them with relevant job opportunities. Built with **React**, **FastAPI**, **LangGraph**, and **MongoDB**.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup Instructions](#-setup-instructions)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [LangGraph Agent Workflow](#-langgraph-agent-workflow)
- [Authentication & Password Reset](#-authentication--password-reset)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Core Features

- **🤖 AI Resume Generation**: Generate professional resumes from job descriptions using Claude AI
- **📊 ATS Optimization**: Automatic ATS score calculation and optimization
- **🔍 Job Matching**: Search and match relevant jobs based on profile and skills
- **📝 Resume Refinement**: Update and improve existing resumes with AI assistance
- **👤 User Profiles**: Complete profile management with education, experience, and skills
- **💼 Project Showcase**: Add and showcase projects to include in resumes
- **🔐 Secure Authentication**: Auth0 OAuth + Email/Password authentication
- **🔑 Password Reset**: OTP-based password reset for users without passwords
- **📥 PDF Export**: Download resumes as PDF (compiled with Docker LaTeX)
- **💾 Version Control**: Track resume versions and iterations

### Advanced Features

- Real-time Agent Status Updates (WebSocket)
- Email notifications for password resets
- Multi-format support (LaTeX, PDF)
- Responsive mobile-friendly UI
- Professional landing page with feature showcase

---

## 🛠 Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **React Query** - State management
- **Auth0** - Authentication
- **Lucide React** - Icons

### Backend
- **FastAPI** - Web framework
- **Python 3.9** - Language
- **MongoDB** - Database
- **LangGraph** - Multi-agent orchestration
- **Claude AI** - Resume generation
- **GoogleGenerativeAI** - Alternative AI backend
- **Docker** - LaTeX compilation (texlive image)
- **FastAPI WebSocket** - Real-time updates

### DevOps
- **Docker** - Container orchestration
- **Docker Compose** - Service management

---

## 📁 Project Structure

```
resumeMaker/
├── frontend/                    # React + TypeScript
│   ├── src/
│   │   ├── pages/              # Page components
│   │   │   ├── Landing.tsx      # Public landing page
│   │   │   ├── Login.tsx        # Auth0 login
│   │   │   ├── ForgotPassword.tsx # OTP-based password reset
│   │   │   ├── Dashboard.tsx    # Main dashboard
│   │   │   ├── CreateResume.tsx # Resume generation
│   │   │   ├── Resumes.tsx      # Resume list & management
│   │   │   ├── Profile.tsx      # User profile
│   │   │   ├── Projects.tsx     # Projects management
│   │   │   ├── Jobs.tsx         # Job search
│   │   │   └── Callback.tsx     # Auth0 callback
│   │   ├── components/
│   │   │   ├── layout/          # Layout components
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── 3d/              # 3D visualization (if used)
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   ├── store.ts         # Auth state management
│   │   │   └── utils.ts         # Utility functions
│   │   └── App.tsx              # Main app with routing
│   └── package.json
│
├── backend/                     # FastAPI + Python
│   ├── app/
│   │   ├── agent/              # LangGraph agent
│   │   │   ├── graph.py         # Agent state graph
│   │   │   ├── memory.py        # Memory management
│   │   │   ├── prompts.py       # System prompts
│   │   │   ├── tools/           # Agent tools (resume gen, job search)
│   │   │   └── nodes/           # Graph nodes (if extended)
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.py          # Auth endpoints
│   │   │   ├── resumes.py       # Resume CRUD & generation
│   │   │   ├── profile.py       # Profile management
│   │   │   ├── projects.py      # Projects management
│   │   │   ├── jobs.py          # Job search
│   │   │   └── websocket.py     # WebSocket for status
│   │   ├── models/              # Pydantic schemas
│   │   ├── auth/                # Authentication
│   │   │   ├── auth_service.py  # JWT & OTP logic
│   │   │   └── email_service.py # Email sending
│   │   ├── database.py          # MongoDB connection
│   │   ├── config.py            # Configuration
│   │   └── main.py              # App entry point
│   ├── storage/
│   │   └── pdfs/                # Generated PDFs
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile
│
├── docker-compose.yml           # Service orchestration
└── README.md                    # This file
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+
- **MongoDB** (local or Atlas)
- **Docker** (for LaTeX compilation)
- **Auth0 Account** (for OAuth)
- **Google Cloud API Keys** (for optional Gemini AI)

### 1. Clone Repository

```bash
cd /Users/niksmac/Desktop/resumeMaker
```

### 2. Backend Setup

```bash
# Create Python virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
# MongoDB
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=resume_maker

# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-secret
AUTH0_API_IDENTIFIER=your-api-identifier

# JWT
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Email (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use app password, not main password
SENDER_EMAIL=your-email@gmail.com

# Claude API
CLAUDE_API_KEY=your-claude-api-key

# Google Gemini (optional)
GOOGLE_API_KEY=your-google-api-key

# SerpAPI for job search
SERPAPI_API_KEY=your-serpapi-key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Environment
ENVIRONMENT=development
EOF

# Verify MongoDB is running
# If using local: brew services start mongodb-community
# If using Atlas: Make sure MONGODB_URI points to your cluster
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-identifier
EOF
```

### 4. Docker LaTeX Setup (Required for PDF Generation)

Resume.AI uses Docker with **texlive** to compile LaTeX to PDF. This provides reliable, sandboxed LaTeX compilation.

#### Why Docker?
- ✅ No local LaTeX installation needed
- ✅ Consistent environment (like Overleaf)
- ✅ Safe sandboxed compilation
- ✅ Handles complex LaTeX packages

#### Installation Steps

**Step 1: Install Docker**
```bash
# macOS (using Homebrew)
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
```

**Step 2: Pull texlive Docker Image**
```bash
# Pull the texlive image (one-time, ~3GB)
docker pull texlive/texlive:latest

# Verify image
docker images | grep texlive
```

**Step 3: Start Docker Container**

**Option A: Manual Docker Run**
```bash
# Start texlive container with LaTeX compilation endpoint
docker run -d \
  --name resume-latex \
  -p 8080:8080 \
  texlive/texlive:latest

# Verify container is running
docker ps | grep resume-latex

# View logs
docker logs resume-latex
```

**Option B: Using docker-compose (Recommended)**
```bash
# Already configured in docker-compose.yml
docker-compose up -d texlive

# Verify service
docker-compose ps
```

#### LaTeX Compilation Methods (Auto-Fallback)

Resume.AI uses a smart fallback system for PDF compilation:

```
1. Try LaTeX.Online (Free, no setup needed)
   ↓ (if fails)
2. Try Docker LaTeX (requires Docker running)
   ↓ (if fails)
3. Try Local pdflatex (if installed)
   ↓ (if fails)
4. Return Error (No ReportLab fallback)
```

**Best for Production:** Use Docker for reliability
**Best for Development:** LaTeX.Online (no Docker needed) or Docker if you have it

#### Verify Docker LaTeX Works

```bash
# Check if container is healthy
curl -I http://localhost:8080

# Expected: HTTP/1.1 200 OK (or similar)

# View container logs for errors
docker logs resume-latex

# Restart if needed
docker restart resume-latex
```

#### Troubleshooting Docker LaTeX

**Container won't start:**
```bash
# Check Docker daemon
docker info

# If not running, start Docker Desktop (macOS/Windows)
# or: sudo systemctl start docker (Linux)
```

**Port 8080 already in use:**
```bash
# Use different port
docker run -d -p 8090:8080 texlive/texlive:latest

# Update backend config: LATEX_SERVER_URL=http://localhost:8090
```

**Container running but LaTeX fails:**
```bash
# Check logs for errors
docker logs resume-latex

# Rebuild container
docker-compose down
docker pull texlive/texlive:latest
docker-compose up -d texlive

# Verify with simple LaTeX
docker exec resume-latex pdflatex --version
```

**PDF generation still failing:**
- Ensure Docker container is running: `docker ps`
- Check backend logs for compilation errors
- Verify LaTeX code is valid
- Try LaTeX.Online instead (falls back automatically)

---

## 🏃 Running the Application

### Option 1: Development Mode (Recommended)

```bash
# Terminal 1 - Start Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Start Frontend
cd frontend
npm run dev

# Terminal 3 - Docker LaTeX (keep running)
docker run -d -p 8080:8080 texlive/texlive:latest

# Access: http://localhost:5173
```

### Option 2: Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

### Option 3: Production Build

```bash
# Frontend
cd frontend
npm run build
npm run preview

# Backend (gunicorn)
cd backend
pip install gunicorn
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

---

## 📡 API Documentation

### Authentication Endpoints

#### `POST /api/auth/signup`
**Create new user account**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```
Response: `{ "id": "user_id", "email": "...", "access_token": "..." }`

#### `POST /api/auth/login`
**Login with email/password**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
Response: `{ "access_token": "...", "user": {...} }`

#### `POST /api/auth/forgot-password`
**Request password reset OTP**
```json
{
  "email": "user@example.com"
}
```
Response: `{ "message": "OTP sent to email" }`

#### `POST /api/auth/reset-password`
**Reset password with OTP**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "newpassword"
}
```

### Resume Endpoints

#### `GET /api/resumes`
**List all user resumes** (Protected)

#### `POST /api/resumes/generate`
**Generate new resume with AI**
```json
{
  "job_description": "Senior Developer at XYZ...",
  "instructions": "Optional: Focus on leadership"
}
```
Response: Streams agent status updates via WebSocket, returns `{ "resume_id": "...", "ats_score": 95 }`

#### `GET /api/resumes/{resume_id}`
**Get resume details** (Protected)

#### `GET /api/resumes/{resume_id}/pdf`
**Download resume as PDF** (Protected)

#### `GET /api/resumes/{resume_id}/latex`
**Get LaTeX source** (Protected)

#### `POST /api/resumes/{resume_id}/refine`
**Refine existing resume with AI**
```json
{
  "message": "Add more emphasis on cloud technologies"
}
```

#### `DELETE /api/resumes/{resume_id}`
**Delete resume** (Protected)

### Profile Endpoints

#### `GET /api/profile`
**Get user profile** (Protected)

#### `PUT /api/profile`
**Update user profile** (Protected)
```json
{
  "headline": "Senior Software Engineer",
  "summary": "10+ years of experience...",
  "phone": "+1-234-567-8900",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/...",
  "education": [
    {
      "school": "MIT",
      "degree": "B.S. Computer Science",
      "graduation_date": "2015"
    }
  ],
  "experience": [
    {
      "company": "Google",
      "position": "Senior Engineer",
      "duration": "2020-2024",
      "description": "Led team of 5..."
    }
  ],
  "skills": ["Python", "AWS", "React", "Docker"]
}
```

### Projects Endpoints

#### `GET /api/projects`
**List user projects** (Protected)

#### `POST /api/projects`
**Create new project** (Protected)
```json
{
  "title": "E-Commerce Platform",
  "description": "Full-stack platform...",
  "tech_stack": ["React", "Node.js", "MongoDB"],
  "github_url": "https://github.com/...",
  "live_url": "https://example.com",
  "is_featured": true
}
```

#### `PUT /api/projects/{project_id}`
**Update project** (Protected)

#### `DELETE /api/projects/{project_id}`
**Delete project** (Protected)

### Job Search Endpoints

#### `GET /api/jobs/search?q=Python&location=remote`
**Search for jobs** (Protected)

Query Parameters:
- `q` - Search query (job title, keywords)
- `location` - Job location
- `remote_only` - Filter remote jobs (true/false)
- `page` - Page number (default: 1)

Response:
```json
{
  "jobs": [
    {
      "id": "job_123",
      "title": "Senior Python Developer",
      "company": "TechCorp",
      "location": "San Francisco, CA",
      "description": "...",
      "salary": "$150K-180K",
      "url": "https://..."
    }
  ],
  "total": 250,
  "page": 1
}
```

### WebSocket Endpoints

#### `WS /ws?token={jwt_token}`
**Real-time agent status updates**

Messages received during resume generation:
```json
{
  "status": "generating",
  "status_message": "Generating resume content...",
  "progress": 45,
  "resume_id": "resume_123"
}
```

---

## 🤖 LangGraph Agent Workflow

The Resume.AI application uses **LangGraph**, a framework for orchestrating multi-step AI workflows. Here's how it works:

### Architecture Overview

```
User Request
    ↓
[Agent State Graph]
    ├─ Plan Task
    ├─ Retrieve Data (Profile, Projects)
    ├─ Analyze (Job Description Keywords, Relevance)
    ├─ Select (Relevant Projects & Experience)
    ├─ Generate (LaTeX Resume)
    ├─ Compile (PDF)
    └─ Return Result
```

### State Definition

The agent maintains a state throughout the workflow:

```python
class AgentState(TypedDict):
    # Input
    user_id: str
    task_type: str  # "resume_generation", "job_search", "resume_refinement"
    job_description: Optional[str]
    user_instructions: Optional[str]
    
    # Retrieved Data
    profile: Optional[Dict]  # User's full profile
    projects: Optional[List[Dict]]
    
    # Analysis
    jd_keywords: Optional[List[str]]  # Keywords extracted from job description
    jd_analysis: Optional[Dict]  # Skills, requirements analysis
    selected_projects: Optional[List[Dict]]  # Filtered relevant projects
    selected_experience: Optional[List[Dict]]  # Filtered relevant experience
    
    # Results
    latex_code: Optional[str]  # Generated LaTeX resume
    pdf_data: Optional[bytes]  # Compiled PDF
    ats_score: Optional[float]  # ATS score (0-100)
    
    # Job Search
    jobs: Optional[List[Dict]]  # Found job listings
    
    # Status
    status: str  # Current status (planning, generating, compiling, etc.)
    messages: List[Dict]  # Chat history
    error: Optional[str]
```

### Workflow Nodes

#### 1. **Plan Task Node**
- **Input**: User request, task type, job description
- **Action**: Determine workflow based on task type
- **Output**: Plan steps to execute
- **Example**: 
  ```
  Task: Resume Generation
  Steps: [Retrieve Data → Analyze JD → Select Projects → Generate → Compile]
  ```

#### 2. **Retrieve User Data Node**
- **Input**: user_id
- **Action**: Fetch profile, projects, experience, skills from MongoDB
- **Output**: Complete user data
- **Purpose**: Get all user context before generation

#### 3. **Analyze Job Description Node**
- **Input**: Job description text
- **Action**: Use Claude to extract keywords, required skills, responsibilities
- **Output**: Structured analysis with key requirements
- **Example Output**:
  ```json
  {
    "key_skills": ["Python", "AWS", "Docker"],
    "seniority": "Senior",
    "focus_areas": ["Backend Development", "Cloud Architecture"]
  }
  ```

#### 4. **Select Relevant Projects Node**
- **Input**: User's projects + JD analysis
- **Action**: Use Claude to score each project against job requirements
- **Output**: Top 3-5 most relevant projects
- **Scoring**: Considers tech stack match, project impact, relevance

#### 5. **Select Relevant Experience Node**
- **Input**: User's experience + JD analysis + selected projects
- **Action**: Filter and order experience entries by relevance
- **Output**: 2-4 most relevant positions
- **Logic**: Matches keywords, seniority level, company type

#### 6. **Generate LaTeX Resume Node**
- **Input**: User profile + selected experience + selected projects + JD analysis
- **Action**: Use Claude to generate professional LaTeX code
- **Output**: Complete LaTeX resume document
- **Features**:
  - ATS-optimized formatting
  - Professional typography
  - Auto-adjusted based on content length
  - Keyword optimization

#### 7. **Compile PDF Node**
- **Input**: LaTeX code
- **Action**: 
  1. Send to Docker LaTeX container
  2. Compile 2 passes (for TOC, references)
  3. Return PDF binary
- **Output**: PDF bytes
- **Fallback**: If Docker fails, returns error (no fallback to ReportLab)

#### 8. **Calculate ATS Score Node**
- **Input**: Resume text + job description
- **Action**: Score based on:
  - Keyword match rate
  - Formatting compliance
  - Experience match
  - Skills coverage
- **Output**: Score 0-100
- **Example**: 95/100 = 85% keywords matched + 10% formatting bonus

#### 9. **Job Search Node**
- **Input**: Search query, location, filters
- **Action**: 
  1. Use SerpAPI to search job boards
  2. Filter and rank by relevance
  3. Calculate match score with user profile
- **Output**: Ranked list of jobs
- **Match Scoring**: Skills overlap + location + seniority level

#### 10. **Resume Refinement Node**
- **Input**: Existing resume LaTeX + user feedback
- **Action**: Use Claude to update specific sections while preserving formatting
- **Output**: Updated LaTeX code
- **Preserves**: Document structure, formatting, page layout

### Task Types & Flows

#### Task Type: `resume_generation`
```
Input: Job Description + Optional Instructions
Flow:
  1. Plan Task → resume_generation workflow
  2. Retrieve User Data → Profile, Projects, Experience
  3. Analyze JD → Extract keywords and requirements
  4. Select Projects → Find top 3 relevant projects
  5. Select Experience → Find 2-4 relevant positions
  6. Generate LaTeX → Create professional resume
  7. Compile PDF → Generate final PDF
  8. Calculate ATS → Score against job description
Output: resume_id, LaTeX code, PDF, ATS score
```

#### Task Type: `resume_refinement`
```
Input: Resume ID + Refinement Instructions
Flow:
  1. Plan Task → refinement workflow
  2. Retrieve Current Resume → Get existing LaTeX
  3. Apply Refinement → Update with instructions
  4. Compile PDF → Generate updated PDF
  5. Calculate ATS → Recalculate score
Output: Updated LaTeX, new PDF, new ATS score
```

#### Task Type: `job_search`
```
Input: Search Query + Filters
Flow:
  1. Plan Task → job_search workflow
  2. Retrieve User Data → Get profile for matching
  3. Search Jobs → Find matching positions
  4. Score Jobs → Rank by relevance
Output: Ranked job list with match scores
```

### Example Resume Generation Flow

**User Request:**
```
Job Description: "Senior Full-Stack Engineer at TechCorp. 5+ years React/Node.js..."
Instructions: "Emphasize cloud architecture experience"
```

**Agent Execution:**

1. **Plan** → Determine this is resume_generation task
2. **Retrieve Data** →
   ```python
   {
     "profile": { "skills": ["React", "Node.js", "AWS", ...] },
     "projects": [
       { "title": "AWS Migration", "tech": ["AWS", "Node.js"] },
       { "title": "Real-time Chat", "tech": ["React", "WebSocket"] },
       ...
     ],
     "experience": [
       { "company": "CloudCorp", "role": "Cloud Architect" },
       ...
     ]
   }
   ```

3. **Analyze JD** →
   ```python
   {
     "keywords": ["React", "Node.js", "AWS", "Microservices"],
     "skills_required": ["Backend", "Frontend", "DevOps"],
     "seniority": "Senior"
   }
   ```

4. **Select Projects** → Picks:
   - ✅ AWS Migration (matches "AWS")
   - ✅ Real-time Chat (matches "React")
   - ✅ GraphQL API (matches "Backend")

5. **Select Experience** → Picks:
   - ✅ Cloud Architect at CloudCorp (matches seniority + AWS)
   - ✅ Senior Dev at TechStart (matches React + Node.js)

6. **Generate LaTeX** → Creates optimized resume with:
   - Highlighted keywords
   - Relevant projects first
   - Experience ordered by relevance
   - Cloud architecture emphasis (per instructions)

7. **Compile PDF** → Docker converts LaTeX → PDF (112KB)

8. **Calculate ATS** → Returns 92/100:
   - ✅ All keywords present
   - ✅ Proper formatting
   - ⚠️ Minor missing skill match

**Result:**
```json
{
  "resume_id": "res_abc123",
  "ats_score": 92,
  "status": "completed",
  "latex_code": "...",
  "pdf_downloaded_at": "2024-04-06T13:11:38Z"
}
```

### Tools Used by Agent

The agent has access to these tools:

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `get_user_profile` | Fetch user data | user_id | profile dict |
| `get_user_projects` | Fetch all projects | user_id | list[projects] |
| `extract_keywords_from_jd` | Parse job description | jd_text | keywords, analysis |
| `select_relevant_projects` | Score & filter projects | projects, jd_analysis | scored_list |
| `select_relevant_experience` | Filter experience | experience, analysis | filtered_list |
| `generate_with_gemini` | LLM text generation | prompt, context | text |
| `generate_latex_resume` | Create LaTeX | profile, projects, exp | latex_code |
| `compile_latex_to_pdf` | LaTeX → PDF | latex_code | pdf_bytes |
| `search_jobs_serpapi` | Job search | query, location | job_list |
| `calculate_job_relevance` | Match scoring | profile, job | score 0-100 |
| `analyze_job_description` | JD parsing | jd_text | structured_analysis |

---

## 🔐 Authentication & Password Reset

### Authentication Flow

1. **Auth0 OAuth**
   - User clicks "Sign in with Google"
   - Redirected to Auth0
   - Authenticated user redirected to `/callback`
   - Frontend stores JWT token in localStorage

2. **Email/Password**
   - User signs up with email
   - Password hashed with bcrypt (rounds: 10)
   - User can login with credentials
   - JWT issued on successful login

3. **JWT Management**
   - Issued: 24 hours expiration
   - Stored: localStorage
   - Sent: Authorization header (`Bearer {token}`)
   - Verified: Every protected request

### Password Reset Flow (OTP-based)

**Why OTP?** Auth0 users don't have passwords. OTP allows them to create one without needing Auth0 integration.

1. **User clicks "Forgot Password"**
   ```
   GET /api/auth/forgot-password
   Body: { "email": "user@example.com" }
   ```

2. **Backend sends OTP**
   - Generates 6-digit OTP
   - Stores in MongoDB with 10-min expiration
   - Sends email with OTP code
   - Returns: `{ "message": "OTP sent" }`

3. **User enters OTP & new password**
   ```
   POST /api/auth/reset-password
   Body: {
     "email": "user@example.com",
     "otp": "123456",
     "new_password": "newpassword"
   }
   ```

4. **Backend verifies & updates**
   - Validates OTP (must be < 10 mins old)
   - Hashes new password
   - Updates user record
   - Invalidates OTP
   - Returns JWT token for auto-login

5. **Email Template**
   ```html
   <h2>Password Reset Code</h2>
   <p>Your OTP code is: <strong>123456</strong></p>
   <p>This code expires in 10 minutes.</p>
   <p>If you didn't request this, ignore this email.</p>
   ```

### Security Features

- ✅ Bcrypt password hashing (10 rounds)
- ✅ OTP expiration (10 minutes)
- ✅ JWT signing with secret key
- ✅ CORS protection
- ✅ Protected routes validation
- ✅ MongoDB ObjectId validation
- ✅ Rate limiting ready (can be added)

---

## 💾 Database Schema

### Collections

#### `users`
```javascript
{
  "_id": ObjectId,
  "email": "user@example.com",
  "full_name": "John Doe",
  "hashed_password": "bcrypt_hash",  // null for Auth0 users
  "auth0_id": "auth0|123456",        // null for email users
  "password_reset_requested_at": ISODate,
  "password_reset_expires_at": ISODate,
  "last_password_change": ISODate,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### `profiles`
```javascript
{
  "_id": ObjectId,
  "user_id": "user_123",
  "headline": "Senior Software Engineer",
  "summary": "10+ years experience...",
  "phone": "+1-234-567-8900",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/...",
  "github_url": "https://github.com/...",
  "education": [
    {
      "school": "MIT",
      "degree": "B.S. Computer Science",
      "graduation_date": "2015",
      "field_of_study": "Computer Science"
    }
  ],
  "experience": [
    {
      "company": "Google",
      "position": "Senior Engineer",
      "duration": "2020-2024",
      "start_date": ISODate,
      "end_date": ISODate,
      "description": "Led team of 5 engineers..."
    }
  ],
  "skills": ["Python", "AWS", "React", "Docker"],
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### `projects`
```javascript
{
  "_id": ObjectId,
  "user_id": "user_123",
  "title": "E-Commerce Platform",
  "description": "Full-stack platform built with...",
  "tech_stack": ["React", "Node.js", "MongoDB"],
  "github_url": "https://github.com/...",
  "live_url": "https://example.com",
  "is_featured": true,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### `resumes`
```javascript
{
  "_id": ObjectId,
  "user_id": "user_123",
  "title": "Resume - TechCorp Senior Dev",
  "job_description": "Senior Developer at TechCorp...",
  "latex_code": "\\documentclass{...}",
  "ats_score": 92.5,
  "version": 1,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### `otps`
```javascript
{
  "_id": ObjectId,
  "email": "user@example.com",
  "code": "123456",
  "expires_at": ISODate,
  "used": false,
  "created_at": ISODate
}
```

---

## 🐛 Troubleshooting

### Frontend Issues

#### Landing page not showing
- Clear browser cache: `Cmd + Shift + Delete`
- Check: `http://localhost:5173/` loads
- Check Network tab for 404s

#### Login not working
- Verify Auth0 credentials in `.env`
- Check Auth0 redirect URI: `http://localhost:5173/callback`
- Check CORS in backend: `FRONTEND_URL=http://localhost:5173`

#### Can't navigate to resume pages
- Verify routing uses `/app/` prefix
- Check: `/app/dashboard`, `/app/resumes`, `/app/create-resume`
- Check JWT token in localStorage

#### WebSocket not connecting
- Verify backend running on `http://localhost:8000`
- Check: WebSocket URL is `ws://localhost:8000/ws`
- Verify JWT token in query string

### Backend Issues

#### MongoDB connection error
```
Error: [Errno 111] Connection refused
```
Solution:
```bash
# Start MongoDB
brew services start mongodb-community

# Or use MongoDB Atlas and update MONGODB_URI
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
```

#### API endpoints returning 404
```bash
# Check routes are registered in main.py
python -c "from app.main import app; print([r.path for r in app.routes])"
```

#### PDF compilation fails
```
Docker LaTeX compilation failed
```
Solution:
```bash
# Start Docker daemon
docker daemon

# Or check container
docker ps
docker logs <container_id>

# Restart container
docker-compose restart texlive
```

#### Email not sending
```
SMTP error: SMTPAuthenticationError
```
Solution:
- Use **Gmail app password**, not main password
- Enable "Less secure app access" (if not using app password)
- Check: `SMTP_USERNAME` and `SMTP_PASSWORD` in `.env`

#### CORS error
```
Access to XMLHttpRequest blocked by CORS policy
```
Solution:
```python
# In main.py, verify CORS setup
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Agent times out
```
RuntimeError: Agent execution timeout
```
Solution:
- Check MongoDB connection
- Verify Claude API key is valid
- Check Docker LaTeX container is running
- Increase timeout: `timeout=300` (seconds)

### Common Issues Checklist

- [ ] `.env` files created in both frontend and backend
- [ ] MongoDB running (`mongosh`)
- [ ] Docker running for LaTeX
- [ ] All API keys valid (Auth0, Claude, SerpAPI, Google)
- [ ] Frontend pointing to correct backend URL
- [ ] Backend CORS allows frontend origin
- [ ] JWT token valid and not expired
- [ ] User profile exists before generating resume

---

## 📚 Additional Resources

- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Auth0**: https://auth0.com/docs/
- **MongoDB**: https://docs.mongodb.com/
- **Claude API**: https://docs.anthropic.com/
- **Docker LaTeX**: https://hub.docker.com/r/texlive/texlive

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Create pull request with description

---

## 📝 License

This project is licensed under the MIT License.

---

**Last Updated**: April 6, 2024
**Version**: 1.0.0

For issues or questions, please open a GitHub issue or contact the development team.
