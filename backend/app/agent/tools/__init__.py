import json
import subprocess
import tempfile
import os
import re
from typing import Dict, List, Any, Optional
from datetime import datetime
import aiohttp
from bs4 import BeautifulSoup
import google.generativeai as genai

from app.config import settings
from app.database import get_collection

# Configure Gemini
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

# NO REPORTLAB - Docker LaTeX only
REPORTLAB_AVAILABLE = False


# ==================== Data Retrieval Tools ====================

async def get_user_profile(user_id: str) -> Dict:
    """Fetch user profile from database"""
    profiles_collection = get_collection("profiles")
    profile = await profiles_collection.find_one({"user_id": user_id})
    
    if profile:
        profile["_id"] = str(profile["_id"])
    return profile or {}


async def get_user_projects(user_id: str, featured_only: bool = False) -> List[Dict]:
    """Fetch user projects from database"""
    projects_collection = get_collection("projects")
    
    query = {"user_id": user_id}
    if featured_only:
        query["is_featured"] = True
    
    cursor = projects_collection.find(query).sort("created_at", -1)
    projects = await cursor.to_list(length=50)
    
    for project in projects:
        project["_id"] = str(project["_id"])
    
    return projects


async def get_user_resumes(user_id: str, limit: int = 10) -> List[Dict]:
    """Fetch user's past resumes"""
    resumes_collection = get_collection("resumes")
    
    cursor = resumes_collection.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit)
    
    resumes = await cursor.to_list(length=limit)
    
    for resume in resumes:
        resume["_id"] = str(resume["_id"])
        # Don't return full PDF data in list
        if "pdf_data" in resume:
            del resume["pdf_data"]
    
    return resumes


# ==================== Resume Generation Tools ====================

def extract_keywords_from_jd(job_description: str) -> List[str]:
    """Extract relevant keywords from job description"""
    # Common technical keywords to look for
    tech_patterns = [
        r'\b(?:python|javascript|typescript|java|c\+\+|rust|go|ruby|php|swift|kotlin)\b',
        r'\b(?:react|angular|vue|svelte|next\.js|node\.js|express|django|flask|fastapi)\b',
        r'\b(?:aws|azure|gcp|docker|kubernetes|terraform|jenkins|ci/cd)\b',
        r'\b(?:sql|postgresql|mysql|mongodb|redis|elasticsearch)\b',
        r'\b(?:machine learning|deep learning|nlp|computer vision|ai|ml)\b',
        r'\b(?:agile|scrum|git|github|gitlab|jira)\b',
    ]
    
    keywords = set()
    text_lower = job_description.lower()
    
    for pattern in tech_patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        keywords.update(matches)
    
    # Extract years of experience
    exp_match = re.search(r'(\d+)\+?\s*years?', text_lower)
    if exp_match:
        keywords.add(f"{exp_match.group(1)}+ years experience")
    
    return list(keywords)


def select_relevant_projects(
    projects: List[Dict], 
    keywords: List[str],
    max_projects: int = 3
) -> List[Dict]:
    """Select most relevant projects based on JD keywords"""
    scored_projects = []
    
    for project in projects:
        score = 0
        
        # Check tech stack match
        tech_stack_lower = [t.lower() for t in project.get("tech_stack", [])]
        for keyword in keywords:
            if keyword.lower() in tech_stack_lower:
                score += 2
            if keyword.lower() in project.get("description", "").lower():
                score += 1
            if keyword.lower() in project.get("title", "").lower():
                score += 1
        
        # Bonus for featured projects
        if project.get("is_featured"):
            score += 1
        
        scored_projects.append((project, score))
    
    # Sort by score and return top projects
    scored_projects.sort(key=lambda x: x[1], reverse=True)
    return [p[0] for p in scored_projects[:max_projects]]


def select_relevant_experience(
    experience: List[Dict],
    keywords: List[str],
    max_experience: int = 2
) -> List[Dict]:
    """Select most relevant experience based on JD keywords"""
    scored_experience = []
    
    for exp in experience:
        score = 0
        
        # Check description match
        description = exp.get("description", "").lower()
        achievements = " ".join(exp.get("achievements", [])).lower()
        
        for keyword in keywords:
            if keyword.lower() in description:
                score += 1
            if keyword.lower() in achievements:
                score += 1
            if keyword.lower() in exp.get("position", "").lower():
                score += 2
        
        # Bonus for current position
        if exp.get("is_current"):
            score += 1
        
        scored_experience.append((exp, score))
    
    scored_experience.sort(key=lambda x: x[1], reverse=True)
    return [e[0] for e in scored_experience[:max_experience]]


LATEX_TEMPLATE = r"""
%-------------------------
% ATS-Friendly One-Page Resume
%-------------------------

\documentclass[letterpaper,10.8pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

\newcommand{\resumeItem}[1]{
  \item\small{#1 \vspace{-1.5pt}}
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-6pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-6pt}
}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}[itemsep=0pt, parsep=1pt]}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-3pt}}

%-------------------------------------------
\begin{document}

%----------HEADING----------
\begin{center}
    \textbf{\Huge \scshape <<NAME>>} \\ \vspace{4pt}
    \small <<CONTACT_INFO>>
\end{center}

<<EDUCATION_SECTION>>

<<EXPERIENCE_SECTION>>

<<PROJECTS_SECTION>>

<<SKILLS_SECTION>>

<<CERTIFICATIONS_SECTION>>

\end{document}
"""


def escape_latex(text: str) -> str:
    """Escape special LaTeX characters"""
    if not text:
        return ""
    
    replacements = [
        ('\\', r'\textbackslash{}'),
        ('&', r'\&'),
        ('%', r'\%'),
        ('$', r'\$'),
        ('#', r'\#'),
        ('_', r'\_'),
        ('{', r'\{'),
        ('}', r'\}'),
        ('~', r'\textasciitilde{}'),
        ('^', r'\textasciicircum{}'),
    ]
    
    for old, new in replacements:
        text = text.replace(old, new)
    
    return text


def generate_latex_resume(
    profile: Dict,
    selected_projects: List[Dict],
    selected_experience: List[Dict],
    keywords: List[str]
) -> str:
    """Generate LaTeX code for resume"""
    latex = LATEX_TEMPLATE
    
    # Name
    name = escape_latex(profile.get("full_name", "Your Name"))
    latex = latex.replace("<<NAME>>", name)
    
    # Headline
    headline = escape_latex(profile.get("headline", ""))
    latex = latex.replace("<<HEADLINE>>", headline)
    
    # Contact Info
    contact_parts = []
    if profile.get("email"):
        contact_parts.append(escape_latex(profile["email"]))
    if profile.get("phone"):
        contact_parts.append(escape_latex(profile["phone"]))
    if profile.get("location"):
        contact_parts.append(escape_latex(profile["location"]))
    
    links_parts = []
    if profile.get("linkedin_url"):
        links_parts.append(r"\href{" + profile["linkedin_url"] + "}{LinkedIn}")
    if profile.get("github_url"):
        links_parts.append(r"\href{" + profile["github_url"] + "}{GitHub}")
    
    contact_info = " $\\cdot$ ".join(contact_parts)
    if links_parts:
        contact_info += " $\\cdot$ " + " $\\cdot$ ".join(links_parts)
    
    latex = latex.replace("<<CONTACT_INFO>>", r"{\small " + contact_info + r"}")
    
    # Summary
    # Summary - NOT included in new template (removed for space efficiency)
    # The template focuses on Education, Experience, Projects, Skills, Certifications
    
    # Experience - Using proper template format
    if selected_experience:
        exp_section = r"\section{Experience}" + "\n"
        exp_section += r"  \resumeSubHeadingListStart" + "\n"
        
        for exp in selected_experience[:3]:
            company = escape_latex(exp.get('company', ''))
            position = escape_latex(exp.get('position', ''))
            location = escape_latex(exp.get('location', ''))
            start = exp.get('start_date', '')
            end = exp.get('end_date', 'Present')
            dates = f"{start} -- {end}" if start else ""
            
            exp_section += r"    \resumeSubheading" + "\n"
            exp_section += f"      {{{company}}}{{{location}}}\n"
            exp_section += f"      {{{position}}}{{{dates}}}\n"
            exp_section += r"      \resumeItemListStart" + "\n"
            
            achievements = exp.get("achievements", [])
            if not achievements and exp.get("description"):
                achievements = [exp["description"]]
            
            for achievement in achievements[:4]:
                exp_section += r"        \resumeItem{" + escape_latex(achievement) + r"}" + "\n"
            
            exp_section += r"      \resumeItemListEnd" + "\n"
        
        exp_section += r"  \resumeSubHeadingListEnd" + "\n"
        experience_section = exp_section
    else:
        experience_section = ""
    latex = latex.replace("<<EXPERIENCE_SECTION>>", experience_section)
    
    # Projects - Using proper template format
    if selected_projects:
        proj_section = r"\section{Projects}" + "\n"
        proj_section += r"  \resumeSubHeadingListStart" + "\n"
        
        for proj in selected_projects[:4]:
            title = escape_latex(proj.get('title', ''))
            tech = proj.get("tech_stack", [])[:6]
            tech_str = ", ".join([escape_latex(t) for t in tech])
            github = proj.get("github_url", "")
            
            # Project heading with tech and GitHub link
            proj_line = r"\textbf{" + title + r"}"
            if tech_str:
                proj_line += r" $|$ \emph{" + tech_str + r"}"
            if github:
                proj_line += r" \href{" + github + r"}{GitHub}"
            
            proj_section += r"    \resumeProjectHeading" + "\n"
            proj_section += f"      {{{proj_line}}}{{}}\n"
            proj_section += r"      \resumeItemListStart" + "\n"
            
            if proj.get('description'):
                proj_section += r"        \resumeItem{" + escape_latex(proj['description'][:150]) + r"}" + "\n"
            
            for highlight in proj.get("highlights", [])[:2]:
                proj_section += r"        \resumeItem{" + escape_latex(highlight) + r"}" + "\n"
            
            proj_section += r"      \resumeItemListEnd" + "\n"
        
        proj_section += r"  \resumeSubHeadingListEnd" + "\n"
        projects_section = proj_section
    else:
        projects_section = ""
    latex = latex.replace("<<PROJECTS_SECTION>>", projects_section)
    
    # Education - Using proper template format
    education = profile.get("education", [])
    if education:
        edu_section = r"\section{Education}" + "\n"
        edu_section += r"  \resumeSubHeadingListStart" + "\n"
        
        for edu in education[:2]:
            institution = escape_latex(edu.get('institution', ''))
            degree = escape_latex(edu.get('degree', ''))
            location = escape_latex(edu.get('location', ''))
            start = edu.get('start_date', '')
            end = edu.get('end_date', '')
            dates = f"{start} -- {end}" if start and end else ""
            
            edu_section += r"    \resumeSubheading" + "\n"
            edu_section += f"      {{{institution}}}{{{location}}}\n"
            edu_section += f"      {{{degree}}}{{{dates}}}\n"
            
            if edu.get("gpa"):
                edu_section += r"      \resumeItemListStart" + "\n"
                edu_section += r"        \resumeItem{CGPA: " + escape_latex(str(edu["gpa"])) + r"}" + "\n"
                edu_section += r"      \resumeItemListEnd" + "\n"
        
        edu_section += r"  \resumeSubHeadingListEnd" + "\n"
        education_section = edu_section
    else:
        education_section = ""
    latex = latex.replace("<<EDUCATION_SECTION>>", education_section)
    
    # Skills - Using proper template format with categories (only if skills exist)
    skills = profile.get("skills", [])
    if skills and len(skills) > 0:
        skill_items = []
        for skill in skills[:20]:
            skill_items.append(escape_latex(skill.get("name", "")))
        
        skills_section = r"\section{Technical Skills}" + "\n"
        skills_section += r" \begin{itemize}[leftmargin=0.15in, label={}, itemsep=2pt]" + "\n"
        skills_section += r"    \small{\item{" + "\n"
        
        # Format skills as a comma-separated list
        # Group into chunks of 5-6 for better readability
        skill_text = ", ".join(skill_items)
        skills_section += skill_text + r" \\" + "\n"
        
        skills_section += r"    }}" + "\n"
        skills_section += r" \end{itemize}" + "\n"
    else:
        skills_section = ""
    latex = latex.replace("<<SKILLS_SECTION>>", skills_section)
    
    # Certifications - Using proper template format (only if certifications exist)
    certifications = profile.get("certifications", [])
    if certifications and len(certifications) > 0:
        cert_section = r"\section{Certifications}" + "\n"
        cert_section += r"  \resumeSubHeadingListStart" + "\n"
        
        for cert in certifications[:3]:
            name = escape_latex(cert.get("name", ""))
            issuer = escape_latex(cert.get("issuer", ""))
            cert_line = r"\textbf{" + name + r"}"
            if issuer:
                cert_line += r" $|$ \emph{" + issuer + r"}"
            
            cert_section += r"    \resumeProjectHeading{" + cert_line + r"}{}" + "\n"
        
        cert_section += r"  \resumeSubHeadingListEnd" + "\n"
        certifications_section = cert_section
    else:
        certifications_section = ""
    latex = latex.replace("<<CERTIFICATIONS_SECTION>>", certifications_section)
    
    return latex


async def generate_ai_resume(
    profile: Dict,
    projects: List[Dict],
    experience: List[Dict],
    keywords: List[str],
    jd_analysis: Dict,
    job_description: str,
    user_instructions: str = ""
) -> str:
    """Generate ATS-optimized resume using AI with real user data"""
    
    # Step 0: Pre-fill template with actual user data (name, email, phone, location, etc)
    # This ensures contact info and education with GPA are always correct
    latex_template_with_data = LATEX_TEMPLATE
    
    # Name
    name = escape_latex(profile.get("full_name", "Your Name"))
    latex_template_with_data = latex_template_with_data.replace("<<NAME>>", name)
    
    # Headline
    headline = escape_latex(profile.get("headline", ""))
    latex_template_with_data = latex_template_with_data.replace("<<HEADLINE>>", headline)
    
    # Contact Info - ALWAYS USE REAL DATA
    contact_parts = []
    if profile.get("email"):
        contact_parts.append(escape_latex(profile["email"]))
    if profile.get("phone"):
        contact_parts.append(escape_latex(profile["phone"]))
    if profile.get("location"):
        contact_parts.append(escape_latex(profile["location"]))
    
    links_parts = []
    if profile.get("linkedin_url"):
        links_parts.append(r"\href{" + profile["linkedin_url"] + "}{LinkedIn}")
    if profile.get("github_url"):
        links_parts.append(r"\href{" + profile["github_url"] + "}{GitHub}")
    if profile.get("portfolio_url"):
        links_parts.append(r"\href{" + profile["portfolio_url"] + "}{Portfolio}")
    
    contact_info = " $\\cdot$ ".join(contact_parts)
    if links_parts:
        contact_info += " $\\cdot$ " + " $\\cdot$ ".join(links_parts)
    
    latex_template_with_data = latex_template_with_data.replace("<<CONTACT_INFO>>", r"{\small " + contact_info + r"}")
    
    # Education with GPA - ALWAYS USE REAL DATA
    education = profile.get("education", [])
    if education:
        edu_items = []
        for edu in education[:3]:
            start = edu.get('start_date', '')
            end = edu.get('end_date', '')
            dates = f"{start} -- {end}" if start and end else ""
            location = escape_latex(edu.get('location', ''))
            
            # Use template format
            institution = escape_latex(edu.get('institution', ''))
            degree = escape_latex(edu.get('degree', ''))
            
            edu_items.append((institution, location, degree, dates, edu.get("gpa")))
        
        education_section = r"\section{Education}" + "\n"
        education_section += r"  \resumeSubHeadingListStart" + "\n"
        
        for institution, location, degree, dates, gpa in edu_items:
            education_section += r"    \resumeSubheading" + "\n"
            education_section += f"      {{{institution}}}{{{location}}}\n"
            education_section += f"      {{{degree}}}{{{dates}}}\n"
            if gpa:
                education_section += r"      \resumeItemListStart" + "\n"
                education_section += r"        \resumeItem{CGPA: " + escape_latex(str(gpa)) + r"}" + "\n"
                education_section += r"      \resumeItemListEnd" + "\n"
        
        education_section += r"  \resumeSubHeadingListEnd" + "\n"
    else:
        education_section = ""
    latex_template_with_data = latex_template_with_data.replace("<<EDUCATION_SECTION>>", education_section)
    
    # Skills - Populate from user profile data (not AI generated)
    skills = profile.get("skills", [])
    if skills and len(skills) > 0:
        skill_items = []
        for skill in skills[:20]:
            skill_items.append(escape_latex(skill.get("name", "")))
        
        skills_section = r"\section{Technical Skills}" + "\n"
        skills_section += r" \begin{itemize}[leftmargin=0.15in, label={}, itemsep=2pt]" + "\n"
        skills_section += r"    \small{\item{" + "\n"
        
        skill_text = ", ".join(skill_items)
        skills_section += skill_text + r" \\" + "\n"
        
        skills_section += r"    }}" + "\n"
        skills_section += r" \end{itemize}" + "\n"
    else:
        skills_section = ""
    latex_template_with_data = latex_template_with_data.replace("<<SKILLS_SECTION>>", skills_section)
    
    # Certifications - Populate from user profile data if exists
    certifications = profile.get("certifications", [])
    if certifications and len(certifications) > 0:
        cert_section = r"\section{Certifications}" + "\n"
        cert_section += r"  \resumeSubHeadingListStart" + "\n"
        
        for cert in certifications[:3]:
            name = escape_latex(cert.get("name", ""))
            issuer = escape_latex(cert.get("issuer", ""))
            cert_line = r"\textbf{" + name + r"}"
            if issuer:
                cert_line += r" $|$ \emph{" + issuer + r"}"
            
            cert_section += r"    \resumeProjectHeading{" + cert_line + r"}{}" + "\n"
        
        cert_section += r"  \resumeSubHeadingListEnd" + "\n"
        certifications_section = cert_section
    else:
        certifications_section = ""
    latex_template_with_data = latex_template_with_data.replace("<<CERTIFICATIONS_SECTION>>", certifications_section)
    
    # Step 1: Prepare context for AI (for content optimization only)
    profile_summary = f"""
Name: {profile.get('full_name', 'N/A')}
Headline: {profile.get('headline', 'N/A')}
Location: {profile.get('location', 'N/A')}
Summary: {profile.get('summary', 'N/A')}

Skills: {', '.join([s.get('name', '') for s in profile.get('skills', [])])}
"""
    
    # Step 2: Format experience
    experience_text = ""
    for exp in experience:
        experience_text += f"\n{exp.get('position')} at {exp.get('company')} ({exp.get('start_date')} - {exp.get('end_date', 'Present')})\n"
        experience_text += exp.get('description', '') + "\n"
        for achievement in exp.get('achievements', []):
            experience_text += f"- {achievement}\n"
    
    # Step 3: Format projects
    projects_text = ""
    for proj in projects:
        projects_text += f"\n{proj.get('title')}\n"
        projects_text += f"Tech: {', '.join(proj.get('tech_stack', []))}\n"
        projects_text += f"Description: {proj.get('description')}\n"
        projects_text += f"GitHub: {proj.get('github_url', 'N/A')}\n"
        for highlight in proj.get('highlights', []):
            projects_text += f"- {highlight}\n"
    
    # Step 4: Create AI prompt - ask to optimize experience, projects, summary only
    prompt = f"""You are an expert resume writer specializing in ATS-optimized resumes. 

JOB DESCRIPTION:
{job_description}

KEY REQUIREMENTS FROM JD:
- Required Skills: {', '.join(jd_analysis.get('required_skills', keywords)[:10])}
- Experience Level: {jd_analysis.get('experience_years', 'Not specified')}
- Key Responsibilities: {', '.join(jd_analysis.get('responsibilities', [])[:5])}

CANDIDATE PROFILE:
{profile_summary}

EXPERIENCE:
{experience_text}

PROJECTS:
{projects_text}

USER INSTRUCTIONS:
{user_instructions or 'Create the best possible resume for this job.'}

TASK:
You will be given a LaTeX template below with some sections already filled in.
Your job is to ONLY replace the following placeholders with optimized content:
- <<EXPERIENCE_SECTION>>: Optimized experience bullets highlighting relevant achievements
- <<PROJECTS_SECTION>>: Optimized project descriptions with metrics and relevant tech

IMPORTANT RULES:
- NEVER change the header, contact info, education, skills, or certifications sections
- ONLY replace the <<PLACEHOLDER>> sections (EXPERIENCE_SECTION and PROJECTS_SECTION)
- Escape special characters properly (use \\& for &, \\% for %, etc)
- Keep bullet points concise (max 2 lines each)
- Focus on achievements with numbers/metrics when possible
- Match language/terminology from the job description
- NO fictional content - only use provided information
- Ensure it compiles with pdflatex
- Do NOT add Summary section or any other sections

LATEX TEMPLATE (Fill in only the <<PLACEHOLDER>> sections):
{latex_template_with_data}

Generate ONLY the complete modified LaTeX code, no explanations. Start with \\documentclass and end with \\end{{document}}.
"""
    
    # Step 5: Generate with AI
    print("🤖 Generating resume content with AI...")
    latex_code = await generate_with_gemini(prompt, "")
    
    # Step 6: Extract LaTeX code from response
    if "\\documentclass" in latex_code:
        start = latex_code.find("\\documentclass")
        end = latex_code.rfind("\\end{document}") + len("\\end{document}")
        latex_code = latex_code[start:end]
    
    return latex_code


def _compile_with_online_latex(latex_code: str) -> Optional[bytes]:
    """Compile LaTeX using LaTeX.Online (free, no auth required)
    
    Note: LaTeX.Online has URL parameter limits and can fail with certain special characters.
    This is a best-effort service - Docker fallback is built in.
    """
    try:
        import requests
        import urllib.parse
        
        # Use LaTeX.Online (latexonline.cc) - free, fully open-source
        # API: https://latexonline.cc/compile?text=<encoded-latex>
        url = "https://latexonline.cc/compile"
        
        # Check if LaTeX contains problematic characters for URL encoding
        problematic_chars = ['"', '&', '#', '%']
        has_problematic = any(char in latex_code for char in problematic_chars)
        
        if has_problematic:
            # Skip LaTeX.Online if problematic chars detected - Docker is more reliable
            print("⚠️  LaTeX contains special characters, skipping LaTeX.Online (using Docker instead)")
            return None
        
        # Encode LaTeX code for URL
        encoded_latex = urllib.parse.quote(latex_code, safe='')
        full_url = f"{url}?text={encoded_latex}"
        
        print("🌐 Compiling LaTeX using LaTeX.Online service...")
        # Increase timeout to 120s - LaTeX compilation can take time
        response = requests.get(full_url, timeout=120)
        
        if response.status_code == 200:
            pdf_data = response.content
            # Verify it's a valid PDF (starts with %PDF)
            if pdf_data.startswith(b'%PDF'):
                print(f"✅ LaTeX.Online compilation successful: {len(pdf_data)} bytes")
                return pdf_data
            else:
                print(f"LaTeX.Online returned invalid PDF (likely compilation error)")
                return None
        else:
            print(f"LaTeX.Online compilation failed: {response.status_code} - falling back to Docker")
            return None
            
    except requests.exceptions.Timeout:
        print("LaTeX.Online compilation timed out (>120s) - falling back to Docker")
        return None
    except Exception as e:
        print(f"LaTeX.Online compilation error: {e} - falling back to Docker")
        return None


def compile_latex_to_pdf(latex_code: str) -> Optional[bytes]:
    """Compile LaTeX code to PDF - Priority: LaTeX.Online (free) → Docker → Local pdflatex"""
    if not latex_code.strip():
        return None
    
    # First try LaTeX.Online (free, no setup required, reliable)
    pdf_data = _compile_with_online_latex(latex_code)
    if pdf_data and len(pdf_data) > 1000:
        print(f"✅ LaTeX.Online compilation successful: {len(pdf_data)} bytes")
        return pdf_data
    
    # Fallback to Docker LaTeX if online fails
    pdf_data = _compile_with_docker_latex(latex_code)
    if pdf_data and len(pdf_data) > 1000:
        print(f"✅ Docker LaTeX compilation successful: {len(pdf_data)} bytes")
        return pdf_data
    
    # Fallback to local pdflatex if available
    pdf_data = _compile_with_pdflatex(latex_code)
    if pdf_data and len(pdf_data) > 1000:
        print(f"✅ Local pdflatex compilation successful: {len(pdf_data)} bytes")
        return pdf_data
    
    # FINAL FAILURE - NO REPORTLAB FALLBACK
    print("❌ ALL LaTeX compilation methods FAILED")
    return None


def _compile_with_docker_latex(latex_code: str) -> Optional[bytes]:
    """Compile LaTeX using Docker with texlive container (like Overleaf)"""
    try:
        import subprocess
        
        # Check if Docker is available
        result = subprocess.run(["docker", "--version"], capture_output=True, timeout=5)
        if result.returncode != 0:
            print("Docker not available")
            return None
        
        # Use the full LaTeX Docker image (tested and working)
        image_name = "texlive/texlive:latest"
        
        # Only pull image if it doesn't exist locally
        result = subprocess.run(
            ["docker", "images", "-q", image_name], 
            capture_output=True, 
            timeout=10
        )
        if not result.stdout.strip():
            print(f"🐳 Pulling LaTeX Docker image {image_name}...")
            pull_result = subprocess.run(
                ["docker", "pull", image_name], 
                capture_output=True, 
                timeout=120  # 2 minutes max for pull
            )
            if pull_result.returncode != 0:
                print(f"Failed to pull Docker image: {pull_result.stderr.decode()[:200]}")
                return None
        
        with tempfile.TemporaryDirectory() as tmpdir:
            tex_path = os.path.join(tmpdir, "resume.tex")
            pdf_path = os.path.join(tmpdir, "resume.pdf")
            
            # Write LaTeX file
            with open(tex_path, "w", encoding="utf-8") as f:
                f.write(latex_code)
            
            # Compile with Docker LaTeX container (single pass for speed, run twice for references)
            docker_cmd = [
                "docker", "run", "--rm",
                "-v", f"{tmpdir}:/workspace",
                "-w", "/workspace",
                image_name,
                "pdflatex", "-interaction=nonstopmode", "resume.tex"
            ]
            
            # Run twice for proper references (like Overleaf)
            for i in range(2):
                print(f"🔄 Docker LaTeX compilation pass {i+1}...")
                result = subprocess.run(docker_cmd, capture_output=True, timeout=60)
                
                # Log but don't fail immediately - PDF might still be generated despite warnings
                if result.returncode != 0 and i == 1:
                    print(f"⚠️  Docker pdflatex returned error code {result.returncode} (might still have generated PDF)")
            
            # Read PDF if it was created (even if there were warnings/errors)
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    pdf_data = f.read()
                    if len(pdf_data) > 1000:  # Valid PDF should be > 1KB
                        print(f"✅ Docker LaTeX successful: {len(pdf_data)} bytes (despite warnings)")
                        return pdf_data
                    else:
                        print(f"❌ PDF file too small ({len(pdf_data)} bytes) - likely compilation error")
                        return None
            else:
                print("❌ PDF file not generated by Docker LaTeX")
                return None
                
    except subprocess.TimeoutExpired:
        print("Docker LaTeX compilation timed out")
        return None
    except Exception as e:
        print(f"Docker LaTeX error: {e}")
        return None


def _compile_with_pdflatex(latex_code: str) -> Optional[bytes]:
    """Try to compile LaTeX using pdflatex"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "resume.tex")
        pdf_path = os.path.join(tmpdir, "resume.pdf")
        
        # Write LaTeX file
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_code)
        
        try:
            # Compile with pdflatex (run twice for references)
            for _ in range(2):
                result = subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                    capture_output=True,
                    timeout=30
                )
            
            # Read PDF if successful
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    return f.read()
        except subprocess.TimeoutExpired:
            print("LaTeX compilation timed out")
        except FileNotFoundError:
            print("pdflatex not found")
        except Exception as e:
            print(f"LaTeX compilation error: {e}")
    
    return None


def _process_itemize(itemize_block):
    """Process LaTeX itemize environment and return formatted text"""
    items = re.findall(r'\\item\s+(.*?)(?=\\item|\s*\\end\{itemize\})', itemize_block, re.DOTALL)
    result = ""
    for item in items:
        # Clean the item text
        item = re.sub(r'\\[a-zA-Z]+\{[^}]*\}', '', item)
        item = re.sub(r'\\[a-zA-Z]+', '', item)
        item = re.sub(r'[{}]', '', item)
        item = re.sub(r'\s+', ' ', item.strip())
        if item:
            result += f"• {item}<br/>"
    return result


# ==================== Job Search Tools ====================

async def search_jobs_serpapi(query: str, location: str = "") -> List[Dict]:
    """Search for jobs using SerpAPI with fallback to web scraping"""
    jobs = []
    
    # Try SerpAPI first if available
    if settings.serpapi_key:
        try:
            params = {
                "engine": "google_jobs",
                "q": query,
                "api_key": settings.serpapi_key
            }
            
            if location:
                params["location"] = location
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://serpapi.com/search",
                    params=params,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        jobs = data.get("jobs_results", [])
                        
                        return [
                            {
                                "title": job.get("title", ""),
                                "company": job.get("company_name", ""),
                                "location": job.get("location", ""),
                                "description": job.get("description", "")[:500],
                                "url": job.get("related_links", [{}])[0].get("link", ""),
                                "posted_date": job.get("detected_extensions", {}).get("posted_at", ""),
                                "job_type": job.get("detected_extensions", {}).get("schedule_type", ""),
                                "source": "SerpAPI"
                            }
                            for job in jobs[:10]
                        ]
        except Exception as e:
            print(f"SerpAPI search error: {e}, falling back to web search")
    
    # Fallback to web scraping if SerpAPI fails or unavailable
    if not jobs:
        print("Using web scraping fallback for job search")
        jobs = await search_jobs_web(query)
    
    return jobs


async def search_jobs_web(query: str) -> List[Dict]:
    """Fallback web search for jobs using multiple sources"""
    jobs = []
    
    # Try multiple job boards
    sources = [
        {
            "url": f"https://www.indeed.com/jobs?q={query.replace(' ', '+')}",
            "parser": "indeed"
        },
        {
            "url": f"https://www.linkedin.com/jobs/search?keywords={query.replace(' ', '+')}",
            "parser": "linkedin"
        }
    ]
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            for source in sources:
                try:
                    async with session.get(source["url"], headers=headers, timeout=10) as response:
                        if response.status == 200:
                            html = await response.text()
                            soup = BeautifulSoup(html, "html.parser")
                            
                            if source["parser"] == "indeed":
                                jobs.extend(_parse_indeed_jobs(soup, query))
                            elif source["parser"] == "linkedin":
                                jobs.extend(_parse_linkedin_jobs(soup, query))
                            
                            if len(jobs) >= 10:  # Limit results
                                break
                except Exception as e:
                    print(f"Error scraping {source['url']}: {e}")
                    continue
                    
    except Exception as e:
        print(f"Job web search error: {e}")
    
    return jobs[:10]  # Limit to 10 results


def _parse_indeed_jobs(soup: BeautifulSoup, query: str) -> List[Dict]:
    """Parse Indeed job listings"""
    jobs = []
    
    try:
        # Indeed uses job cards with specific classes
        job_cards = soup.find_all("div", class_=lambda x: x and "job_seen_beacon" in x)
        
        for card in job_cards[:5]:
            try:
                title_elem = card.find("h2", class_=lambda x: x and "jobTitle" in x)
                company_elem = card.find("span", class_=lambda x: x and "companyName" in x)
                location_elem = card.find("div", class_=lambda x: x and "companyLocation" in x)
                snippet_elem = card.find("div", class_=lambda x: x and "job-snippet" in x)
                
                if title_elem and company_elem:
                    # Get job link
                    link_elem = title_elem.find("a")
                    job_id = link_elem.get("id", "").replace("job_", "") if link_elem else ""
                    job_url = f"https://www.indeed.com/viewjob?jk={job_id}" if job_id else ""
                    
                    jobs.append({
                        "title": title_elem.get_text(strip=True),
                        "company": company_elem.get_text(strip=True),
                        "location": location_elem.get_text(strip=True) if location_elem else "",
                        "description": snippet_elem.get_text(strip=True)[:300] if snippet_elem else "",
                        "url": job_url,
                        "posted_date": "Recently",
                        "job_type": "Full-time",
                        "source": "Indeed"
                    })
            except Exception as e:
                continue
    
    except Exception as e:
        print(f"Indeed parsing error: {e}")
    
    return jobs


def _parse_linkedin_jobs(soup: BeautifulSoup, query: str) -> List[Dict]:
    """Parse LinkedIn job listings"""
    jobs = []
    
    try:
        # LinkedIn uses job cards
        job_cards = soup.find_all("div", class_=lambda x: x and "base-card" in x)
        
        for card in job_cards[:5]:
            try:
                title_elem = card.find("h3", class_=lambda x: x and "base-search-card__title" in x)
                company_elem = card.find("h4", class_=lambda x: x and "base-search-card__subtitle" in x)
                location_elem = card.find("span", class_=lambda x: x and "job-search-card__location" in x)
                link_elem = card.find("a", class_=lambda x: x and "base-card__full-link" in x)
                
                if title_elem and company_elem:
                    jobs.append({
                        "title": title_elem.get_text(strip=True),
                        "company": company_elem.get_text(strip=True),
                        "location": location_elem.get_text(strip=True) if location_elem else "",
                        "description": f"Job opportunity at {company_elem.get_text(strip=True)}",
                        "url": link_elem.get("href", "") if link_elem else "",
                        "posted_date": "Recently",
                        "job_type": "Full-time",
                        "source": "LinkedIn"
                    })
            except Exception as e:
                continue
    
    except Exception as e:
        print(f"LinkedIn parsing error: {e}")
    
    return jobs


def calculate_job_relevance(job: Dict, profile: Dict, skills: List[str]) -> float:
    """Calculate relevance score for a job based on user profile"""
    score = 0.0
    max_score = 100.0
    
    job_text = (job.get("title", "") + " " + job.get("description", "")).lower()
    
    # Skill matching (up to 60 points)
    skill_matches = 0
    for skill in skills:
        if skill.lower() in job_text:
            skill_matches += 1
    
    if skills:
        score += (skill_matches / len(skills)) * 60
    
    # Experience level matching (up to 20 points)
    if profile.get("experience"):
        years_exp = len(profile["experience"])
        if "senior" in job_text and years_exp >= 5:
            score += 20
        elif "junior" in job_text and years_exp < 3:
            score += 20
        elif "mid" in job_text and 2 <= years_exp <= 5:
            score += 20
        else:
            score += 10
    
    # Education matching (up to 20 points)
    if profile.get("education"):
        for edu in profile["education"]:
            if edu.get("field_of_study", "").lower() in job_text:
                score += 20
                break
    
    return min(score, max_score)


# ==================== AI Generation Tools ====================

async def generate_with_gemini(prompt: str, system_prompt: str = "") -> str:
    """Generate text using Gemini Flash"""
    if not settings.gemini_api_key:
        raise ValueError("Gemini API key not configured")
    
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    full_prompt = prompt
    if system_prompt:
        full_prompt = f"{system_prompt}\n\n{prompt}"
    
    response = model.generate_content(full_prompt)
    return response.text


async def analyze_job_description(job_description: str) -> Dict:
    """Use AI to analyze job description and extract requirements"""
    prompt = f"""Analyze this job description and extract:
1. Required skills (list)
2. Preferred skills (list)
3. Years of experience required
4. Education requirements
5. Key responsibilities (list)
6. Company culture indicators

Job Description:
{job_description}

Return as JSON format."""

    try:
        response = await generate_with_gemini(prompt)
        # Try to parse JSON from response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Error analyzing JD: {e}")
    
    # Fallback to keyword extraction
    return {
        "required_skills": extract_keywords_from_jd(job_description),
        "preferred_skills": [],
        "experience_years": None,
        "education": None,
        "responsibilities": [],
        "culture": None
    }
