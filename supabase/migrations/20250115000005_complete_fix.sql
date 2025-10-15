-- Complete Fix for Berkeley Memory Map Database
-- Allow NULL author_id for public memories and insert seed data

-- First, modify the memories table to allow NULL author_id
ALTER TABLE public.memories 
ALTER COLUMN author_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL
ALTER TABLE public.memories 
DROP CONSTRAINT IF EXISTS memories_author_id_fkey;

ALTER TABLE public.memories 
ADD CONSTRAINT memories_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to handle NULL author_id
DROP POLICY IF EXISTS "Public memories are visible to all" ON public.memories;
DROP POLICY IF EXISTS "Users can insert their own memories" ON public.memories;

CREATE POLICY "Public memories are visible to all" ON public.memories
  FOR SELECT USING (privacy = 'public');

CREATE POLICY "Users can insert their own memories" ON public.memories
  FOR INSERT WITH CHECK (author_id = auth.uid() OR author_id IS NULL);

-- Now insert the seed data with NULL author_id
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
