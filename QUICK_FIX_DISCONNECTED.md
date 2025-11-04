# ⚡ Quick Fix for "DISCONNECTED" Status

## Immediate Steps (Do These First!)

### 1. Check Browser Console (F12)
- Press **F12** → **Console** tab
- Look for `Supabase client config:` message
- **Tell me what it says** - especially:
  - What URL is shown?
  - Does it say `envUrl: undefined` or `envKey: Missing`?

### 2. Restart Dev Server
**.env.local is ONLY loaded when the server starts!**

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

After restart, **hard refresh browser**: `Ctrl+Shift+R`

### 3. Verify .env.local File
Open `.env.local` and check it has:
```env
VITE_SUPABASE_URL=https://qhbrnotooiutpwwtadlx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-actual-key...rest-of-key
```

**Important:**
- ✅ No quotes around values
- ✅ No spaces: `VITE_SUPABASE_URL=https://...` (not `VITE_SUPABASE_URL = https://...`)
- ✅ Actual anon key from Supabase dashboard (not placeholder text)

### 4. Click the Disconnected Status
The disconnected text is now **clickable** - click it to see troubleshooting steps in console!

### 5. Run Database Setup
If connection works but still shows disconnected, set up the database:

1. Go to: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx
2. Click **SQL Editor** → **New Query**
3. Copy **entire** `COMPLETE_DATABASE_SETUP.sql`
4. Paste and click **Run**

## Most Common Issues

### Issue: "envUrl: undefined" in console
**Fix:** 
- `.env.local` not found or server not restarted
- Check file exists in project root
- Restart dev server

### Issue: Still using old URL (iwwvjecrvgrdyptxhnwj)
**Fix:**
- `.env.local` not being read
- Make sure file is in `C:\Users\glalo\Time-Machine\.env.local`
- Restart dev server
- Hard refresh browser

### Issue: Network error in console
**Fix:**
- Check `.env.local` has correct URL: `https://qhbrnotooiutpwwtadlx.supabase.co`
- Verify anon key is correct
- Check Supabase project is active (not paused)

### Issue: "42501 Permission denied"
**Fix:**
- Connection works but database not set up
- Run `COMPLETE_DATABASE_SETUP.sql` in Supabase SQL Editor

## What to Tell Me

When you check the console, please share:
1. What does `Supabase client config:` show? (especially `envUrl` and `envKey`)
2. Any red error messages?
3. Did you restart the dev server after updating `.env.local`?

