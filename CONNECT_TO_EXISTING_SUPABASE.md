# 🔗 Connect to Your Existing Supabase Project

Follow these steps to connect to your existing project **"Time Machine map 10/14/2025"**.

## Step 1: Get Your Supabase Credentials

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Find and click on your project: **"Time Machine map 10/14/2025"**
3. Go to **Settings** → **API** (in the left sidebar)
4. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (a long JWT token starting with `eyJ...`)

## Step 2: Create or Update `.env.local` File

In your project root directory (`C:\Users\glalo\Time-Machine`), create or update `.env.local`:

```env
# Supabase Configuration - Your existing project
VITE_SUPABASE_URL=https://your-project-id-here.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Mapbox (if you have it)
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw

# OpenAI (if you have it)  
VITE_OPENAI_API_KEY=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
```

**Important:** Replace `https://your-project-id-here.supabase.co` and `your-anon-key-here` with the actual values from Step 1!

## Step 3: Check Database Setup

1. In Supabase dashboard, go to **SQL Editor**
2. Run this to check if the `memories` table exists:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'memories';
   ```

### If the table doesn't exist or needs setup:

1. Go to **SQL Editor** → **New Query**
2. Copy and paste the **ENTIRE** contents of `COMPLETE_DATABASE_SETUP.sql`
3. Click **"Run"** (or press Ctrl+Enter)
4. You should see "Success. No rows returned"

### If the table exists but anonymous inserts don't work:

1. Go to **SQL Editor** → **New Query**
2. Copy and paste the contents of `COPY_THIS_SQL_ONLY.sql`
3. Click **"Run"**
4. This will enable anonymous memory inserts for the art exhibition

## Step 4: Restart Dev Server

After updating `.env.local`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 5: Test Connection

1. Open the app in your browser
2. Navigate to the terminal page (`/terminal`)
3. Look at the header - it should show **"● CONNECTED"** in green
4. Try submitting a memory to verify it works!

## Troubleshooting

**"Still can't connect"**
- Double-check `.env.local` file exists in project root
- Make sure values don't have quotes around them
- Restart dev server after creating/updating `.env.local`
- Check browser console (F12) for the actual URL being used

**"Permission denied" when submitting**
- Run `COPY_THIS_SQL_ONLY.sql` in Supabase SQL Editor
- This enables anonymous inserts for the art exhibition

**"Table doesn't exist"**
- Run `COMPLETE_DATABASE_SETUP.sql` in Supabase SQL Editor
- This creates the entire database schema

