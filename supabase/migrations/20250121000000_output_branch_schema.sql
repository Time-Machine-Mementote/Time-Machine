-- Output Branch: Enhanced schema for geo-audio memory system
-- Adds emotion field and optimizes for location-based audio playback

-- Add emotion field to memories table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memories' AND column_name = 'emotion'
  ) THEN
    ALTER TABLE public.memories 
    ADD COLUMN emotion DOUBLE PRECISION DEFAULT 0.5 
    CHECK (emotion >= 0 AND emotion <= 1);
  END IF;
END $$;

-- Ensure geom column exists with proper indexing
CREATE INDEX IF NOT EXISTS idx_memories_geom ON public.memories USING GIST(geom);

-- Create nearby_memories RPC function for efficient spatial queries
CREATE OR REPLACE FUNCTION nearby_memories(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  text TEXT,
  created_at TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_m INTEGER,
  place_name TEXT,
  audio_url TEXT,
  privacy TEXT,
  emotion DOUBLE PRECISION,
  summary TEXT,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.author_id,
    m.text,
    m.created_at,
    m.lat,
    m.lng,
    m.radius_m,
    m.place_name,
    m.audio_url,
    m.privacy,
    COALESCE(m.emotion, 0.5) as emotion,
    m.summary,
    m.source
  FROM public.memories m
  WHERE 
    m.privacy = 'public'
    AND ST_DWithin(
      m.geom,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY 
    ST_Distance(
      m.geom,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) ASC,
    m.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION nearby_memories(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;

-- Create index on privacy for faster filtering
CREATE INDEX IF NOT EXISTS idx_memories_privacy_public ON public.memories(privacy) 
WHERE privacy = 'public';

-- Create index on emotion for scoring
CREATE INDEX IF NOT EXISTS idx_memories_emotion ON public.memories(emotion) 
WHERE emotion IS NOT NULL;

