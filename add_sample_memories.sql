-- Add sample memories to existing Berkeley Memory Map
-- Run this in your Supabase SQL Editor

-- First, let's check what's already in the memories table
SELECT COUNT(*) as existing_memories FROM public.memories;

-- Insert sample memories (only if they don't already exist)
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

-- Check how many memories we have now
SELECT COUNT(*) as total_memories FROM public.memories;

-- Show all memories
SELECT id, place_name, summary, lat, lng, privacy FROM public.memories ORDER BY created_at DESC;
