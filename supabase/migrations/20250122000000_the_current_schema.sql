-- The Current: Database Schema
-- Creates tables for poetic voices, generated lines, and extends memories for time entries

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create poetic_voices table
CREATE TABLE IF NOT EXISTS public.poetic_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'en',
  tts_provider TEXT NOT NULL DEFAULT 'openai',
  tts_voice_id TEXT,
  style_instructions TEXT NOT NULL,
  sample_corpus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create generated_lines table
CREATE TABLE IF NOT EXISTS public.generated_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  node_id TEXT NOT NULL,
  voice_slug TEXT NOT NULL REFERENCES public.poetic_voices(slug),
  text TEXT NOT NULL,
  embedding vector(1536) NULL, -- OpenAI embeddings dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create time_entries table (for contextual memories)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  node_id TEXT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  medium TEXT NOT NULL DEFAULT 'text',
  text_content TEXT,
  audio_url TEXT,
  mood TEXT CHECK (mood IN ('joy', 'sadness', 'awe', 'anxiety', 'nostalgia', 'neutral')) DEFAULT 'neutral',
  tags TEXT[]
);

-- Enable RLS
ALTER TABLE public.poetic_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for poetic_voices (public read, admin write)
CREATE POLICY "Poetic voices are visible to all" ON public.poetic_voices
  FOR SELECT USING (true);

-- RLS Policies for generated_lines (users can read their own, insert their own)
CREATE POLICY "Users can read their own generated lines" ON public.generated_lines
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own generated lines" ON public.generated_lines
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- RLS Policies for time_entries (users can read/insert their own)
CREATE POLICY "Users can read their own time entries" ON public.time_entries
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_generated_lines_user_node_voice ON public.generated_lines(user_id, node_id, voice_slug);
CREATE INDEX IF NOT EXISTS idx_generated_lines_created_at ON public.generated_lines(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_node_id ON public.time_entries(node_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_lat_lon ON public.time_entries(lat, lon);
CREATE INDEX IF NOT EXISTS idx_poetic_voices_slug ON public.poetic_voices(slug);

-- Seed default poetic voice "Greg"
INSERT INTO public.poetic_voices (name, slug, language_code, tts_provider, tts_voice_id, style_instructions, sample_corpus)
VALUES (
  'Greg',
  'greg',
  'en',
  'openai',
  'alloy',
  'Write in a stream-of-consciousness style with concrete campus details. Use metaphors related to hippocampus and medial entorhinal cortex (MEC) when appropriate. Write in broken lines, intimate second person, present tense. Focus on sensory details, architectural textures, and the ephemeral quality of memory and place. Keep lines short, 1-2 sentences maximum. No explanations, no meta commentary.',
  'You stand in the middle of Wurster Courtyard. Concrete slabs rise around you, studio windows watching. The hippocampus maps this moment, but the MEC grid cells are already shifting. You are here, and you are not here. The echo under the Morrison eave folds time. Drafting tables hold the weight of unbuilt futures. You walk toward 4.0 Hill, and the grass slope opens like a memory you have not yet formed.'
)
ON CONFLICT (slug) DO NOTHING;

