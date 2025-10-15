-- Berkeley Memory Map Database Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create memories table (anchored to exact coords with optional time window)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Create memory_links table (recursion / recall / retell links)
CREATE TABLE IF NOT EXISTS public.memory_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  to_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  relation TEXT CHECK (relation IN ('original','recall','retell','inspired_by')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plays table (traversal / playback analytics - "times traveled")
CREATE TABLE IF NOT EXISTS public.plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  heard_at TIMESTAMPTZ DEFAULT NOW(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  device_info JSONB
);

-- Create places table (cached geocoded locations)
CREATE TABLE IF NOT EXISTS public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
  confidence DOUBLE PRECISION,
  place_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create friendships table (for friends-only privacy)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending','accepted','blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on all tables
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memories
CREATE POLICY "Public memories are visible to all" ON public.memories
  FOR SELECT USING (privacy = 'public');

CREATE POLICY "Friends memories are visible to friends" ON public.memories
  FOR SELECT USING (
    privacy = 'friends' AND (
      author_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE (user_id = auth.uid() AND friend_id = author_id AND status = 'accepted')
        OR (friend_id = auth.uid() AND user_id = author_id AND status = 'accepted')
      )
    )
  );

CREATE POLICY "Private memories are visible only to author" ON public.memories
  FOR SELECT USING (privacy = 'private' AND author_id = auth.uid());

CREATE POLICY "Users can insert their own memories" ON public.memories
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own memories" ON public.memories
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own memories" ON public.memories
  FOR DELETE USING (author_id = auth.uid());

-- RLS Policies for memory_links
CREATE POLICY "Memory links are visible to memory owners" ON public.memory_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memories WHERE id = from_id AND author_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.memories WHERE id = to_id AND author_id = auth.uid())
  );

CREATE POLICY "Users can create memory links for their memories" ON public.memory_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.memories WHERE id = from_id AND author_id = auth.uid())
  );

-- RLS Policies for plays
CREATE POLICY "Users can view their own plays" ON public.plays
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own plays" ON public.plays
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for places (public read, authenticated write)
CREATE POLICY "Places are visible to all" ON public.places
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert places" ON public.places
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for friendships
CREATE POLICY "Users can view their own friendships" ON public.friendships
  FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own friendships" ON public.friendships
  FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_author_id ON public.memories(author_id);
CREATE INDEX IF NOT EXISTS idx_memories_geom ON public.memories USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_memories_privacy ON public.memories(privacy);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_parent_memory_id ON public.memories(parent_memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_links_from_id ON public.memory_links(from_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_to_id ON public.memory_links(to_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_relation ON public.memory_links(relation);

CREATE INDEX IF NOT EXISTS idx_plays_user_id ON public.plays(user_id);
CREATE INDEX IF NOT EXISTS idx_plays_memory_id ON public.plays(memory_id);
CREATE INDEX IF NOT EXISTS idx_plays_heard_at ON public.plays(heard_at DESC);

CREATE INDEX IF NOT EXISTS idx_places_geom ON public.places USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_places_name ON public.places(name);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Create function to handle user creation (update existing)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at column to memories table if it doesn't exist
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
