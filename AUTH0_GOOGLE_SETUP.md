# Auth0 Google Login Setup Guide

## Current Issue
The "Continue with Google" button reloads the page but doesn't authenticate.

## What Was Fixed in Code:
1. ✅ Updated `handleGoogleLogin` to use proper Auth0 parameters
2. ✅ Created `/callback` route to handle Auth0 redirects  
3. ✅ Updated `Auth0Provider` redirect URI to use `/callback`

## What You Need to Do in Auth0 Dashboard:

### 1. Add Callback URL (REQUIRED)
In your Auth0 Application Settings (screenshot you shared):

**Allowed Callback URLs** - Update to:
```
http://localhost:5173/callback, http://localhost:5174/callback
```

**Save** the changes!

### 2. Enable Google Social Connection (REQUIRED)

1. In Auth0 Dashboard, go to **Authentication** → **Social**
2. Click **+ Create Connection**
3. Select **Google**
4. Follow the wizard:
   - Option 1: Use Auth0 Dev Keys (quick test)
   - Option 2: Use your own Google OAuth credentials (production)

5. For testing, select **"Use Auth0's Developer Keys"**
6. Click **Create**
7. In the connection settings, enable it for your application
8. **Save**

### 3. Update Other URLs (Optional but Recommended)

**Allowed Logout URLs**:
```
http://localhost:5173/, http://localhost:5174/
```

**Allowed Web Origins**:  
```
http://localhost:5173, http://localhost:5174
```

**Allowed Origins (CORS)**:
```
http://localhost:5173, http://localhost:5174
```

## After Auth0 Configuration:

1. Refresh your browser at http://localhost:5173
2. Click "Continue with Google"
3. You should be redirected to Google login
4. After Google authentication, you'll be redirected to `/callback`
5. The callback page will verify with the backend
6. You'll be logged in and redirected to dashboard

## Testing Flow:

```
User clicks "Continue with Google"
  ↓
Redirects to Auth0 login
  ↓
Auth0 shows Google option (if enabled)
  ↓
User logs in with Google
  ↓
Google redirects back to Auth0
  ↓
Auth0 redirects to http://localhost:5173/callback
  ↓
Callback page gets Auth0 token
  ↓
Calls backend /api/auth/auth0-verify
  ↓
Backend verifies and creates/updates user
  ↓
Returns JWT token
  ↓
Frontend stores token
  ↓
Redirects to /dashboard
```

## Alternative: Use Email/Password (Already Working)

If you don't want to set up Google:
1. Click "Create an account" instead
2. Enter email and password
3. Check email for OTP
4. Enter OTP code
5. You're logged in!

The email/password flow is already fully functional.

## Troubleshooting:

**"Callback URL mismatch"**
- Make sure `/callback` is added to Allowed Callback URLs in Auth0

**"Connection not enabled"**
- Enable Google connection in Auth0 → Authentication → Social

**"Google button does nothing"**
- Check browser console for errors
- Verify .env has correct Auth0 credentials
- Clear browser cache and try again

## Quick Test:

After updating Auth0 settings, test the flow:

```bash
# In browser console (F12), check:
console.log({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE
})

# Should show:
# domain: "nik-2005.us.auth0.com"
# clientId: "l61sYMEykfteZddtatxPZRfX1NprGqez"
# audience: "https://nik-2005.us.auth0.com/api/v2/"
```

## Summary of Changes:

**Files Modified:**
- ✅ `frontend/src/pages/Login.tsx` - Updated Google login handler
- ✅ `frontend/src/pages/Callback.tsx` - NEW callback page
- ✅ `frontend/src/App.tsx` - Added /callback route
- ✅ `frontend/src/main.tsx` - Updated redirect URI

**Auth0 Changes Needed:**
- ⚠️ Add `http://localhost:5173/callback` to Allowed Callback URLs
- ⚠️ Enable Google social connection
- ⚠️ Save changes!

Once you update Auth0, Google login will work! 🎉
