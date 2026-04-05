# Resume Maker AI 🚀

An AI-powered resume builder and job search platform that creates ATS-optimized resumes using LangGraph agents.

## Features

- 🔐 **Authentication**: Email/Password with OTP verification + Auth0 (Google login)
- 👤 **Profile Management**: Education, experience, skills, certifications
- 📁 **Project Portfolio**: Add projects with tech stack, descriptions, highlights
- 📝 **AI Resume Generation**: Creates tailored 1-page LaTeX resumes for any job description
- 💬 **Chat Refinement**: Iteratively improve your resume through conversation
- 🔍 **Job Search**: AI-powered job discovery matching your profile
- 📊 **ATS Optimization**: Keyword extraction and scoring for better matches

## Tech Stack

### Backend
- **Framework**: Python, FastAPI
- **Database**: MongoDB with Motor (async)
- **AI/Agent**: LangGraph, Google Gemini Flash
- **Auth**: Auth0 + JWT + Email OTP
- **Resume**: LaTeX → PDF (pdflatex)

### Frontend
- **Framework**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State**: Zustand, TanStack Query
- **Auth**: Auth0 React SDK

## Project Structure

```
resumeMaker/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # Settings & env vars
│   │   ├── database.py       # MongoDB connection
│   │   ├── auth/             # Auth0 + OTP services
│   │   ├── models/           # Pydantic schemas
│   │   ├── routes/           # API endpoints
│   │   └── agent/            # LangGraph agent
│   │       ├── graph.py      # Agent state machine
│   │       ├── memory.py     # Memory management
│   │       ├── prompts.py    # System prompts
│   │       └── tools/        # Agent tools
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main app + routing
│   │   ├── pages/            # Page components
│   │   ├── components/       # UI components
│   │   └── lib/              # Utils, API, store
│   ├── package.json
│   └── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB
- pdflatex (for PDF compilation)
- Auth0 account
- Google Gemini API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run the server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Sign up with email
- `POST /api/auth/verify-otp` - Verify email OTP
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/auth0` - Login with Auth0 token

### Profile & Projects
- `GET/PUT /api/profile` - Profile CRUD
- `GET/POST/PUT/DELETE /api/projects` - Projects CRUD

### Resumes
- `POST /api/resumes/generate` - Generate new resume
- `POST /api/resumes/{id}/refine` - Refine resume
- `GET /api/resumes/{id}/pdf` - Download PDF

### Jobs
- `POST /api/jobs/search` - Search jobs
- `POST /api/jobs/{id}/generate-resume` - Generate resume for job

## Agent Architecture

```
Plan → Retrieve Data → Analyze JD → Select Content → Generate LaTeX → Compile PDF → Save
```

## License

MIT
