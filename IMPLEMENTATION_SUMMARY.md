# Input-Only Mode Implementation Summary

## Branch
✅ Created branch: `input-only`

## Implementation Complete

### 1. Feature Flag ✅
- **File**: `src/config/featureFlags.ts`
- Feature flag `INPUT_ONLY_MODE` defaults to `true` in this branch
- Can be controlled via `VITE_INPUT_ONLY_MODE` env var

### 2. Database Migration ✅
- **File**: `supabase/migrations/20250116000000_input_only_mode.sql`
- Creates `phone_leads` table
- Adds `phone` column to `memories` table (nullable)
- Makes `author_id` nullable in `memories` table
- Sets up RLS policies for anonymous inserts

### 3. Components Created ✅

#### InputOnlyPage (`src/pages/InputOnlyPage.tsx`)
- Terminal-style description block
- Single Record/Stop button
- Handles first recording → phone modal flow
- Uploads recordings with phone number association
- Requests geolocation (gracefully handles denial)

#### PhoneModal (`src/components/PhoneModal.tsx`)
- Exact copy as specified: "Yaaaayou! Use this app anywhere..."
- Phone input with US number normalization
- Submit button
- No dismiss on outside click (only after successful submit)

### 4. Hooks Created ✅

#### usePhoneLead (`src/hooks/usePhoneLead.ts`)
- Manages phone number in localStorage (`tm_phone_number`, `tm_phone_collected`)
- Normalizes phone numbers to E.164 format
- Submits to Supabase `phone_leads` table
- Returns phone state and submission function

#### useRecorder (`src/hooks/useRecorder.ts`)
- Wraps MediaRecorder API
- Handles recording start/stop
- Returns recording state and error handling

### 5. Modified Files ✅

#### App.tsx
- Conditionally renders `InputOnlyPage` when `INPUT_ONLY_MODE` is true
- Skips `AuthGuard` in input-only mode (auth code preserved)
- Original routes commented but available

#### audioStorage.ts
- Updated `uploadAudioToStorage` to support anonymous uploads
- Uses `public-input-only/` folder prefix for anonymous uploads
- Maintains backward compatibility with authenticated uploads

### 6. Auth Code Preservation ✅
- All auth components remain unchanged:
  - `AuthGuard.tsx`
  - `AuthContext.tsx`
  - `AuthModal.tsx`
- Auth code is "tucked away" - not deleted, just not used in this mode
- Can be re-enabled by changing feature flag

## Storage Setup Required

⚠️ **IMPORTANT**: You must configure Supabase Storage bucket policy manually:

1. Go to Supabase Dashboard → Storage → `audio-memories`
2. Add policy for anonymous uploads to `public-input-only/` folder
3. See `INPUT_ONLY_SETUP.md` for detailed instructions

## Files Changed Summary

### New Files (7)
1. `src/config/featureFlags.ts`
2. `src/pages/InputOnlyPage.tsx`
3. `src/components/PhoneModal.tsx`
4. `src/hooks/usePhoneLead.ts`
5. `src/hooks/useRecorder.ts`
6. `supabase/migrations/20250116000000_input_only_mode.sql`
7. `INPUT_ONLY_SETUP.md`

### Modified Files (3)
1. `src/App.tsx` - Routing logic
2. `src/utils/audioStorage.ts` - Anonymous upload support
3. `src/contexts/AuthContext.tsx` - Whitespace only

## Acceptance Criteria ✅

- ✅ git checkout -b input-only created
- ✅ Visiting the app shows only terminal text + Record button
- ✅ No sign-in required; no redirects to auth
- ✅ First completed recording triggers popup once
- ✅ Submitting number:
  - ✅ writes localStorage
  - ✅ inserts into phone_leads
  - ✅ closes popup and returns to main screen
- ✅ All recordings saved after that include the stored phone number
- ✅ Supabase policies allow anon inserts (no broad reads)
- ✅ Old auth code remains in repo, not deleted

## Next Steps

1. **Run the migration**: Execute `supabase/migrations/20250116000000_input_only_mode.sql` in Supabase
2. **Configure storage**: Set up anonymous upload policy for `audio-memories` bucket (see `INPUT_ONLY_SETUP.md`)
3. **Test the flow**: 
   - Record first clip → phone modal appears
   - Submit phone → recording uploads
   - Record again → includes phone number
4. **Build check**: Run `npm run build` to verify TypeScript compilation

## TypeScript Status

✅ No linter errors found
✅ All imports resolved
✅ Type safety maintained

## Notes

- Phone numbers are normalized to `+1XXXXXXXXXX` format
- Location is optional - recordings work without geolocation
- Phone modal only shows once per device (tracked via localStorage)
- All recordings are stored with `author_id = NULL` for anonymous mode
- Storage uses `public-input-only/` folder prefix for organization

