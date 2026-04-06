# Job Search Location Fix

## Problem
Job search was returning results from foreign locations (United States, Bryan TX, etc.) even though the user's profile has location set to "Chennai, Tamil Nadu, India".

## Root Cause
The `search_jobs_serpapi()` function was:
1. ✅ Receiving the location parameter from user's profile
2. ❌ **NOT passing it to the SerpAPI request parameters**
3. ❌ When falling back to google engine, specifically said "without location"

This resulted in:
- Initial google_jobs search: No location specified → Generic/international results or no results
- Fallback google search: Explicitly without location → US-based results

## Fix Applied

**File:** `backend/app/agent/tools/__init__.py`

### Change 1: Add location to initial request (lines 995-1004)
```python
# Before:
params = {
    "engine": "google_jobs",
    "q": query,
    "api_key": settings.serpapi_key
}

# After:
params = {
    "engine": "google_jobs",
    "q": query,
    "api_key": settings.serpapi_key
}

# Add location if provided to get localized results
if location:
    params["location"] = location
    logger.info(f"   🌍 Using location: {location}")
```

### Change 2: Keep location in fallback (line 1032)
```python
# Before:
logger.info(f"   → No results from google_jobs. Trying google engine without location...")
params["engine"] = "google"

# After:
logger.info(f"   → No results from google_jobs. Trying google engine with location...")
params["engine"] = "google"
# Keep location parameter for better results
```

## Expected Behavior Now

### ✅ With Location from Profile:
```
User Profile: Chennai, Tamil Nadu, India
Search Query: "full stack intern"
     ↓
SerpAPI Request:
  - engine: google_jobs
  - q: "full stack intern C++ Java React"
  - location: "Chennai, Tamil Nadu, India"  ← NOW INCLUDED
     ↓
Results: Jobs in Chennai/Tamil Nadu area
```

### Fallback (if no results):
```
Google Jobs: 0 results
     ↓
Fallback to Google Engine:
  - engine: google
  - q: "full stack intern C++ Java React"
  - location: "Chennai, Tamil Nadu, India"  ← KEPT IN FALLBACK
     ↓
Results: Still prioritizes location-relevant jobs
```

## Testing

1. **Restart backend server** (required for changes to take effect)
2. Go to "Search Jobs" in the app
3. Enter a search query like "full stack intern" or "python developer"
4. **Expected results:**
   - Jobs from Chennai, Tamil Nadu, India
   - Remote jobs that accept Indian candidates
   - Jobs with India-specific locations
5. **Check logs:**
   - Look for: `🌍 Using location: Chennai, Tamil Nadu, India`
   - Verify location appears in SerpAPI requests

## SerpAPI Location Parameter

The `location` parameter in SerpAPI accepts formats like:
- ✅ "Chennai, Tamil Nadu, India"
- ✅ "Bangalore, India"
- ✅ "Mumbai, Maharashtra, India"
- ✅ "India" (country-wide)

## Impact
- ✅ Job searches now use user's profile location
- ✅ Results are relevant to user's geographic area
- ✅ Fallback search also respects location
- ✅ Better candidate-job matching

## Related Files
- `backend/app/agent/tools/__init__.py` - Job search implementation
- `backend/app/agent/graph.py` - Calls search with location from profile

## Success Criteria
- [ ] Job searches return location-relevant results
- [ ] Logs show "🌍 Using location: {user_location}"
- [ ] Foreign/irrelevant locations are filtered out
- [ ] User sees jobs they can actually apply to
