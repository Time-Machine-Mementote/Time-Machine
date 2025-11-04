# 🚀 Apply Art Show Database Migration - QUICK STEPS

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
Go to: **https://supabase.com/dashboard**

### 2. Select Your Project
Click on project: **iwwvjecrvgrdyptxhnwj**

### 3. Open SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New Query**

### 4. Copy and Paste This SQL

```sql
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
```

### 5. Run the Migration
- Click the **Run** button (or press Ctrl+Enter)
- You should see "Success. No rows returned"

### 6. Verify It Worked
After running, test by typing this in a new query:

```sql
-- Quick test: Check if anonymous inserts work
SELECT 
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'memories' 
  AND policyname LIKE '%anonymous%' OR policyname LIKE '%insert%';
```

You should see the "Allow anonymous exhibition inserts" policy.

## ✅ Done!

After this, your art show app should be able to save memories without authentication errors.

## Test It

Go back to your app at http://localhost:8080 and try submitting a memory from the terminal page!

