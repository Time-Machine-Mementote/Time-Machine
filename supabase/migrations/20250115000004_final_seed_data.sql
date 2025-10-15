-- Fixed Seed Data for Berkeley Memory Map
-- Handle user authentication properly

-- Option 1: Create a test user first (if you want to test with authentication)
-- Uncomment the lines below if you want to create a test user
/*
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@berkeley.edu',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"full_name": "Test User"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;
*/

-- Option 2: Insert memories with NULL author_id (public memories)
-- This is simpler and doesn't require authentication setup
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
