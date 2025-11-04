-- Art Show Migration: Allow anonymous inserts for exhibition
-- This allows the art exhibition to create memories without authentication

-- Ensure author_id can be NULL (in case this wasn't applied)
ALTER TABLE public.memories 
ALTER COLUMN author_id DROP NOT NULL;

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own memories" ON public.memories;
DROP POLICY IF EXISTS "Allow anonymous exhibition inserts" ON public.memories;
DROP POLICY IF EXISTS "Allow exhibition inserts" ON public.memories;

-- Create new policy that allows anonymous inserts for art exhibition
-- This allows inserts with NULL author_id OR when source is 'art_exhibition'
CREATE POLICY "Allow anonymous exhibition inserts" ON public.memories
  FOR INSERT WITH CHECK (
    author_id = auth.uid() OR 
    author_id IS NULL OR
    source = 'art_exhibition'
  );

-- Also ensure public memories are always readable
DROP POLICY IF EXISTS "Public memories are visible to all" ON public.memories;
CREATE POLICY "Public memories are visible to all" ON public.memories
  FOR SELECT USING (privacy = 'public');

-- Ensure RLS is enabled
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.memories TO anon, authenticated;

