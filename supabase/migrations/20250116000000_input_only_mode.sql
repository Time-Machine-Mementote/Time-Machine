-- Input-Only Mode Migration
-- This migration adds support for anonymous recording with phone number collection

-- Create phone_leads table for collecting phone numbers
CREATE TABLE IF NOT EXISTS public.phone_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'input-only'
);

-- Add phone column to memories table (nullable, for backward compatibility)
ALTER TABLE public.memories 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Make author_id nullable in memories table to support anonymous recordings
-- Note: This is a breaking change, but necessary for input-only mode
-- Existing records will keep their author_id, new anonymous ones will have NULL
ALTER TABLE public.memories 
  ALTER COLUMN author_id DROP NOT NULL;

-- Enable RLS on phone_leads
ALTER TABLE public.phone_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_leads
-- Allow anonymous inserts only (no reads for anon users)
CREATE POLICY "Allow anonymous inserts to phone_leads" ON public.phone_leads
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to read phone_leads (for admin purposes)
CREATE POLICY "Authenticated users can read phone_leads" ON public.phone_leads
  FOR SELECT 
  TO authenticated
  USING (true);

-- Update memories RLS policies to allow anonymous inserts
-- Keep existing policies, but add new one for anonymous inserts
CREATE POLICY "Allow anonymous inserts to memories" ON public.memories
  FOR INSERT 
  TO anon
  WITH CHECK (author_id IS NULL);

-- Update existing insert policy to allow NULL author_id for authenticated users too
DROP POLICY IF EXISTS "Users can insert their own memories" ON public.memories;
CREATE POLICY "Users can insert their own memories" ON public.memories
  FOR INSERT 
  WITH CHECK (author_id = auth.uid() OR author_id IS NULL);

-- Create index on phone_leads for querying
CREATE INDEX IF NOT EXISTS idx_phone_leads_created_at ON public.phone_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_leads_phone ON public.phone_leads(phone);

-- Create index on memories.phone for querying
CREATE INDEX IF NOT EXISTS idx_memories_phone ON public.memories(phone);

