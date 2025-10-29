-- Create memories table for Berkeley Memory Map
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create memories table (anchored to exact coords with optional time window)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS Policies for memories
CREATE POLICY "Public memories are visible to all" ON public.memories
  FOR SELECT USING (privacy = 'public');

CREATE POLICY "Users can insert their own memories" ON public.memories
  FOR INSERT WITH CHECK (author_id = auth.uid() OR author_id IS NULL);

CREATE POLICY "Users can update their own memories" ON public.memories
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own memories" ON public.memories
  FOR DELETE USING (author_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_author_id ON public.memories(author_id);
CREATE INDEX IF NOT EXISTS idx_memories_geom ON public.memories USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_memories_privacy ON public.memories(privacy);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at DESC);

-- Insert some sample memories
INSERT INTO public.memories (
  id,
  author_id,
  text,
  lat,
  lng,
  radius_m,
  place_name,
  privacy,
  summary,
  extracted_places,
  extracted_times,
  extracted_people,
  source
) VALUES 
(
  gen_random_uuid(),
  NULL, -- No author required for public seed data
  'Oct 2, 2025 when Cory and I saw the world through the Time Machine.',
  37.8721,
  -122.2585,
  25,
  'Campanile',
  'public',
  'Time Machine vision with Cory',
  '[{"name": "Campanile", "hint": "campus landmark", "lat": 37.8721, "lng": -122.2585, "confidence": 0.95, "place_type": "poi"}]',
  '[{"start": "Oct 2, 2025"}]',
  ARRAY['Cory'],
  'seed'
),
(
  gen_random_uuid(),
  NULL,
  'Thinking about the Little Miami River at South 180 Farms, Mariemont, Ohio.',
  37.8719,
  -122.2585,
  40,
  'Memorial Glade',
  'public',
  'Memories of Little Miami River',
  '[{"name": "Memorial Glade", "hint": "campus landmark", "lat": 37.8719, "lng": -122.2585, "confidence": 0.95, "place_type": "poi"}]',
  '[]',
  ARRAY[]::TEXT[],
  'seed'
),
(
  gen_random_uuid(),
  NULL,
  'Late night study session with Sarah in the Doe Library stacks.',
  37.8723,
  -122.2587,
  30,
  'Doe Library',
  'public',
  'Late night study with Sarah',
  '[{"name": "Doe Library", "hint": "campus landmark", "lat": 37.8723, "lng": -122.2587, "confidence": 0.95, "place_type": "poi"}]',
  '[{"start": "late night"}]',
  ARRAY['Sarah'],
  'seed'
),
(
  gen_random_uuid(),
  NULL,
  'First day of classes, overwhelmed by all the student groups tabling at Sproul Plaza.',
  37.8696,
  -122.2593,
  35,
  'Sproul Plaza',
  'public',
  'First day overwhelm at Sproul',
  '[{"name": "Sproul Plaza", "hint": "campus landmark", "lat": 37.8696, "lng": -122.2593, "confidence": 0.95, "place_type": "poi"}]',
  '[{"start": "first day of classes"}]',
  ARRAY[]::TEXT[],
  'seed'
)
ON CONFLICT DO NOTHING;
