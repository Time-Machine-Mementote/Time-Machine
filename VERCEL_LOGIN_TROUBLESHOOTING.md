# Vercel Login Troubleshooting Guide

If login works on localhost but not on Vercel, follow these steps:

## Step 1: Verify Environment Variables in Vercel

**This is the most common cause of login failures on Vercel.**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Verify these variables are set for **ALL environments** (Production, Preview, Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. **CRITICAL**: After adding/updating variables, you MUST redeploy:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**

## Step 2: Check Browser Console on Vercel

1. Open your Vercel app URL
2. Open DevTools (F12)
3. Go to **Console** tab
4. Look for:
   - `🔍 Supabase client config:` - Check if `envUrl` and `envKey` show "NOT SET" or "Missing"
   - `⚠️ VERCEL DEPLOYMENT WARNING:` - This indicates environment variables are missing
   - `🔍 Testing Supabase connection on Vercel...` - Connection test results

## Step 3: Verify Environment Variables Are Actually Set

In the browser console on Vercel, run:
```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing')
```

If either shows `undefined`, the environment variables are not set correctly.

## Step 4: Check Supabase CORS Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Under **CORS**, add your Vercel domain:
   - `https://your-app.vercel.app`
   - `https://*.vercel.app` (for preview deployments)

## Step 5: Clear Service Worker (If Needed)

If you see service worker errors:

1. Open DevTools (F12)
2. Go to **Application** tab → **Service Workers**
3. Click **Unregister** for any registered service workers
4. Go to **Application** tab → **Storage** → **Clear site data**
5. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Step 6: Check Network Tab

1. Open DevTools (F12) → **Network** tab
2. Try to sign in
3. Look for failed requests (red)
4. Check:
   - Request URL (should be to `*.supabase.co`)
   - Status code (401, 403, CORS error?)
   - Response body

## Common Issues and Solutions

### Issue: "Configuration Error: Environment variables not set in Vercel"
**Solution**: 
- Go to Vercel Dashboard → Settings → Environment Variables
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure to select **Production**, **Preview**, and **Development**
- **Redeploy** after adding variables

### Issue: Environment variables show in Vercel but still not working
**Solution**:
- Make sure variable names start with `VITE_`
- Check that you selected all environments (Production, Preview, Development)
- **Redeploy** - environment variables only apply to new deployments
- Check Vercel build logs to verify variables are being used

### Issue: CORS error in console
**Solution**:
- Add your Vercel domain to Supabase CORS settings
- Check Supabase project is active (not paused)

### Issue: "Failed to fetch" or Network error
**Solution**:
- Check if Supabase project is active
- Verify URL is correct: `https://iwwvjecrvgrdyptxhnwj.supabase.co`
- Check browser console for specific error details
- Verify network connectivity

## Quick Diagnostic Checklist

- [ ] Environment variables set in Vercel Dashboard
- [ ] Variables applied to all environments (Production, Preview, Development)
- [ ] Redeployed after setting variables
- [ ] Browser console shows environment variables are present
- [ ] Supabase CORS includes Vercel domain
- [ ] Supabase project is active
- [ ] Service worker is not interfering (check DevTools)

## Still Not Working?

1. Check Vercel build logs for errors
2. Compare browser console output between localhost and Vercel
3. Verify Supabase project URL and key are correct
4. Test Supabase connection directly: `curl https://iwwvjecrvgrdyptxhnwj.supabase.co/rest/v1/`

