# 🔍 Troubleshooting "Disconnected" Status

If the terminal shows "● DISCONNECTED", follow these steps:

## Step 1: Check Browser Console

1. Open the terminal page (`/terminal`)
2. Press **F12** to open browser DevTools
3. Click the **Console** tab
4. Look for messages starting with:
   - `Supabase client config:` - Shows the URL and key status
   - `Testing Supabase connection...` - Connection test started
   - Error messages with details

**What to look for:**
- If you see `envUrl: undefined` or `envKey: Missing` → `.env.local` not loaded
- If you see `Network error` → URL is wrong or project doesn't exist
- If you see `42P01` → Table doesn't exist (but connection works!)
- If you see `42501` → Permission denied (need to run SQL)

## Step 2: Verify .env.local File

1. Check that `.env.local` exists in project root (`C:\Users\glalo\Time-Machine`)
2. Open it and verify:
   ```env
   VITE_SUPABASE_URL=https://qhbrnotooiutpwwtadlx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
3. **Important:** 
   - No quotes around values
   - No spaces around `=`
   - Values are on one line

## Step 3: Restart Dev Server

**.env.local is only loaded when the dev server starts!**

1. Stop the dev server (press `Ctrl+C` in terminal)
2. Start it again: `npm run dev`
3. Hard refresh browser: `Ctrl+Shift+R` or `Ctrl+F5`

## Step 4: Verify Supabase Project

1. Go to: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx
2. Make sure the project is **active** (not paused)
3. Go to **Settings** → **API**
4. Verify the URL matches: `https://qhbrnotooiutpwwtadlx.supabase.co`
5. Copy the **anon public** key and make sure it matches your `.env.local`

## Step 5: Check Database Setup

1. In Supabase dashboard → **SQL Editor**
2. Run this to check if table exists:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'memories';
   ```

**If table doesn't exist:**
- Run `COMPLETE_DATABASE_SETUP.sql` in SQL Editor

**If table exists but still disconnected:**
- Run `COPY_THIS_SQL_ONLY.sql` to enable anonymous inserts

## Common Issues & Solutions

### Issue: "envUrl: undefined"
**Solution:** 
- `.env.local` file not found or not in project root
- Restart dev server after creating `.env.local`

### Issue: "Network error" or "Failed to fetch"
**Solution:**
- Check internet connection
- Verify Supabase URL is correct
- Make sure project isn't paused in dashboard

### Issue: "42501 Permission denied"
**Solution:**
- Run `COPY_THIS_SQL_ONLY.sql` in Supabase SQL Editor
- This enables anonymous inserts for art exhibition

### Issue: "42P01 relation does not exist"
**Solution:**
- Connection works! But table doesn't exist
- Run `COMPLETE_DATABASE_SETUP.sql` in SQL Editor

## Still Not Working?

1. **Check console output** - Copy the exact error message
2. **Verify .env.local format** - Show me (hide the actual key values)
3. **Try in incognito mode** - Rules out browser cache issues
4. **Check network tab** in DevTools - See if request is being made

