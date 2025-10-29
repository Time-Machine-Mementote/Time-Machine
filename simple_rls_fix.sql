-- Simple fix for RLS policies (no warnings)
-- Run this in your Supabase SQL Editor

-- Check what's currently blocking access
SELECT COUNT(*) as total_memories, 
       COUNT(CASE WHEN privacy = 'public' THEN 1 END) as public_memories,
       COUNT(CASE WHEN author_id IS NULL THEN 1 END) as null_author_memories
FROM public.memories;

-- Show sample memories
SELECT id, privacy, author_id, place_name, summary, lat, lng 
FROM public.memories 
LIMIT 5;

-- Fix the RLS policy to allow public access
DROP POLICY IF EXISTS "Public memories are visible to all" ON public.memories;

CREATE POLICY "Public memories are visible to all" ON public.memories
  FOR SELECT USING (
    privacy = 'public' OR 
    author_id IS NULL OR
    privacy IS NULL
  );

-- Test the fix
SELECT COUNT(*) as accessible_memories FROM public.memories;
