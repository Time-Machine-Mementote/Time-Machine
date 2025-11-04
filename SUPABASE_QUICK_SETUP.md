# 🚀 Quick Supabase Setup for Time Machine

Your Supabase project (`iwwvjecrvgrdyptxhnwj`) no longer exists. Follow these steps to set up a new one.

## Option 1: Create a New Supabase Project (Recommended)

### Step 1: Create Supabase Account & Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in (free account works)
3. Click **"New Project"**
4. Fill in:
   - **Name**: `Time-Machine` (or any name you like)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - Click **"Create new project"**
5. Wait 2-3 minutes for project to be ready

### Step 2: Get Your Project Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (long JWT token)

### Step 3: Create `.env.local` File
Create a file named `.env.local` in your project root with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Mapbox (if you have it)
VITE_MAPBOX_TOKEN=your-mapbox-token

# OpenAI (if you have it)
VITE_OPENAI_API_KEY=your-openai-key
```

**Replace the values** with what you copied from Supabase!

### Step 4: Set Up the Database
1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the **ENTIRE** contents of `COMPLETE_DATABASE_SETUP.sql`
4. Click **"Run"** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"
6. ✅ Your database is ready!

### Step 5: Test It
1. Restart your dev server: `npm run dev`
2. Open the app and try submitting a memory
3. Check the terminal page - connection status should show "● CONNECTED"

## Option 2: Use Local Supabase (Advanced)

If you want to run Supabase locally:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Run migrations
supabase db reset
```

Then use `http://localhost:54321` as your Supabase URL.

## Troubleshooting

**"Cannot connect to Supabase"**
- Make sure `.env.local` exists in project root
- Restart dev server after creating `.env.local`
- Verify URL starts with `https://` and ends with `.supabase.co`
- Check Supabase dashboard - project should be active (not paused)

**"Permission denied" errors**
- Run the SQL from `COPY_THIS_SQL_ONLY.sql` in SQL Editor
- Make sure RLS policies are created

**Still having issues?**
- Check browser console (F12) for error messages
- Verify your `.env.local` file has correct values
- Make sure project isn't paused in Supabase dashboard

