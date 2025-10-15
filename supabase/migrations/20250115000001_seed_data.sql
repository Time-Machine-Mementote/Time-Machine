-- Seed data for Berkeley Memory Map
-- Insert sample memories for UC Berkeley campus landmarks

-- Sample memory for Campanile
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
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
  'Oct 2, 2025 when Cory and I saw the world through the Time Machine.',
  37.8721,
  -122.2585,
  25,
  'Campanile',
  'public',
  'Time Machine vision with Cory',
  '[{"name": "Campanile", "hint": "campus landmark", "lat": 37.8721, "lng": -122.2585, "confidence": 0.95, "place_type": "poi"}]',
  '[{"start": "Oct 2, 2025"}]',
  '["Cory"]',
  'seed'
) ON CONFLICT DO NOTHING;

-- Sample memory for Memorial Glade
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
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
  'Thinking about the Little Miami River at South 180 Farms, Mariemont, Ohio.',
  37.8719,
  -122.2585,
  40,
  'Memorial Glade',
  'public',
  'Memories of Little Miami River',
  '[{"name": "Memorial Glade", "hint": "campus landmark", "lat": 37.8719, "lng": -122.2585, "confidence": 0.95, "place_type": "poi"}, {"name": "Little Miami River", "hint": "river", "lat": 39.1458, "lng": -84.3744, "confidence": 0.9, "place_type": "waterway"}, {"name": "South 180 Farms", "hint": "farm", "lat": 39.1458, "lng": -84.3744, "confidence": 0.8, "place_type": "poi"}, {"name": "Mariemont, Ohio", "hint": "city", "lat": 39.1458, "lng": -84.3744, "confidence": 0.95, "place_type": "place"}]',
  '[]',
  '[]',
  'seed'
) ON CONFLICT DO NOTHING;

-- Additional sample memory for Doe Library
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
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
  'Late night study session with Sarah in the Doe Library stacks. The quiet was perfect for our philosophy discussion.',
  37.8723,
  -122.2587,
  30,
  'Doe Library',
  'public',
  'Late night study with Sarah',
  '[{"name": "Doe Library", "hint": "campus landmark", "lat": 37.8723, "lng": -122.2587, "confidence": 0.95, "place_type": "poi"}]',
  '[{"start": "late night"}]',
  '["Sarah"]',
  'seed'
) ON CONFLICT DO NOTHING;

-- Sample memory for Sproul Plaza
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
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
  'First day of classes, overwhelmed by all the student groups tabling at Sproul Plaza.',
  37.8696,
  -122.2593,
  35,
  'Sproul Plaza',
  'public',
  'First day overwhelm at Sproul',
  '[{"name": "Sproul Plaza", "hint": "campus landmark", "lat": 37.8696, "lng": -122.2593, "confidence": 0.95, "place_type": "poi"}]',
  '[{"start": "first day of classes"}]',
  '[]',
  'seed'
) ON CONFLICT DO NOTHING;

-- Create a memory link between Campanile and Memorial Glade memories
-- (This would be done after the memories are created, linking them as "inspired_by")
INSERT INTO public.memory_links (
  from_id,
  to_id,
  relation
) 
SELECT 
  m1.id as from_id,
  m2.id as to_id,
  'inspired_by' as relation
FROM public.memories m1, public.memories m2
WHERE m1.place_name = 'Memorial Glade' 
  AND m2.place_name = 'Campanile'
  AND m1.source = 'seed'
  AND m2.source = 'seed'
ON CONFLICT DO NOTHING;
