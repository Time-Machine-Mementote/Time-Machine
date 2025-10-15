-- Quick test query to verify database setup
-- Run this in Supabase SQL Editor after running the migrations

-- Test 1: Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('memories', 'memory_links', 'plays', 'places', 'friendships')
ORDER BY table_name;

-- Test 2: Check if sample memories were inserted
SELECT 
  id,
  place_name,
  text,
  lat,
  lng,
  privacy,
  created_at
FROM public.memories 
WHERE source = 'seed'
ORDER BY created_at;

-- Test 3: Check if PostGIS is working
SELECT 
  place_name,
  ST_AsText(geom) as geometry,
  ST_Distance(geom, ST_SetSRID(ST_MakePoint(-122.2585, 37.8721), 4326)) as distance_from_campanile
FROM public.memories 
WHERE source = 'seed'
LIMIT 3;

-- Test 4: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
