# Berkeley Memory Map: Geo-Audio Output System - Implementation Summary

## ✅ Completed Features

### 1. Database Schema & PostGIS
- ✅ Added `emotion` field to `memories` table (0-1 scale for scoring)
- ✅ Created `nearby_memories` RPC function for efficient spatial queries
- ✅ PostGIS indexes for fast geospatial queries
- ✅ Migration file: `supabase/migrations/20250121000000_output_branch_schema.sql`

### 2. Memory Scoring System
- ✅ Implemented `computeMemoryScore()` function using:
  - **Distance factor**: Gaussian falloff (70% weight)
  - **Emotion factor**: Memory emotion value (30% weight)
- ✅ File: `src/utils/memoryScoring.ts`
- ✅ Integrated with audio queue system

### 3. Geo-Fencing with Turf.js
- ✅ Refactored `useGeofencing` hook to use Turf.js for accurate distance calculations
- ✅ Automatic detection of memories within 20m radius
- ✅ Prioritizes closest memory using scoring function
- ✅ File: `src/hooks/useGeofencing.ts`

### 4. Audio Queue System
- ✅ Fade in/out transitions (500ms)
- ✅ Memory scoring integration
- ✅ Prevents overlapping playback
- ✅ Cooldown system (90s default)
- ✅ File: `src/utils/audioQueue.ts`

### 5. MapScreen Enhancements
- ✅ Pulsing animations for memories within 20m radius
- ✅ Glowing aura effect when active
- ✅ Memory markers with click-to-play
- ✅ Smooth camera updates following user location
- ✅ File: `src/components/MapScreen.tsx`

### 6. Memory Density Heatmap
- ✅ Toggleable heatmap layer showing memory concentration
- ✅ Color intensity based on emotion values
- ✅ Zoom-aware radius and opacity
- ✅ UI toggle button in control panel

### 7. Quiet Mode Toggle
- ✅ Mute/unmute button in control panel
- ✅ Integrates with audio queue system
- ✅ Stops current playback when muted

### 8. Audio Generation (OpenAI TTS)
- ✅ Supabase Edge Function for audio generation using OpenAI TTS
- ✅ Optional Adobe Firefly support (falls back to OpenAI if not configured)
- ✅ Uploads to Supabase Storage (`memory_audio` bucket)
- ✅ File: `supabase/functions/generate-audio-firefly/index.ts`

## 📋 Setup Instructions

### 1. Database Migration
Run the migration in your Supabase SQL Editor:
```sql
-- File: supabase/migrations/20250121000000_output_branch_schema.sql
```

This will:
- Add `emotion` column to `memories` table
- Create `nearby_memories` RPC function
- Add spatial indexes

### 2. Environment Variables
Add to `.env.local`:
```env
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key       # Required for audio generation
ADOBE_FIRELLY_KEY=your_firefly_key   # Optional (not needed if using OpenAI)
```

### 3. Supabase Storage ✅
Create a bucket named `memory_audio`:
```sql
-- In Supabase Dashboard → Storage → New Bucket
-- Name: memory_audio
-- Public: true
```

**Status**: ✅ Bucket created and ready for audio storage.

**Note**: The Edge Function uses `SERVICE_ROLE_KEY` which has full access. If you need to allow direct client uploads, you may need to add storage policies:
- Go to Storage → Policies → `memory_audio` bucket
- Add policies for INSERT (if allowing client uploads) and SELECT (for public read access)

### 4. Deploy Edge Function
```bash
supabase functions deploy generate-audio-firefly
```

Set environment variables in Supabase Dashboard:
- `OPENAI_API_KEY` (required for audio generation)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADOBE_FIRELLY_KEY` (optional - only if you want to use Firefly instead of OpenAI)

## 🎯 Core Functionality

### Memory Scoring Formula
```typescript
score = 0.7 * distanceFactor + 0.3 * emotionFactor

// distanceFactor uses Gaussian falloff:
exp(-d² / (2 * 10²))
```

### Geo-Fencing Logic
1. User location updates every 2 seconds (configurable)
2. Queries `nearby_memories` RPC function within 20m radius
3. Scores all memories using `computeMemoryScore()`
4. Selects highest scoring memory
5. Adds to audio queue if not in cooldown
6. Plays with fade transitions

### Audio Playback Flow
1. Memory enters 20m radius → marker pulses
2. Scoring function ranks memory
3. If highest priority → added to queue
4. Audio fades in over 500ms
5. Plays to completion
6. Fades out → next memory plays

## 🗺️ Map Features

### Memory Markers
- **Color coding**: 
  - Purple: Public memories
  - Orange: Friends-only
  - Red: Private
- **Pulsing**: When within 20m radius
- **Glow effect**: Radial gradient aura animation
- **Click to play**: Manual audio generation

### Heatmap Layer
- Shows memory density across campus
- Intensity based on emotion values
- Toggle with Layers button
- Purple color scheme matching memory theme

## 🔧 Configuration

### Geofence Settings
Edit `src/types/memory.ts`:
```typescript
export const DEFAULT_GEOFENCE_CONFIG: GeofenceConfig = {
  sampleInterval: 2000,    // Location check interval (ms)
  maxDistance: 100,         // Max search radius (m)
  cooldownMs: 90000,        // Memory cooldown (ms)
  defaultRadius: 30,        // Default memory radius (m)
};
```

### Memory Scoring Weights
```typescript
export const PRIORITY_WEIGHTS = {
  OWNER: 3,       // Your own memories
  FRIEND: 2,      // Friend memories
  PUBLIC: 1,      // Public memories
  DISTANCE: 0.1,  // Per meter bonus
  FRESHNESS: 0.01 // Per hour bonus
};
```

## 🚀 Testing on Campus

1. **Enable location permissions** in browser
2. **Walk around UC Berkeley campus**
3. **Memories within 20m** will:
   - Pulse on the map
   - Auto-play audio narration
   - Show in "Now Playing" chip
4. **Toggle heatmap** to see memory density
5. **Click markers** to manually play memories

## 📱 PWA Features
- Installable on mobile devices
- Offline-friendly (cached memories)
- Responsive design
- Touch-optimized controls

## 🔍 Troubleshooting

### Memories not playing?
1. Check location permissions granted
2. Verify `nearby_memories` RPC exists
3. Check browser console for errors
4. Ensure memories have `audio_url` set

### Audio not generating?
1. Check Edge Function deployed
2. Verify API keys set in Supabase
3. Check Storage bucket exists
4. Review function logs in Supabase Dashboard

### Heatmap not showing?
1. Ensure memories have valid coordinates
2. Check browser console for Mapbox errors
3. Verify heatmap toggle is enabled

## 📝 Next Steps

### Optional Enhancements
- [ ] Dark/light mode theme toggle
- [ ] Audio waveform visualization
- [ ] Memory clustering at zoom levels
- [ ] Share memory via URL
- [ ] Export memory route as GPX
- [ ] Analytics dashboard for memory plays

### Performance Optimizations
- [ ] Cache nearby memories for 1 minute
- [ ] Debounce location updates
- [ ] Lazy load audio files
- [ ] Optimize marker rendering

## 🎨 UI/UX Notes

- **Shadcn/ui** components used throughout
- **Radial pulsing** animations for active memories
- **Fade transitions** for smooth audio playback
- **Mobile-first** responsive design
- **Accessibility** considerations with ARIA labels

## 📚 Key Files

- `src/components/MapScreen.tsx` - Main map component
- `src/hooks/useGeofencing.ts` - Location tracking & memory detection
- `src/utils/audioQueue.ts` - Audio playback management
- `src/utils/memoryScoring.ts` - Memory prioritization
- `src/services/memoryApi.ts` - Supabase API calls
- `supabase/functions/generate-audio-firefly/index.ts` - Audio generation
- `supabase/migrations/20250121000000_output_branch_schema.sql` - Database schema

---

**Status**: ✅ All core features implemented and ready for testing!

