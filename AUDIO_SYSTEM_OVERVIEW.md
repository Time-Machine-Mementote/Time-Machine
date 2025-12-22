# Audio System Architecture Overview

This document explains how audio is managed in the Time Machine app.

## 🎵 Audio Flow Diagram

```
User Location (GPS)
    ↓
useGeofencing Hook
    ↓
Finds Nearby Memories
    ↓
audioQueue.addMemory()
    ↓
Audio Queue System (audioQueue.ts)
    ├── Priority Calculation
    ├── Cooldown Management
    ├── Distance Filtering
    └── Queue Management
    ↓
Dual Audio Playback
    ├── Track 1 (audioElement)
    └── Track 2 (audioElement2)
    ↓
5-Second Segment Playback
    ↓
Media Session API (Lock Screen Controls)
```

## 📁 Key Files

### 1. `src/utils/audioQueue.ts` - Core Audio Queue System
**This is the main audio manager**

**Key Features:**
- **Dual Track Playback**: Can play 2 audio tracks simultaneously
- **Priority System**: Memories are prioritized by:
  - Owner vs Friend vs Public
  - Distance from user
  - Freshness (how new the memory is)
- **5-Second Segments**: Each memory plays in 5-second chunks, rotating through segments
- **Cooldown System**: 15-second cooldown prevents same memory from playing too frequently
- **Queue Management**: Randomly shuffles queue order (not strict priority order)

**Main Methods:**
```typescript
addMemory(memory, userLocation, isOwner, isFriend)  // Add memory to queue
mute()                                              // Pause all audio
unmute()                                            // Resume audio
skip()                                              // Skip current track
clear()                                             // Clear entire queue
getCurrentlyPlaying()                               // Get what's playing now
```

**Internal State:**
- `queue: AudioQueueItem[]` - Array of memories waiting to play
- `currentlyPlaying` - Track 1 current item
- `currentlyPlaying2` - Track 2 current item
- `audioElement` - HTML5 Audio element for track 1
- `audioElement2` - HTML5 Audio element for track 2
- `isMuted` - Mute state (starts as `true`)
- `cooldownMs` - 15 seconds between same memory plays
- `segmentDuration` - 5 seconds per segment

**Segment Playback Logic:**
- Each memory audio is divided into 5-second segments
- When a memory plays, it starts at the next segment (rotates through)
- After 5 seconds, it pauses and plays the next memory
- This creates a "mix" of overlapping memories

### 2. `src/hooks/useGeofencing.ts` - Location-Based Audio Triggering
**Connects location to audio queue**

**How it works:**
1. Tracks user's GPS location
2. Finds memories within radius using `getMemoriesInRadius()`
3. For each nearby memory:
   - Checks if user is owner/friend/public
   - Calls `audioQueue.addMemory()` to queue it
4. Updates `currentlyPlaying` state from audio queue

**Key Integration:**
```typescript
import { audioQueue } from '@/utils/audioQueue';

// When nearby memory found:
audioQueue.addMemory(memory, userLocation, isOwner, isFriend);
```

### 3. `src/hooks/useMemoryAudio.ts` - Manual Audio Playback
**For playing individual memories (not queue-based)**

**Use Cases:**
- User clicks "Play" on a memory card
- Manual audio generation and playback
- Not used for automatic geofencing playback

**Methods:**
- `playMemory(memory)` - Play a specific memory
- `generateAndPlay(memory)` - Generate audio if missing, then play
- `stopPlaying()` - Stop current playback

### 4. `src/utils/audioStorage.ts` - Audio File Management
**Handles uploading/deleting audio files**

**Functions:**
- `uploadAudioToStorage(audioBlob, memoryId, userId)` - Upload to Supabase Storage
- `deleteAudioFromStorage(fileUrl)` - Delete from Supabase Storage

**Storage Location:**
- Supabase Storage bucket: `audio-memories`
- Path: `{userId}/{memoryId}_{timestamp}.webm`

## 🎮 User Controls

### In MapScreen Component:
- **Output Button**: Toggles `mute()` / `unmute()` on audio queue
- **Skip Button**: Calls `audioQueue.skip()` to skip current track
- **Dev Portal**: Shows queue length and currently playing memory

### Media Session API:
- Lock screen controls (play/pause/skip)
- Works when app is in background
- Shows memory title/artist on lock screen

## 🔄 Audio Playback Flow

### 1. Memory Detection
```
User walks near memory location
    ↓
useGeofencing detects nearby memory
    ↓
Checks: distance < radius, not in cooldown, has audio_url
    ↓
Calls audioQueue.addMemory()
```

### 2. Queue Processing
```
Memory added to queue
    ↓
Priority calculated (owner > friend > public, distance, freshness)
    ↓
Queue shuffled randomly (not strict priority)
    ↓
If queue empty and not muted → playNext()
```

### 3. Playback
```
playNext() called
    ↓
Randomly selects from queue
    ↓
Assigns to Track 1 or Track 2 (whichever is free)
    ↓
Sets audioElement.src = memory.audio_url
    ↓
Plays audio
    ↓
After metadata loads → handleSegmentPlayback()
    ↓
Plays 5-second segment starting at next segment index
    ↓
After 5 seconds → pause, playNext()
```

### 4. Segment Rotation
```
Memory plays segment 0 (0-5s)
    ↓
Next time same memory plays → segment 1 (5-10s)
    ↓
Next time → segment 2 (10-15s)
    ↓
Wraps around when reaches end
```

## 🎛️ Configuration

### Audio Queue Settings:
- `cooldownMs`: 15000 (15 seconds) - Time before same memory can play again
- `segmentDuration`: 5 seconds - Length of each segment
- `volume`: 0.7 (70%) - Audio volume level
- `isMuted`: Starts as `true` - User must click Output to start

### Priority Weights (from `types/memory.ts`):
```typescript
PRIORITY_WEIGHTS = {
  OWNER: 1000,      // User's own memories
  FRIEND: 500,      // Friend's memories
  PUBLIC: 100,     // Public memories
  DISTANCE: 0.1,   // Per meter closer
  FRESHNESS: 10    // Per hour newer
}
```

## 🐛 Debugging

### Check Audio Queue State:
```javascript
// In browser console:
import { audioQueue } from '@/utils/audioQueue';

console.log('Queue length:', audioQueue.getQueueLength());
console.log('Currently playing:', audioQueue.getCurrentlyPlaying());
console.log('Queue items:', audioQueue.getQueue());
```

### Common Issues:

1. **Audio not playing:**
   - Check if `isMuted` is `true` (user needs to click Output)
   - Check browser autoplay policy (may need user interaction)
   - Check if memory has `audio_url`
   - Check console for errors

2. **Same memory playing too often:**
   - Check cooldown: `audioQueue.setCooldown(30000)` for 30 seconds
   - Check if memory is being added multiple times

3. **Audio stops unexpectedly:**
   - Check playback monitor (runs every 2 seconds)
   - Check for browser pause events
   - Check visibility change handling

## 📊 State Management

### Audio Queue (Singleton):
- Global instance: `export const audioQueue = new AudioQueue()`
- Shared across all components
- Persists for app lifetime

### React State:
- `useGeofencing` tracks `currentlyPlaying` from audio queue
- `MapScreen` tracks `isMuted` state
- Updates every 1 second to sync with audio queue

## 🔗 Integration Points

1. **Geofencing → Audio Queue:**
   - `useGeofencing` calls `audioQueue.addMemory()`
   - Updates when user location changes

2. **UI → Audio Queue:**
   - Output button: `audioQueue.mute()` / `unmute()`
   - Skip button: `audioQueue.skip()`
   - Dev Portal: `audioQueue.getQueueLength()`

3. **Media Session → Audio Queue:**
   - Lock screen controls call audio queue methods
   - Shows metadata from currently playing memory





