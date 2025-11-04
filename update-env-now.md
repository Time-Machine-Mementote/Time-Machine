# ⚠️ URGENT: Update .env.local File

Your app is still using the OLD Supabase URL. Here's how to fix it:

## The Problem
- App is using: `https://iwwvjecrvgrdyptxhnwj.supabase.co` (old/deleted project)
- Should be using: `https://qhbrnotooiutpwwtadlx.supabase.co` (your project)

## Quick Fix

### Step 1: Open .env.local
1. Open file: `C:\Users\glalo\Time-Machine\.env.local`
2. If it doesn't exist, create it in the project root

### Step 2: Update/Create the File
Make sure it has EXACTLY this (replace `your-anon-key-here` with actual key):

```env
VITE_SUPABASE_URL=https://qhbrnotooiutpwwtadlx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:**
- No quotes around values
- No spaces: `VITE_SUPABASE_URL=https://...` (NOT `VITE_SUPABASE_URL = https://...`)
- Use the actual anon key from your Supabase dashboard

### Step 3: Get Your Anon Key
1. Go to: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx
2. Click **Settings** → **API**
3. Copy the **anon public** key (long JWT token starting with `eyJ...`)
4. Paste it in `.env.local` replacing `your-anon-key-here`

### Step 4: RESTART DEV SERVER
**.env.local is ONLY loaded when server starts!**

1. **Stop the server**: Go to terminal where `npm run dev` is running, press `Ctrl+C`
2. Wait until you see the cursor return (server stopped)
3. **Start fresh**: `npm run dev`
4. **Hard refresh browser**: `Ctrl+Shift+R`

### Step 5: Verify
After restart, check browser console (F12):
- Look for `Supabase client config:`
- `url:` should show `https://qhbrnotooiutpwwtadlx.supabase.co`
- `envUrl:` should NOT say `undefined`

## If Still Not Working

If after restarting you still see the old URL:
1. Double-check `.env.local` file location: `C:\Users\glalo\Time-Machine\.env.local`
2. Make sure file name is exactly `.env.local` (with the dot!)
3. Restart dev server again
4. Try incognito/private browser window to bypass cache

