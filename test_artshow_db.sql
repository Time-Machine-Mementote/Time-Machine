-- Quick test script for artshow database setup
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if author_id allows NULL
SELECT 
    column_name, 
    is_nullable, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'memories' 
  AND column_name = 'author_id';

-- 2. Check RLS policies on memories table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'memories'
ORDER BY policyname;

-- 3. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'memories';

-- 4. Test insert (should work if setup is correct)
-- Uncomment to test:
/*
INSERT INTO public.memories (
  text,
  lat,
  lng,
  place_name,
  privacy,
  source,
  author_id
) VALUES (
  'Test exhibition memory',
  37.8721,
  -122.2585,
  'Test Location',
  'public',
  'art_exhibition',
  NULL
)
RETURNING id, text, author_id;
*/

-- 5. Check recent memories
SELECT 
  id,
  text,
  author_id,
  source,
  place_name,
  created_at
FROM public.memories
ORDER BY created_at DESC
LIMIT 10;

