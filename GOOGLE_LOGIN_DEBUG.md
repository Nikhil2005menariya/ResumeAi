# Google Login Troubleshooting Guide

## ✅ Code Changes Applied

All code is now fixed! Here's what was updated:

1. ✅ Added `/auth0-verify` route alias in backend
2. ✅ Fixed API call to use correct parameter name (`access_token`)
3. ✅ Added detailed console logging for debugging
4. ✅ Updated callback page with better error handling

## 🔧 Required Auth0 Setup

### **CRITICAL: You MUST do these in Auth0 Dashboard**

#### 1. Update Allowed Callback URLs

Go to: **Auth0 Dashboard → Applications → Your App → Settings**

Find **"Allowed Callback URLs"** and set to:
```
http://localhost:5173/callback
```
Or if you want both ports:
```
http://localhost:5173/callback, http://localhost:5174/callback
```

Click **SAVE CHANGES** at the bottom!

#### 2. Enable Google Social Connection

Go to: **Auth0 Dashboard → Authentication → Social**

If you see Google in the list:
- Click on it
- Make sure it's **enabled** for your application
- Click **Save**

If you DON'T see Google:
- Click **+ Create Connection**
- Select **Google**
- Choose **"Use Auth0's Developer Keys"** (easiest for testing)
- Click **Create**
- Enable it for your application
- Click **Save**

## 🧪 Testing Steps

1. **Refresh the frontend**: Go to http://localhost:5173
2. **Open Browser DevTools**: Press F12
3. **Go to Console tab**: You'll see detailed logs
4. **Click "Continue with Google"**
5. **Watch the console logs**:
   ```
   Auth0 user: { email: "...", name: "...", ... }
   Got Auth0 token, length: 1234
   Calling backend verification...
   Backend verification successful: { user: {...}, access_token: "..." }
   ```

## 🐛 Common Errors & Fixes

### Error: "Callback URL mismatch"
**Cause**: Auth0 callback URL not configured
**Fix**: Add `http://localhost:5173/callback` to Allowed Callback URLs in Auth0

### Error: "connection not found: google-oauth2"
**Cause**: Google connection not enabled in Auth0
**Fix**: Enable Google in Auth0 → Authentication → Social

### Error: "Failed to complete authentication"
**Check browser console** - it will show the actual error from backend:

- **"Invalid Auth0 token"**: Token verification failed
  - Make sure Auth0 domain/clientId match in frontend `.env`
  - Check Auth0 API audience is correct
  
- **401 Unauthorized**: Backend can't verify token
  - Check backend `.env` has correct Auth0 credentials
  - Make sure backend Auth0 service is working

- **Network error**: Backend not running
  - Check backend is running: `curl http://localhost:8000/health`

### Button just reloads page (no redirect)
**Causes**:
1. Auth0 credentials missing/wrong in frontend `.env`
2. Google connection not enabled
3. JavaScript error in console

**Fix**: Check browser console for errors

## 📋 Verification Checklist

Before testing, verify:

- [ ] Backend running on port 8000: `curl http://localhost:8000/health`
- [ ] Frontend running on port 5173: Open http://localhost:5173
- [ ] Frontend `.env` has Auth0 credentials:
  ```
  VITE_AUTH0_DOMAIN=nik-2005.us.auth0.com
  VITE_AUTH0_CLIENT_ID=l61sYMEykfteZddtatxPZRfX1NprGqez
  VITE_AUTH0_AUDIENCE=https://nik-2005.us.auth0.com/api/v2/
  ```
- [ ] Backend `.env` has Auth0 credentials (same domain, client ID, secret)
- [ ] Auth0 Allowed Callback URLs includes `/callback`
- [ ] Google connection enabled in Auth0

## 🔍 Debug with Console

Open browser console (F12) and run:

```javascript
// Check Auth0 config
console.log({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE
})

// Should show your Auth0 credentials
```

## ✅ Expected Flow

1. Click "Continue with Google"
2. Redirects to Auth0 Universal Login
3. Shows Google sign-in button
4. Click Google → redirects to Google login
5. Login with Google account
6. Google redirects back to Auth0
7. Auth0 redirects to `http://localhost:5173/callback`
8. Callback page:
   - Gets Auth0 token
   - Calls backend `/api/auth/auth0-verify`
   - Backend verifies token and creates/finds user
   - Returns JWT token
   - Frontend stores token
   - Redirects to `/dashboard`
9. You're logged in! 🎉

## 🆘 Still Not Working?

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Check backend logs**: `tail -f /Users/niksmac/Desktop/resumeMaker/backend/backend.log`
3. **Restart both servers**:
   ```bash
   # Kill backend
   lsof -ti:8000 | xargs kill -9
   
   # Kill frontend  
   lsof -ti:5173 | xargs kill -9
   
   # Restart backend
   cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload
   
   # Restart frontend
   cd frontend && npm run dev
   ```

## 💡 Alternative: Use Email/Password

If Google login is too complex for now, the email/password flow works perfectly:

1. Click "Create an account"
2. Enter email, password, name
3. Click Sign Up
4. Check your email for 6-digit OTP code
5. Enter OTP → You're in!

This is already fully functional and doesn't require Auth0 setup.

## 📝 Next Steps After Google Works

Once Google login works, you can:
- Add more social connections (GitHub, LinkedIn, etc.)
- Customize Auth0 login page
- Add MFA (multi-factor authentication)
- Set up custom domains

---

**Try it now!** 
1. Make sure Auth0 settings are updated
2. Refresh http://localhost:5173
3. Click "Continue with Google"
4. Watch the console logs

If you still get "Failed to complete authentication", share the **exact error from the browser console** and I'll help debug!
