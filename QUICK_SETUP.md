# 🚀 Berkeley Memory Map - Quick Setup Guide

## Step 1: Create Environment File
Create a file named `.env.local` in your project root with this content:

```
# Berkeley Memory Map Environment Variables
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw
MAPBOX_GEOCODING_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw
VITE_OPENAI_API_KEY=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

# Supabase Configuration (already configured)
VITE_SUPABASE_URL=https://iwwvjecrvgrdyptxhnwj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3d3ZqZWNydmdyZHlwdHhobndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjA1MTksImV4cCI6MjA2OTM5NjUxOX0.QtsLSAKhi6opNHtODrTbbPQP6JczGXsmIIaWX5-Kyk8
```

## Step 2: Set Up Supabase Database

### Option A: Using Supabase CLI (Recommended)
1. Install Supabase CLI: `npm install -g supabase`
2. Run: `supabase db reset --linked`

### Option B: Manual Database Setup
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `iwwvjecrvgrdyptxhnwj`
3. Go to SQL Editor
4. Run the migration files in order:
   - `supabase/migrations/20250115000000_berkeley_memory_map.sql`
   - `supabase/migrations/20250115000001_seed_data.sql`

## Step 3: Restart Development Server
```bash
npm run dev
```

## Step 4: Test the App
1. Open http://localhost:8080/ (or whatever port it shows)
2. Allow location access when prompted
3. Check the "Supabase Integration Test" widget - should show "Connected"

## Troubleshooting

### "Mapbox token not configured"
- Make sure `.env.local` file exists and has the correct content
- Restart the development server after creating the file

### "Location error: Timeout expired"
- Click "Allow" when your browser asks for location permission
- Make sure you're using HTTPS or localhost (not HTTP on other domains)

### "relation 'public.memories' does not exist"
- Run the Supabase database migrations (Step 2 above)
- Check that your Supabase project is properly linked

## 🎯 What You Should See
- ✅ Berkeley campus map loads
- ✅ Green dot in "Supabase Integration Test" widget
- ✅ Sample memories appear on the map
- ✅ Location permission granted (blue dot shows your position)
