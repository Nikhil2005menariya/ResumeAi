import json
import subprocess
import tempfile
import os
import re
import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import aiohttp
from bs4 import BeautifulSoup
import google.generativeai as genai

from app.config import settings
from app.database import get_collection

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

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
  \vspace{-2pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-2pt}]

\pdfgentounicode=1

\newcommand{\resumeItem}[1]{
  \item\small{#1 \vspace{-0.5pt}}
}

\newcommand{\resumeSubheading}[4]{
  \vspace{0pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-4pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-4pt}
}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}\vspace{-2pt}}
\newcommand{\resumeItemListStart}{\begin{itemize}[itemsep=2pt, parsep=0pt]}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-2pt}}

%-------------------------------------------
\begin{document}

%----------HEADING----------
\begin{center}
    \textbf{\Huge <<NAME>>} \\ \vspace{4pt}
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
    
    # Name - Properly formatted
    full_name = profile.get("full_name", "Your Name")
    # Ensure proper title case: "Nikhil Menariya" instead of "NIKHIL Menariya"
    full_name = " ".join([word.capitalize() for word in full_name.split()])
    name = escape_latex(full_name)
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
        for skill in skills[:30]:
            skill_items.append(escape_latex(skill.get("name", "")))
        
        skills_section = r"\section{Technical Skills}" + "\n"
        skills_section += r" \begin{itemize}[leftmargin=0.15in, label={}, itemsep=2pt]" + "\n"
        skills_section += r"    \small{\item{" + "\n"
        
        # Group skills into chunks of ~6-8 per line with line breaks
        chunk_size = 7
        chunks = [skill_items[i:i + chunk_size] for i in range(0, len(skill_items), chunk_size)]
        
        for idx, chunk in enumerate(chunks):
            skill_line = ", ".join(chunk)
            if idx < len(chunks) - 1:
                skills_section += r"     " + skill_line + r" \\" + "\n"
            else:
                skills_section += r"     " + skill_line + "\n"
        
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
    
    # Name - Properly formatted
    full_name = profile.get("full_name", "Your Name")
    # Ensure proper title case: "Nikhil Menariya" instead of "NIKHIL Menariya"
    full_name = " ".join([word.capitalize() for word in full_name.split()])
    name = escape_latex(full_name)
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
        for skill in skills[:30]:
            skill_items.append(escape_latex(skill.get("name", "")))
        
        skills_section = r"\section{Technical Skills}" + "\n"
        skills_section += r" \begin{itemize}[leftmargin=0.15in, label={}, itemsep=2pt]" + "\n"
        skills_section += r"    \small{\item{" + "\n"
        
        # Group skills into chunks of ~6-8 per line with line breaks
        chunk_size = 7
        chunks = [skill_items[i:i + chunk_size] for i in range(0, len(skill_items), chunk_size)]
        
        for idx, chunk in enumerate(chunks):
            skill_line = ", ".join(chunk)
            if idx < len(chunks) - 1:
                skills_section += r"     " + skill_line + r" \\" + "\n"
            else:
                skills_section += r"     " + skill_line + "\n"
        
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

async def get_mock_jobs(query: str) -> List[Dict]:
    """Return mock job data for development/offline testing"""
    logger.info(f"📦 Using MOCK JOB DATA (no internet connection)")
    
    mock_jobs_db = {
        "python": [
            {
                "title": "Senior Python Developer",
                "company": "TechCorp Inc",
                "location": "San Francisco, CA",
                "description": "Looking for an experienced Python developer with expertise in FastAPI, Django, and microservices. You'll work on scalable backend systems.",
                "url": "https://example.com/jobs/1",
                "posted_date": "2024-01-15",
                "job_type": "Full-time",
                "source": "Mock Data"
            },
            {
                "title": "Python Backend Engineer",
                "company": "CloudAI Solutions",
                "location": "Remote",
                "description": "Build robust Python backend services using async frameworks. Experience with PostgreSQL and Redis required.",
                "url": "https://example.com/jobs/2",
                "posted_date": "2024-01-10",
                "job_type": "Full-time",
                "source": "Mock Data"
            },
            {
                "title": "Junior Python Developer",
                "company": "StartupXYZ",
                "location": "New York, NY",
                "description": "Entry-level Python role. We'll teach you FastAPI and modern web development. Great learning opportunity!",
                "url": "https://example.com/jobs/3",
                "posted_date": "2024-01-12",
                "job_type": "Full-time",
                "source": "Mock Data"
            }
        ],
        "javascript": [
            {
                "title": "React Frontend Developer",
                "company": "WebStudio",
                "location": "Los Angeles, CA",
                "description": "Expert React developer needed for SPA development. TypeScript, Vite, and shadcn UI experience preferred.",
                "url": "https://example.com/jobs/4",
                "posted_date": "2024-01-14",
                "job_type": "Full-time",
                "source": "Mock Data"
            }
        ],
        "full stack": [
            {
                "title": "Full Stack Developer",
                "company": "DevWorks",
                "location": "Austin, TX",
                "description": "Full stack engineer needed. Python backend (FastAPI) + React frontend. MongoDB experience a plus.",
                "url": "https://example.com/jobs/5",
                "posted_date": "2024-01-13",
                "job_type": "Full-time",
                "source": "Mock Data"
            }
        ]
    }
    
    # Find matching jobs based on query keywords
    query_lower = query.lower()
    matching_jobs = []
    
    for category, jobs in mock_jobs_db.items():
        if category in query_lower or any(word in query_lower for word in category.split()):
            matching_jobs.extend(jobs)
    
    # If no matches, return python jobs as default
    if not matching_jobs:
        matching_jobs = mock_jobs_db.get("python", [])
    
    logger.info(f"📋 Returning {len(matching_jobs)} mock jobs for query: '{query}'")
    return matching_jobs[:15]


def _deduplicate_jobs(jobs: List[Dict]) -> List[Dict]:
    """Remove duplicate jobs based on title + company"""
    seen = set()
    unique_jobs = []
    for job in jobs:
        key = f"{job.get('title', '').lower()}|{job.get('company', '').lower()}"
        if key not in seen and job.get('title'):
            seen.add(key)
            unique_jobs.append(job)
    return unique_jobs


async def _search_google_jobs(query: str, location: str) -> List[Dict]:
    """Search using Google Jobs engine (aggregates LinkedIn, Indeed, Naukri, etc.)"""
    jobs = []
    try:
        params = {
            "engine": "google_jobs",
            "q": query,
            "api_key": settings.serpapi_key
        }
        
        if location:
            params["location"] = location
            logger.info(f"   🌍 Using location: {location}")
        
        logger.info(f"📤 Making SerpAPI request (google_jobs engine)...")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://serpapi.com/search",
                params=params,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    jobs = data.get("jobs_results", [])
                    logger.info(f"   ✓ Google Jobs: {len(jobs)} results")
                    
                    # Format jobs
                    return [{
                        "title": job.get("title", ""),
                        "company": job.get("company_name", ""),
                        "location": job.get("location", ""),
                        "description": job.get("description", "")[:500],
                        "url": job.get("share_url", job.get("apply_link", "")),
                        "posted_date": job.get("detected_extensions", {}).get("posted_at", ""),
                        "job_type": job.get("detected_extensions", {}).get("schedule_type", ""),
                        "source": "Google Jobs"
                    } for job in jobs[:10]]
    except Exception as e:
        logger.error(f"   ❌ Google Jobs error: {e}")
    return []


async def _search_india_job_sites(query: str, location: str) -> List[Dict]:
    """Search India-specific job boards (Internshala, Naukri, Shine)"""
    jobs = []
    sites = [
        f"site:internshala.com {query} {location}",
        f"site:naukri.com {query} {location}",
        f"site:shine.com {query} {location}",
        f"site:foundit.in {query} {location}"
    ]
    
    try:
        for site_query in sites:
            params = {
                "engine": "google",
                "q": site_query,
                "api_key": settings.serpapi_key,
                "num": 5  # 5 results per site
            }
            
            logger.info(f"📤 Searching: {site_query.split('site:')[1].split()[0]}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://serpapi.com/search",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        organic = data.get("organic_results", [])
                        site_jobs = _extract_jobs_from_organic_results(organic)
                        logger.info(f"   ✓ {len(site_jobs)} jobs found")
                        jobs.extend(site_jobs)
    except Exception as e:
        logger.error(f"   ❌ India job sites error: {e}")
    
    return jobs[:15]  # Max 15 from India sites


async def _search_major_job_boards(query: str, location: str) -> List[Dict]:
    """Search major job boards (Glassdoor, LinkedIn, Indeed)"""
    jobs = []
    sites = [
        f"site:linkedin.com/jobs {query} {location}",
        f"site:glassdoor.com {query} {location}",
        f"site:indeed.com {query} {location}"
    ]
    
    try:
        for site_query in sites:
            params = {
                "engine": "google",
                "q": site_query,
                "api_key": settings.serpapi_key,
                "num": 5
            }
            
            logger.info(f"📤 Searching: {site_query.split('site:')[1].split('/')[0]}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://serpapi.com/search",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        organic = data.get("organic_results", [])
                        site_jobs = _extract_jobs_from_organic_results(organic)
                        logger.info(f"   ✓ {len(site_jobs)} jobs found")
                        jobs.extend(site_jobs)
    except Exception as e:
        logger.error(f"   ❌ Major job boards error: {e}")
    
    return jobs[:10]  # Max 10 from major boards


async def search_jobs_serpapi(query: str, location: str = "") -> List[Dict]:
    """Search for jobs using SerpAPI with support for both google_jobs and google engines
    
    Enhanced to search multiple job sites including:
    - LinkedIn, Indeed, Naukri, Glassdoor
    - Internshala (India-focused)
    - Company career pages
    """
    all_jobs = []
    logger.info(f"🔍 Starting job search - Query: '{query}'")
    
    # Try SerpAPI first if available
    if settings.serpapi_key:
        logger.info(f"✓ SerpAPI key configured (key={settings.serpapi_key[:10]}...), attempting search...")
        try:
            # Strategy 1: Google Jobs (aggregates LinkedIn, Indeed, Naukri, etc.)
            all_jobs.extend(await _search_google_jobs(query, location))
            
            # Strategy 2: Search specific sites for India (Internshala, Naukri)
            if location and "India" in location:
                logger.info(f"🇮🇳 India location detected, searching India-specific job boards...")
                all_jobs.extend(await _search_india_job_sites(query, location))
            
            # Strategy 3: Search major job boards (Glassdoor, LinkedIn)
            all_jobs.extend(await _search_major_job_boards(query, location))
            
            # Remove duplicates based on title + company
            unique_jobs = _deduplicate_jobs(all_jobs)
            logger.info(f"✅ Total unique jobs found: {len(unique_jobs)} (from {len(all_jobs)} total)")
            
            if unique_jobs:
                return unique_jobs[:20]  # Return top 20
                
        except Exception as e:
            logger.error(f"❌ SerpAPI search error: {e}", exc_info=True)
    else:
        logger.warning(f"⚠️  SerpAPI key not configured")
    
    # Fallback to GitHub jobs API (free, reliable, no auth needed)
    logger.info(f"🔄 Trying GitHub Jobs API fallback...")
    github_jobs = await search_github_jobs(query)
    logger.info(f"   GitHub Jobs API returned {len(github_jobs)} jobs")
    if github_jobs:
        return github_jobs
    
    # Fallback to web scraping if both fail
    logger.info(f"🔄 Using web scraping fallback for job search")
    jobs = await search_jobs_web(query)
    logger.info(f"   Web scraping returned {len(jobs)} jobs")
    if jobs:
        return jobs
    
    # Final fallback: Use mock data (no internet connection or all APIs failed)
    logger.warning(f"⚠️  All external APIs failed. Using mock job data for development.")
    logger.warning(f"✅ SUGGESTION: Check your internet connection or configure SerpAPI for production")
    mock_jobs = await get_mock_jobs(query)
    return mock_jobs


def _extract_jobs_from_organic_results(organic_results: List[Dict]) -> List[Dict]:
    """Extract job listings from Google organic search results"""
    logger.info(f"🔎 Extracting jobs from {len(organic_results)} organic results...")
    
    jobs = []
    job_keywords = [
        "job", "hire", "hiring", "position", "vacancy", "opening",
        "career", "apply now", "careers", "apply", "employment",
        "internship", "role", "opportunity", "apply here"
    ]
    
    for idx, result in enumerate(organic_results):
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        combined_text = (snippet + " " + title).lower()
        
        # Filter for job-related results
        is_job = any(keyword in combined_text for keyword in job_keywords)
        
        logger.debug(f"   [{idx+1}] Title: '{title}' - Is Job: {is_job}")
        
        if is_job:
            job_obj = {
                "title": title,
                "company": _extract_company_from_snippet(result),
                "location": _extract_location_from_snippet(result),
                "description": snippet,
                "url": result.get("link", ""),
                "posted_date": "",
                "job_type": ""
            }
            jobs.append(job_obj)
            logger.debug(f"      ✓ Added job: {job_obj['title'][:50]}...")
    
    logger.info(f"✅ Extracted {len(jobs)} job listings from organic results")
    return jobs


def _extract_company_from_snippet(result: Dict) -> str:
    """Extract company name from search result"""
    # Try to extract from snippet if it contains common patterns
    snippet = result.get("snippet", "")
    # Common pattern: "Company - Job Title - Location"
    if " - " in snippet:
        parts = snippet.split(" - ")
        if len(parts) > 0:
            # Usually the first part contains company info
            company_part = parts[0].strip()
            # Remove common prefixes
            for prefix in ["New", "Save", "Open", "View", "Post"]:
                if company_part.startswith(prefix):
                    return company_part[len(prefix):].strip()
            return company_part[:50]  # Limit to 50 chars
    return ""


def _extract_location_from_snippet(result: Dict) -> str:
    """Extract location from search result"""
    snippet = result.get("snippet", "")
    # Look for common location patterns
    location_keywords = ["location", "based in", "office", "remote", "work"]
    
    for keyword in location_keywords:
        if keyword in snippet.lower():
            # Try to extract text after the keyword
            parts = snippet.split(keyword)
            if len(parts) > 1:
                location_text = parts[-1][:100].strip()
                # Remove extra punctuation
                return location_text.rstrip(".,")
    
    return ""


async def search_github_jobs(query: str) -> List[Dict]:
    """Search GitHub Jobs API - reliable free API with no auth needed"""
    jobs = []
    logger.info(f"📡 Trying GitHub Jobs API for query: '{query}'...")
    
    try:
        # GitHub Jobs API endpoint
        url = "https://jobs.github.com/positions.json"
        params = {
            "description": query,
            "full_time": "true"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                logger.info(f"   Response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"   GitHub Jobs returned {len(data)} results")
                    
                    # Parse GitHub Jobs response
                    for job in data[:15]:
                        jobs.append({
                            "title": job.get("title", ""),
                            "company": job.get("company", ""),
                            "location": job.get("location", ""),
                            "description": job.get("description", "")[:500],
                            "url": job.get("url", ""),
                            "posted_date": job.get("created_at", ""),
                            "job_type": "Full-time",
                            "source": "GitHub Jobs"
                        })
                    
                    if jobs:
                        logger.info(f"✅ GitHub Jobs API returned {len(jobs)} formatted jobs")
                        return jobs
                    else:
                        logger.warning(f"⚠️  No jobs in GitHub Jobs response")
    except asyncio.TimeoutError:
        logger.warning(f"⚠️  GitHub Jobs API request timed out")
    except Exception as e:
        logger.warning(f"⚠️  GitHub Jobs API error: {e}")
    
    return []


async def search_jobs_web(query: str) -> List[Dict]:
    """Fallback web search for jobs using multiple sources"""
    jobs = []
    
    # Try job board search directly
    search_terms = query.split()[:3]  # Use first 3 words
    search_query = " ".join(search_terms)
    
    logger.info(f"🌐 Web scraping for jobs: '{search_query}'")
    
    # Try Indeed
    try:
        logger.info(f"   Trying Indeed...")
        url = f"https://www.indeed.com/jobs?q={search_query.replace(' ', '+')}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as response:
                if response.status == 200:
                    html = await response.text()
                    
                    # Look for job titles and links in the HTML
                    import re as regex_module
                    
                    # Extract job postings - Indeed uses specific patterns
                    job_patterns = regex_module.findall(
                        r'<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)</a>\s*</h2>',
                        html
                    )
                    
                    for url_path, title in job_patterns[:10]:
                        if title.strip():
                            jobs.append({
                                "title": title.strip(),
                                "company": "Indeed",
                                "location": "",
                                "description": f"Job posting on Indeed - {title}",
                                "url": f"https://www.indeed.com{url_path}" if not url_path.startswith('http') else url_path,
                                "posted_date": "",
                                "job_type": "",
                                "source": "Indeed"
                            })
                    
                    logger.info(f"   Found {len(jobs)} jobs from Indeed")
                    if jobs:
                        return jobs
    except Exception as e:
        logger.warning(f"   ⚠️  Indeed scraping failed: {e}")
    
    # Fallback: Return empty but with a message in logs
    logger.warning(f"⚠️  Web scraping returned no jobs")
    return jobs


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
    
    job_text = (
        job.get("title", "") + " " + 
        job.get("company", "") + " " + 
        job.get("description", "")
    ).lower()
    
    # Build rich user profile text for matching
    profile_text = _build_profile_text(profile).lower()
    
    # Skill matching (up to 40 points) - with semantic matching
    skill_matches = 0
    for skill in skills:
        skill_lower = skill.lower()
        if _skill_matches(skill_lower, job_text):
            skill_matches += 1
    
    if skills:
        score += (skill_matches / len(skills)) * 40
    
    # Project tech stack matching (up to 15 points)
    projects = profile.get("projects", [])
    if projects:
        tech_stack = []
        for project in projects:
            if project.get("technologies"):
                tech_stack.extend(project["technologies"].split(","))
        
        tech_matches = 0
        for tech in tech_stack:
            tech_lower = tech.strip().lower()
            if _skill_matches(tech_lower, job_text):
                tech_matches += 1
        
        if tech_stack:
            score += (min(tech_matches, 5) / 5) * 15
    
    # Experience level matching (up to 15 points)
    if profile.get("experience"):
        years_exp = len(profile["experience"])
        seniority_score = _match_seniority_level(years_exp, job_text)
        score += seniority_score * 15
    
    # Education field matching (up to 10 points)
    if profile.get("education"):
        edu_score = 0
        for edu in profile["education"]:
            field = edu.get("field_of_study", "").lower()
            if field and field in job_text:
                edu_score = 1
                break
        score += edu_score * 10
    
    # Location matching (up to 10 points)
    user_location = profile.get("location", "").lower()
    job_location = job.get("location", "").lower()
    if user_location and job_location:
        if user_location in job_location or job_location in user_location or "remote" in job_location:
            score += 10
    elif "remote" in job_location:
        score += 8
    
    # Headline/summary matching (up to 10 points)
    headline = profile.get("headline", "").lower()
    summary = profile.get("summary", "").lower()
    if headline and headline in job_text:
        score += 10
    elif summary and any(word in job_text for word in summary.split()[:10]):
        score += 5
    
    return min(score, max_score)


def _build_profile_text(profile: Dict) -> str:
    """Build enriched profile text for matching"""
    parts = []
    
    if profile.get("headline"):
        parts.append(profile["headline"])
    if profile.get("summary"):
        parts.append(profile["summary"])
    
    for exp in profile.get("experience", []):
        parts.append(exp.get("position", ""))
        parts.append(exp.get("company", ""))
        parts.append(exp.get("description", ""))
    
    for skill in profile.get("skills", []):
        parts.append(skill.get("name", ""))
    
    return " ".join(parts)


def _skill_matches(skill: str, job_text: str) -> bool:
    """Check if a skill matches the job (semantic matching)"""
    if not skill:
        return False
    
    # Direct match
    if skill in job_text:
        return True
    
    # Semantic aliases for common technologies
    aliases = {
        "python": ["python", "py", "django", "flask", "fastapi"],
        "javascript": ["javascript", "js", "node", "react", "vue", "angular", "typescript"],
        "react": ["react", "reactjs", "react.js"],
        "vue": ["vue", "vuejs", "vue.js"],
        "angular": ["angular", "angularjs"],
        "typescript": ["typescript", "ts"],
        "node": ["node", "nodejs", "node.js"],
        "java": ["java", "spring", "spring boot", "maven", "gradle"],
        "csharp": ["csharp", "c#", ".net", "dotnet"],
        "golang": ["golang", "go"],
        "rust": ["rust"],
        "sql": ["sql", "mysql", "postgres", "postgresql", "mongodb", "sqlite"],
        "database": ["database", "db", "sql", "mongodb", "postgres", "mysql"],
        "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
        "cloud": ["cloud", "aws", "azure", "gcp", "cloudflare"],
        "docker": ["docker", "container", "kubernetes", "k8s"],
        "ml": ["machine learning", "ml", "ai", "artificial intelligence", "deep learning"],
        "api": ["api", "rest", "graphql", "webhook"],
        "testing": ["test", "jest", "pytest", "unittest", "mocha"]
    }
    
    # Check aliases
    skill_lower = skill.lower()
    for primary, related in aliases.items():
        if skill_lower in related:
            # Check if any related term appears in job text
            for term in related:
                if term in job_text:
                    return True
    
    return False


def _match_seniority_level(years_exp: int, job_text: str) -> float:
    """Match user experience level to job requirements"""
    seniority_keywords = {
        "junior": ["junior", "entry level", "fresh", "graduate", "0-2 years"],
        "mid": ["mid-level", "mid level", "3-5 years", "intermediate", "2-4 years"],
        "senior": ["senior", "lead", "principal", "5+ years", "6+ years", "10+ years"],
        "any": ["all levels", "any level", "experience not required"]
    }
    
    # If job says "all levels", it's a good match for anyone
    if any(keyword in job_text for keyword in seniority_keywords["any"]):
        return 1.0
    
    if years_exp < 2:
        # Good match for junior roles
        if any(keyword in job_text for keyword in seniority_keywords["junior"]):
            return 1.0
        # Okay match for any other role
        return 0.5
    elif years_exp < 5:
        # Good match for mid-level roles
        if any(keyword in job_text for keyword in seniority_keywords["mid"]):
            return 1.0
        # Okay match for junior or senior
        return 0.6
    else:
        # Good match for senior roles
        if any(keyword in job_text for keyword in seniority_keywords["senior"]):
            return 1.0
        # Okay match for any role if very experienced
        return 0.7


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
