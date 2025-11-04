-- Quick verification query - Run this in Supabase SQL Editor to confirm everything is set up correctly

-- 1. Check if anonymous insert policy exists
SELECT 
    policyname,
    cmd as operation,
    with_check as insert_condition
FROM pg_policies 
WHERE tablename = 'memories' 
  AND cmd = 'INSERT'
  AND (policyname LIKE '%anonymous%' OR policyname LIKE '%exhibition%');

-- 2. Check if author_id allows NULL
SELECT 
    column_name, 
    is_nullable,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ NULL allowed'
        ELSE '❌ NULL not allowed'
    END as status
FROM information_schema.columns 
WHERE table_name = 'memories' 
  AND column_name = 'author_id';

-- 3. Test insert (should work now)
INSERT INTO public.memories (
  text,
  lat,
  lng,
  place_name,
  privacy,
  source,
  author_id
) VALUES (
  'Test exhibition memory - ' || NOW()::TEXT,
  37.8721,
  -122.2585,
  'Test Location',
  'public',
  'art_exhibition',
  NULL
)
RETURNING 
  id, 
  text, 
  author_id, 
  source,
  created_at;

-- If the above insert works, you'll see a new row returned - that means everything is working! ✅

