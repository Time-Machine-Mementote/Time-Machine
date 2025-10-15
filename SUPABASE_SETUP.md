# Supabase Database Setup Instructions

## Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: iwwvjecrvgrdyptxhnwj

## Step 2: Run Database Migration
1. Click "SQL Editor" in the left sidebar
2. Click "New query"
3. Copy the entire content from: supabase/migrations/20250115000000_berkeley_memory_map.sql
4. Paste it into the SQL Editor
5. Click "Run" to execute

## Step 3: Add Sample Data
1. Create another "New query"
2. Copy the entire content from: supabase/migrations/20250115000001_seed_data.sql
3. Paste it into the SQL Editor
4. Click "Run" to add sample memories

## What This Creates:
- ✅ memories table (for storing memory data)
- ✅ memory_links table (for linking related memories)
- ✅ plays table (for tracking audio plays)
- ✅ places table (for cached geocoded locations)
- ✅ friendships table (for privacy controls)
- ✅ Sample memories for UC Berkeley landmarks
- ✅ Proper security policies (RLS)

## After Setup:
1. Restart your development server
2. Open http://localhost:8080/
3. The "Supabase Integration Test" should show "Connected"
4. You should see sample memories on the map!

## Troubleshooting:
- If you get errors, make sure you're running the migration file first, then the seed data
- Check that PostGIS extension is enabled in your Supabase project
- Verify your project has the correct permissions
