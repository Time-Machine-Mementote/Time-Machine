-- Fix RLS policies to allow public access to memories
-- Run this in your Supabase SQL Editor

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'memories';

-- Check if there are any public memories
SELECT COUNT(*) as total_memories, 
       COUNT(CASE WHEN privacy = 'public' THEN 1 END) as public_memories,
       COUNT(CASE WHEN author_id IS NULL THEN 1 END) as null_author_memories
FROM public.memories;

-- Show sample memories to see their structure
SELECT id, privacy, author_id, place_name, summary, lat, lng 
FROM public.memories 
LIMIT 5;

-- Temporarily disable RLS to test (DANGER: Only for testing!)
-- ALTER TABLE public.memories DISABLE ROW LEVEL SECURITY;

-- Better approach: Update policies to allow anonymous access to public memories
DROP POLICY IF EXISTS "Public memories are visible to all" ON public.memories;

-- Create a more permissive policy for public memories
CREATE POLICY "Public memories are visible to all" ON public.memories
  FOR SELECT USING (
    privacy = 'public' OR 
    author_id IS NULL OR
    privacy IS NULL
  );

-- Also allow anonymous users to see memories with NULL author_id
CREATE POLICY "Anonymous access to public memories" ON public.memories
  FOR SELECT USING (
    privacy = 'public' OR 
    author_id IS NULL OR
    privacy IS NULL
  );

-- Test the query again
SELECT COUNT(*) as accessible_memories FROM public.memories;
