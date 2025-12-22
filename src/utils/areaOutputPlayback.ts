// Shared utility for area output playback (used by Ghost Mode and secret triggers)
// This ensures both paths use EXACTLY the same logic
import { audioQueue } from '@/utils/audioQueue';
import { getMemoriesInRadius } from '@/services/memoryApi';
import type { Memory, UserLocation } from '@/types/memory';
import { DEFAULT_GEOFENCE_CONFIG } from '@/types/memory';

// Standard radius constant - matches Ghost Mode (100 meters)
export const OUTPUT_RADIUS_M = DEFAULT_GEOFENCE_CONFIG?.maxDistance ?? 100;

// Helper function to calculate distance (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Filter memories by radius - same logic as Ghost Mode
// Each memory has its own radius_m - only include if point is within that radius
// Note: Memory type uses 'lat' and 'lng' fields (not 'latitude' and 'longitude')
export function filterMemoriesByRadius(memories: Memory[], lat: number, lng: number): Memory[] {
  return memories.filter(memory => {
    if (!memory.lat || !memory.lng || !memory.radius_m) {
      return false;
    }
    const distance = calculateDistance(lat, lng, memory.lat, memory.lng);
    return distance <= memory.radius_m;
  });
}

// Check if memory has audio - same logic as Ghost Mode
// Ghost Mode checks: memory.audio_url
export function hasAudio(memory: Memory): boolean {
  return !!memory.audio_url;
}

// Add memories to queue - same logic as Ghost Mode
// Note: Ghost Mode does NOT require userId to add memories (only for recording play)
export function addMemoriesToQueue(
  memories: Memory[],
  location: UserLocation,
  userId?: string
): void {
  for (const memory of memories) {
    if (!hasAudio(memory)) {
      continue;
    }
    
    // Determine relationship to user (same as Ghost Mode)
    const isOwner = userId ? memory.author_id === userId : false;
    const isFriend = false; // TODO: Implement friendship checking
    
    // Add to audio queue (same as Ghost Mode)
    audioQueue.addMemory(
      memory,
      location,
      isOwner,
      isFriend,
      false // skipDistanceCheck
    );
  }
}

// Start area output playback - shared entrypoint for Ghost Mode and secret triggers
export async function startAreaOutputPlayback(
  location: UserLocation,
  userId?: string,
  radiusM: number = OUTPUT_RADIUS_M
): Promise<{
  success: boolean;
  memoriesFound: number;
  memoriesWithAudio: number;
  error?: string;
}> {
  // Diagnostics (dev only)
  const isDev = import.meta.env.DEV;
  
  if (isDev) {
    console.group('[AREA_OUTPUT] Starting playback');
    console.log('📍 Coords:', { lat: location.lat, lng: location.lng, accuracy: location.accuracy });
    console.log('📏 Radius:', radiusM, 'm');
  }

  try {
    // Step 1: Fetch memories in bounding box (same as Ghost Mode)
    const memoriesInBoundingBox = await getMemoriesInRadius(location.lat, location.lng, radiusM);
    
    if (isDev) {
      console.log('📦 Total memories fetched:', memoriesInBoundingBox.length);
    }

    // Step 2: Apply strict radius filtering (same as Ghost Mode)
    // Each memory has its own radius_m - only include if point is within that radius
    const memoriesInRadius = filterMemoriesByRadius(memoriesInBoundingBox, location.lat, location.lng);
    
    if (isDev) {
      console.log('✅ Memories in radius:', memoriesInRadius.length);
      console.log('❌ Filtered out:', memoriesInBoundingBox.length - memoriesInRadius.length);
    }

    // Step 3: Filter to only memories with audio (same as Ghost Mode)
    const memoriesWithAudio = memoriesInRadius.filter(hasAudio);
    
    if (isDev) {
      console.log('🎵 Memories with audio:', memoriesWithAudio.length);
      if (memoriesWithAudio.length > 0) {
        console.log('📋 First 3 memory IDs:', memoriesWithAudio.slice(0, 3).map(m => ({
          id: m.id,
          audio_url: m.audio_url ? 'present' : 'missing',
          radius_m: m.radius_m,
        })));
      }
    }

    if (memoriesWithAudio.length === 0) {
      if (isDev) {
        console.warn('⚠️ No memories with audio found');
        console.groupEnd();
      }
      return {
        success: false,
        memoriesFound: memoriesInRadius.length,
        memoriesWithAudio: 0,
        error: 'No memories with audio found',
      };
    }

    // Step 4: Unlock audio first (required for mobile)
    await audioQueue.unlockAudio();

    // Step 5: Clear existing queue
    audioQueue.clear();

    // Step 6: Add memories to queue (same as Ghost Mode)
    addMemoriesToQueue(memoriesWithAudio, location, userId);

    // Step 7: Unmute to start playing
    audioQueue.unmute();

    if (isDev) {
      console.log('✅ Playback started successfully');
      console.groupEnd();
    }

    return {
      success: true,
      memoriesFound: memoriesInRadius.length,
      memoriesWithAudio: memoriesWithAudio.length,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AREA_OUTPUT] Error:', error);
    
    if (isDev) {
      console.error('❌ Playback failed:', errorMsg);
      console.groupEnd();
    }

    return {
      success: false,
      memoriesFound: 0,
      memoriesWithAudio: 0,
      error: errorMsg,
    };
  }
}

// Refresh memories for continuous playback - same as Ghost Mode
export async function refreshAreaOutputMemories(
  location: UserLocation,
  userId?: string,
  radiusM: number = OUTPUT_RADIUS_M
): Promise<number> {
  try {
    const memoriesInBoundingBox = await getMemoriesInRadius(location.lat, location.lng, radiusM);
    const memoriesInRadius = filterMemoriesByRadius(memoriesInBoundingBox, location.lat, location.lng);
    const memoriesWithAudio = memoriesInRadius.filter(hasAudio);
    
    if (memoriesWithAudio.length > 0) {
      addMemoriesToQueue(memoriesWithAudio, location, userId);
    }
    
    return memoriesWithAudio.length;
  } catch (err) {
    console.warn('[AREA_OUTPUT] Background refresh error:', err);
    return 0;
  }
}

