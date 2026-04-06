# Project Links Fix - Including Live URLs in Resumes

## Problem
Resumes were only showing **GitHub links** but not **live project URLs/demos** even though the projects collection has both `url` and `github_url` fields.

## What Was Missing

### Before Fix:
```latex
\textbf{MyAwesomeApp} $|$ \emph{Python, FastAPI, React, MongoDB} \href{https://github.com/user/project}{GitHub}
```
**Only GitHub link shown** ❌

### After Fix:
```latex
\textbf{MyAwesomeApp} $|$ \emph{Python, FastAPI, React, MongoDB} \href{https://myapp.com}{Live} \href{https://github.com/user/project}{GitHub}
```
**Both Live demo AND GitHub links shown** ✅

## Changes Applied

### Change 1: Add Live URL to AI Prompt Context
**File:** `backend/app/agent/tools/__init__.py` (lines 629-638)

**Before:**
```python
projects_text += f"\n{proj.get('title')}\n"
projects_text += f"Tech: {', '.join(proj.get('tech_stack', []))}\n"
projects_text += f"Description: {proj.get('description')}\n"
projects_text += f"GitHub: {proj.get('github_url', 'N/A')}\n"
```

**After:**
```python
projects_text += f"\n{proj.get('title')}\n"
projects_text += f"Tech: {', '.join(proj.get('tech_stack', []))}\n"
projects_text += f"Description: {proj.get('description')}\n"
if proj.get('url'):
    projects_text += f"Live Link: {proj.get('url')}\n"  # ✅ ADDED
projects_text += f"GitHub: {proj.get('github_url', 'N/A')}\n"
```

**Impact:** The AI now knows about live project URLs when optimizing descriptions

### Change 2: Add Live URL Hyperlink to LaTeX
**File:** `backend/app/agent/tools/__init__.py` (lines 370-383)

**Before:**
```python
tech_str = ", ".join([escape_latex(t) for t in tech])
github = proj.get("github_url", "")

proj_line = r"\textbf{" + title + r"}"
if tech_str:
    proj_line += r" $|$ \emph{" + tech_str + r"}"
if github:
    proj_line += r" \href{" + github + r"}{GitHub}"
```

**After:**
```python
tech_str = ", ".join([escape_latex(t) for t in tech])
project_url = proj.get("url", "")      # ✅ ADDED
github = proj.get("github_url", "")

proj_line = r"\textbf{" + title + r"}"
if tech_str:
    proj_line += r" $|$ \emph{" + tech_str + r"}"
# Add live project link first, then GitHub
if project_url:                        # ✅ ADDED
    proj_line += r" \href{" + project_url + r"}{Live}"
if github:
    proj_line += r" \href{" + github + r"}{GitHub}"
```

**Impact:** Live project URLs now appear as clickable hyperlinks in the PDF

## How It Looks in PDF

### Example Project Section:
```
PROJECTS
────────────────────────────────────────────────────

Code Buddy | AI Codebase Assistant            Live  GitHub
Python, FastAPI, MongoDB, ChromaDB, Docker, React, TypeScript
• Engineered an AI codebase assistant leveraging GenAI Integration 
  and vector databases for natural language queries
• Implemented change-approval workflow for AI-suggested modifications

GrabPic | AI Event Photo Retrieval            Live  GitHub  
Python, FastAPI, AWS S3, EC2, MongoDB, Redis, BullMQ, Docker
• Developed an AI platform for event photo retrieval using 
  InsightFace embeddings
• Achieved sub-second face match retrieval with microservices 
  architecture on AWS
```

**"Live" and "GitHub" are clickable hyperlinks** in the PDF!

## Project Database Schema

Your projects collection includes both URL fields:

```typescript
{
  title: "MyAwesomeApp",
  description: "Full stack application...",
  tech_stack: ["Python", "FastAPI", "React"],
  url: "https://myapp.vercel.app",           // ✅ Live demo/production
  github_url: "https://github.com/user/app", // ✅ Source code
  highlights: [
    "Built with microservices architecture",
    "Deployed on AWS with Docker"
  ]
}
```

## When Links Appear

| Condition | Live Link | GitHub Link |
|-----------|-----------|-------------|
| Project has `url` field | ✅ Shows | Only if `github_url` exists |
| Project has no `url` | ❌ Hidden | ✅ Shows if `github_url` exists |
| Project has both | ✅ Shows "Live" first | ✅ Shows "GitHub" after |
| Project has neither | ❌ Hidden | ❌ Hidden |

## Testing

1. **Restart backend server** (required!)
2. **Generate a new resume** or **refine existing one**
3. **Check the PDF** - Projects should now show:
   - Project title
   - Technologies
   - **"Live" link** (if project has URL)
   - **"GitHub" link** (if project has GitHub URL)
4. **Click the links** in the PDF - They should open in browser

## Benefits

### ✅ Showcases Live Work
- Recruiters can see your deployed projects immediately
- More impressive than just source code

### ✅ Professional Presentation
- Live demos show you can deploy and maintain production apps
- GitHub shows you can write clean, documented code

### ✅ ATS-Friendly
- Hyperlinks are properly formatted for ATS systems
- URLs don't break parsing

### ✅ Space-Efficient
- Short "Live" and "GitHub" labels instead of full URLs
- Keeps resume clean and readable

## Example LaTeX Output

```latex
\section{Projects}
  \resumeSubHeadingListStart
    \resumeProjectHeading
      {\textbf{Code Buddy} $|$ \emph{Python, FastAPI, MongoDB} \href{https://codebuddy.app}{Live} \href{https://github.com/user/codebuddy}{GitHub}}{}
      \resumeItemListStart
        \resumeItem{Engineered an AI codebase assistant with vector databases}
        \resumeItem{Implemented change-approval workflow for AI modifications}
      \resumeItemListEnd
  \resumeSubHeadingListEnd
```

## Files Modified

| File | Lines | What Changed |
|------|-------|--------------|
| `backend/app/agent/tools/__init__.py` | 629-638 | Added live URL to AI prompt context |
| `backend/app/agent/tools/__init__.py` | 370-383 | Added live URL hyperlink to LaTeX |

## Recommendation

Make sure your projects in the database have the `url` field filled:

```python
# Example: Update a project with live URL
{
  "_id": "...",
  "user_id": "...",
  "title": "GrabPic",
  "url": "https://grabpic.vercel.app",        # ADD THIS!
  "github_url": "https://github.com/user/grabpic",
  "tech_stack": ["Python", "FastAPI", "AWS"],
  ...
}
```

Then regenerate your resume to see the live links appear!
