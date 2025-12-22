# Vercel Deployment Guide

## Setting Up Environment Variables in Vercel

The "failed to fetch" error occurs because environment variables are not configured in Vercel. Follow these steps:

### Step 1: Go to Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and log in
2. Select your project (Time-Machine)

### Step 2: Add Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

#### Required Variables:

```
VITE_SUPABASE_URL=https://iwwvjecrvgrdyptxhnwj.supabase.co
```

```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3d3ZqZWNydmdyZHlwdHhobndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjA1MTksImV4cCI6MjA2OTM5NjUxOX0.QtsLSAKhi6opNHtODrTbbPQP6JczGXsmIIaWX5-Kyk8
```

```
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw
```

### Step 3: Apply to All Environments
- Make sure to select **Production**, **Preview**, and **Development** for each variable
- Click **Save**

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

### Step 5: Verify
After redeployment, check:
1. Open your Vercel URL
2. Open browser console (F12)
3. Check for any errors
4. The Supabase connection should work now

## Troubleshooting

### Still getting "failed to fetch"?
1. **Check browser console** - Look for specific error messages
2. **Verify environment variables** - Make sure they're set correctly in Vercel
3. **Check Supabase CORS** - Make sure your Vercel domain is allowed in Supabase settings
4. **Clear browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### CORS Issues?
If you see CORS errors, you may need to:
1. Go to Supabase Dashboard → Settings → API
2. Add your Vercel domain to allowed origins
3. Or check if there are any CORS restrictions in your Supabase project

### Mapbox not loading?
- Verify `VITE_MAPBOX_TOKEN` is set correctly
- Check Mapbox dashboard to ensure token is active
- Make sure token has proper permissions






