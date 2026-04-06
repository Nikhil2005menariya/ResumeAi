# PDF Cache Invalidation Fixes

## Problem
When resume changes were applied (via refine or regenerate), the new LaTeX code was saved to the database, but the old cached PDF file on disk wasn't deleted. This caused the preview to show stale/old PDFs instead of the updated content.

## Root Cause
The application stores PDF files at `backend/storage/pdfs/{resume_id}.pdf` for performance. When latex_code is updated in the database, the cached PDF must be deleted to force recompilation with the new content.

## Fixes Applied

### 1. ✅ POST /resumes/{resume_id}/refine (resumes.py:376)
**Fixed in:** `backend/app/routes/resumes.py` line 421-424
```python
# Delete old PDF cache to ensure preview shows updated content
pdf_path = PDF_STORAGE_DIR / f"{resume_id}.pdf"
if pdf_path.exists():
    pdf_path.unlink()
    print(f"🗑️ Deleted old PDF cache for resume {resume_id}")
```

### 2. ✅ save_resume() function (graph.py:277)
**Fixed in:** `backend/app/agent/graph.py` line 312-317
**Affects:** All resume generation/refinement operations through the agent
```python
# Delete old PDF cache to ensure preview shows updated content
from pathlib import Path
PDF_STORAGE_DIR = Path(__file__).parent.parent.parent / "storage" / "pdfs"
pdf_path = PDF_STORAGE_DIR / f"{current_resume_id}.pdf"
if pdf_path.exists():
    pdf_path.unlink()
    print(f"🗑️ Deleted old PDF cache for resume {current_resume_id}")
```

### 3. ✅ DELETE /resumes/{resume_id} (resumes.py:457)
**Fixed in:** `backend/app/routes/resumes.py` line 474-477
**Purpose:** Prevent orphaned PDF files when resumes are deleted
```python
# Delete the cached PDF file to avoid orphaned files
pdf_path = PDF_STORAGE_DIR / f"{resume_id}.pdf"
if pdf_path.exists():
    pdf_path.unlink()
    print(f"🗑️ Deleted PDF file for deleted resume {resume_id}")
```

## Testing
After restarting the backend server:
1. Make changes to a resume using the refine endpoint
2. Check the preview - changes should now appear immediately
3. Delete a resume - no orphaned PDF files should remain in storage/pdfs/

## Files Modified
- `backend/app/routes/resumes.py` (2 locations)
- `backend/app/agent/graph.py` (1 location)

## Impact
- ✅ Refine operations now show updated content immediately
- ✅ All agent-based resume updates invalidate PDF cache correctly
- ✅ Deleted resumes clean up their PDF files (no disk space waste)
