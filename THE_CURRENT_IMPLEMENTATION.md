# The Current: Implementation Summary

## Overview

"The Current" is a generative, node-based audio walk experience from Wurster Courtyard to the Campanile at UC Berkeley. This document summarizes the implementation and configuration.

## Architecture

### Frontend Modules (`src/modules/current/`)

1. **nodes.ts** - Static path and node definitions
   - 4 segments (Wurster, 4.0 Hill, Strawberry Creek, Campanile)
   - 14 nodes along the route
   - Helper functions for node/segment lookup

2. **locationEngine.ts** - GPS node detection
   - Haversine distance calculation
   - Nearest node detection within radius

3. **voiceManager.ts** - Poetic voice selection
   - Fetches voices from database
   - Manages current voice selection
   - Voice cycling functionality

4. **poemClient.ts** - API client for generating lines
   - Calls `/functions/v1/current-line` edge function
   - Handles errors and retries

5. **ttsClient.ts** - TTS abstraction layer
   - Provider-agnostic TTS interface
   - Uses existing `generate-audio` edge function
   - Fallback to browser TTS (stubbed)

6. **audioEngine.ts** - Audio playback management
   - Ambient loop playback with fade in/out
   - Speech playback via TTS
   - Audio state management

7. **useCurrentWalk.ts** - Main orchestration hook
   - Geolocation watching
   - Node detection and segment transitions
   - Poem line generation scheduling
   - Playback state management

### UI Component

- **CurrentExperienceScreen.tsx** (`src/pages/CurrentExperienceScreen.tsx`)
  - Ultra-minimal dark UI
  - Gesture controls:
    - Single tap: toggle play/pause
    - Double tap: cycle voice
    - Long press: stub for "Leave a Time here" (future)

### Backend

- **Edge Function**: `supabase/functions/current-line/index.ts`
  - Generates poetic lines using OpenAI GPT-4
  - Anti-repeat logic (string similarity + substring checks)
  - Context from nearby memories
  - Avoid list from recent lines

### Database Schema

Migration: `supabase/migrations/20250122000000_the_current_schema.sql`

**Tables:**
1. **poetic_voices** - Style and language configuration
2. **generated_lines** - History of generated lines (for anti-repeat)
3. **time_entries** - Contextual memories (can reuse `memories` table if preferred)

## Configuration

### 1. Poetic Voices (Style & Language)

Edit the `poetic_voices` table in Supabase:

```sql
-- View current voices
SELECT * FROM poetic_voices;

-- Update style instructions
UPDATE poetic_voices 
SET style_instructions = 'Your new style instructions here...'
WHERE slug = 'greg';

-- Add a new voice (e.g., French)
INSERT INTO poetic_voices (name, slug, language_code, tts_provider, tts_voice_id, style_instructions)
VALUES (
  'Marie',
  'marie',
  'fr',
  'openai',
  'nova',
  'Write in French, stream-of-consciousness style...'
);
```

**Fields:**
- `style_instructions`: System prompt-like style guide
- `sample_corpus`: Example writing samples
- `language_code`: Language for generation (e.g., 'en', 'fr')
- `tts_provider`: 'openai', 'elevenlabs', 'native' (currently only 'openai' implemented)
- `tts_voice_id`: Provider-specific voice ID (e.g., 'alloy', 'nova' for OpenAI)

### 2. TTS Provider and Voice IDs

**OpenAI TTS** (default):
- Voices: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
- Configured in `poetic_voices.tts_voice_id`

**To add ElevenLabs or other providers:**
1. Update `src/modules/current/ttsClient.ts` to handle new provider
2. Create edge function or update existing one
3. Update `poetic_voices.tts_provider` for voices using new provider

### 3. Node Coordinates

Edit `src/modules/current/nodes.ts` to refine coordinates:

```typescript
export const nodes: Node[] = [
  {
    id: 'node-wurster-center',
    // ... other fields
    lat: 37.8705,  // Update these
    lon: -122.2545,
    radius: 15,    // Detection radius in meters
    // ...
  },
  // ...
];
```

**To refine on campus:**
1. Get GPS coordinates at each node location
2. Update `lat` and `lon` in `nodes.ts`
3. Adjust `radius` for detection sensitivity (default: 10-20 meters)

## Routes

- **Route**: `/current`
- **Component**: `CurrentExperienceScreen`
- Added to `src/App.tsx`

## Deployment

### 1. Database Migration

Run the migration in Supabase:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor
# Copy contents of: supabase/migrations/20250122000000_the_current_schema.sql
```

### 2. Deploy Edge Function

```bash
supabase functions deploy current-line
```

Ensure environment variables are set:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Frontend Build

The frontend is already integrated. After deployment:

1. Navigate to `/current` in the app
2. Grant location permissions
3. Tap to start "The Current"

## Testing

### Manual Testing Checklist

- [ ] Location permission request works
- [ ] Node detection when walking route
- [ ] Segment transitions trigger ambient audio (if files added)
- [ ] Poem lines generate and speak
- [ ] Voice cycling works (double tap)
- [ ] Play/pause works (single tap)
- [ ] No duplicate lines for same node/voice
- [ ] Error handling for network issues

### Testing Node Detection

To test without walking:

1. Open browser DevTools
2. Override geolocation in console:
   ```javascript
   navigator.geolocation.getCurrentPosition = (success) => {
     success({ coords: { latitude: 37.8705, longitude: -122.2545 } });
   };
   ```

## Future Enhancements

1. **Ambient Audio Files**: Add per-segment ambient loops
2. **Embedding-based Anti-repeat**: Use vector similarity if embeddings service exists
3. **"Leave a Time here"**: Implement recording at nodes
4. **Multi-language Support**: Add more voices with different languages
5. **Offline Mode**: Cache lines and TTS for offline playback

## File Structure

```
src/
├── modules/
│   └── current/
│       ├── nodes.ts              # Path/node definitions
│       ├── locationEngine.ts     # GPS detection
│       ├── voiceManager.ts       # Voice selection
│       ├── poemClient.ts         # API client
│       ├── ttsClient.ts          # TTS abstraction
│       ├── audioEngine.ts        # Audio playback
│       └── useCurrentWalk.ts     # Main hook
├── pages/
│   └── CurrentExperienceScreen.tsx  # UI component
└── App.tsx                        # Route added

supabase/
├── migrations/
│   └── 20250122000000_the_current_schema.sql
└── functions/
    └── current-line/
        └── index.ts              # Edge function
```

## Notes

- The system is designed to be **generative** with effectively no textual repeat per user/node/voice
- **Style and language** are controlled by database entries (no code changes needed)
- **TTS provider** is abstracted and can be swapped easily
- **Minimal UI** - no maps, no visible buttons (gesture-based)

