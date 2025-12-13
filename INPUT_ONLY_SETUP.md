# Input-Only Mode Setup Guide

This document describes the setup required for the input-only mode feature.

## Overview

Input-only mode allows users to record audio without signing in. After the first recording, users are prompted to provide a phone number, which is then associated with all subsequent recordings.

## Database Setup

### 1. Run the Migration

Execute the migration file to set up the database schema:

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase SQL Editor
# Run: supabase/migrations/20250116000000_input_only_mode.sql
```

This migration:
- Creates `phone_leads` table for collecting phone numbers
- Adds `phone` column to `memories` table
- Makes `author_id` nullable in `memories` table (for anonymous recordings)
- Sets up RLS policies to allow anonymous inserts

### 2. Storage Bucket Configuration

**IMPORTANT**: You must configure Supabase Storage bucket policies to allow anonymous uploads.

1. Go to Supabase Dashboard → Storage → `audio-memories` bucket
2. Navigate to Policies tab
3. Add a new policy for anonymous uploads:

**Policy Name**: `Allow anonymous uploads to public-input-only folder`

**Policy Definition**:
```sql
-- Allow anonymous users to upload to public-input-only/ folder
CREATE POLICY "Allow anonymous uploads to public-input-only" 
ON storage.objects 
FOR INSERT 
TO anon
WITH CHECK (
  bucket_id = 'audio-memories' AND
  (storage.foldername(name))[1] = 'public-input-only'
);
```

**Alternative** (if using Supabase Dashboard UI):
- Target roles: `anon`
- Operation: `INSERT`
- Policy definition: `bucket_id = 'audio-memories' AND (storage.foldername(name))[1] = 'public-input-only'`

## Feature Flag

The feature is controlled by the `INPUT_ONLY_MODE` flag in `src/config/featureFlags.ts`.

- **Default in this branch**: `true` (enabled)
- **To disable**: Set `VITE_INPUT_ONLY_MODE=false` in environment variables, or change the default in the config file

## Files Changed

### New Files
- `src/config/featureFlags.ts` - Feature flag configuration
- `src/pages/InputOnlyPage.tsx` - Main input-only page component
- `src/components/PhoneModal.tsx` - Phone number collection modal
- `src/hooks/usePhoneLead.ts` - Hook for phone number management
- `src/hooks/useRecorder.ts` - Hook for audio recording
- `supabase/migrations/20250116000000_input_only_mode.sql` - Database migration

### Modified Files
- `src/App.tsx` - Updated routing to use InputOnlyPage when flag is enabled
- `src/utils/audioStorage.ts` - Added support for anonymous uploads

### Unchanged (Auth Code Preserved)
- `src/components/AuthGuard.tsx` - Auth code kept but not used in input-only mode
- `src/contexts/AuthContext.tsx` - Auth context preserved
- `src/components/AuthModal.tsx` - Auth modal preserved
- All other auth-related components remain unchanged

## Behavior

1. **First Visit**: User sees terminal-style description and Record button
2. **First Recording**: User records → stops → Phone modal appears
3. **Phone Submission**: User enters phone number → stored in localStorage and Supabase
4. **Subsequent Recordings**: All recordings include the stored phone number
5. **Phone Modal**: Only shows once per device/browser (tracked via localStorage)

## Reverting to Auth Mode

To re-enable the original auth flow:

1. Set `VITE_INPUT_ONLY_MODE=false` in environment variables
2. Or change `INPUT_ONLY_MODE` default to `false` in `src/config/featureFlags.ts`
3. The auth code will automatically be re-enabled

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Storage bucket policy allows anonymous uploads
- [ ] Visiting app shows InputOnlyPage (not auth)
- [ ] Recording works without sign-in
- [ ] Phone modal appears after first recording
- [ ] Phone number is saved to localStorage and database
- [ ] Subsequent recordings include phone number
- [ ] Phone modal doesn't show again after submission
- [ ] Recordings are saved with location (if granted)
- [ ] Recordings work without location (graceful degradation)

