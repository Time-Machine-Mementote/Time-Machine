-- Complete Database Setup for Time Machine Art Exhibition
-- Run this in your Supabase SQL Editor after creating a new project
-- This creates everything needed for anonymous memory inserts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create memories table (author_id is NULLABLE for anonymous exhibition entries)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULLABLE for art exhibition
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  t_start TIMESTAMPTZ,
  t_end TIMESTAMPTZ,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
  radius_m INTEGER DEFAULT 30,
  place_name TEXT,
  audio_url TEXT,
  privacy TEXT CHECK (privacy IN ('private','friends','public')) DEFAULT 'public',
  tags TEXT[],
  parent_memory_id UUID REFERENCES public.memories(id),
  source TEXT DEFAULT 'user',
  model_version TEXT,
  summary TEXT,
  extracted_places JSONB,
  extracted_times JSONB,
  extracted_people TEXT[]
);

-- Enable RLS on memories table
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public memories are visible to all" ON public.memories;
DROP POLICY IF EXISTS "Users can insert their own memories" ON public.memories;
DROP POLICY IF EXISTS "Allow anonymous exhibition inserts" ON public.memories;
DROP POLICY IF EXISTS "Users can update their own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can delete their own memories" ON public.memories;

-- RLS Policies for memories

-- Public memories are visible to all
CREATE POLICY "Public memories are visible to all" ON public.memories
  FOR SELECT USING (privacy = 'public');

-- Allow anonymous inserts for art exhibition (NULL author_id or source = 'art_exhibition')
CREATE POLICY "Allow anonymous exhibition inserts" ON public.memories
  FOR INSERT WITH CHECK (
    author_id = auth.uid() OR 
    author_id IS NULL OR
    source = 'art_exhibition'
  );

-- Users can update their own memories
CREATE POLICY "Users can update their own memories" ON public.memories
  FOR UPDATE USING (author_id = auth.uid());

-- Users can delete their own memories
CREATE POLICY "Users can delete their own memories" ON public.memories
  FOR DELETE USING (author_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_author_id ON public.memories(author_id);
CREATE INDEX IF NOT EXISTS idx_memories_geom ON public.memories USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_memories_privacy ON public.memories(privacy);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_source ON public.memories(source);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.memories TO anon, authenticated;

-- Success! Your database is now set up.
-- Test by trying to insert a memory from the app!

