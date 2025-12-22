// Shared hook for output playback (used by Ghost Mode and secret triggers)
import { useState, useEffect, useRef, useCallback } from 'react';
import { audioQueue } from '@/utils/audioQueue';
import { getMemoriesInRadius } from '@/services/memoryApi';
import type { Memory, UserLocation } from '@/types/memory';
import { toast } from 'sonner';

interface UseOutputPlaybackOptions {
  enabled?: boolean;
  userId?: string;
  location?: UserLocation | null;
  radiusM?: number;
}

interface UseOutputPlaybackReturn {
  isOutputEnabled: boolean;
  toggleOutput: () => Promise<void>;
  startOutput: () => Promise<void>;
  stopOutput: () => void;
}

// Helper function to filter memories by radius (same logic as Ghost Mode)
function filterMemoriesByRadius(memories: Memory[], lat: number, lng: number): Memory[] {
  return memories.filter(memory => {
    if (!memory.latitude || !memory.longitude || !memory.radius_m) {
      return false;
    }
    const distance = calculateDistance(lat, lng, memory.latitude, memory.longitude);
    return distance <= memory.radius_m;
  });
}

// Helper function to calculate distance (same as Ghost Mode)
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

/**
 * Shared hook for output playback - reuses Ghost Mode logic
 * Handles starting/stopping continuous area audio playback
 */
export function useOutputPlayback({
  enabled = false,
  userId,
  location,
  radiusM = 100,
}: UseOutputPlaybackOptions): UseOutputPlaybackReturn {
  const [isOutputEnabled, setIsOutputEnabled] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load persisted state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tm_output_enabled');
    if (saved === 'true') {
      setIsOutputEnabled(true);
    }
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('tm_output_enabled', isOutputEnabled ? 'true' : 'false');
  }, [isOutputEnabled]);

  // Add memories to queue (same logic as Ghost Mode)
  const addMemoriesToQueue = useCallback(async (lat: number, lng: number, memories: Memory[]) => {
    if (!userId) return;

    for (const memory of memories) {
      if (!memory.audio_url) continue;
      
      const isOwner = memory.author_id === userId;
      const isFriend = false; // Could be enhanced with friend checking
      
      audioQueue.addMemory(
        memory,
        { lat, lng, accuracy: 0 },
        isOwner,
        isFriend,
        false // skipDistanceCheck
      );
    }
  }, [userId]);

  // Start continuous playback (same as Ghost Mode)
  const startOutput = useCallback(async () => {
    if (!location || !location.lat || !location.lng) {
      toast.error('Location required', {
        description: 'Please enable location access to start output playback.',
      });
      return;
    }

    try {
      // Unlock audio first (required for mobile)
      await audioQueue.unlockAudio();

      // Clear existing queue
      audioQueue.clear();

      // Fetch memories in radius
      const memoriesInBoundingBox = await getMemoriesInRadius(location.lat, location.lng, radiusM);
      const memoriesInRadius = filterMemoriesByRadius(memoriesInBoundingBox, location.lat, location.lng);
      const memoriesWithAudio = memoriesInRadius.filter(m => m.audio_url);

      if (memoriesWithAudio.length === 0) {
        toast.info('No audio memories found', {
          description: `No memories with audio found within ${radiusM}m radius.`,
        });
        return;
      }

      // Add initial memories to queue
      await addMemoriesToQueue(location.lat, location.lng, memoriesWithAudio);

      // Unmute to start playing
      audioQueue.unmute();
      setIsOutputEnabled(true);
      isInitializedRef.current = true;

      // Start continuous playback - periodically re-add memories to keep queue filled
      intervalRef.current = setInterval(async () => {
        try {
          const freshInBoundingBox = await getMemoriesInRadius(location.lat, location.lng, radiusM);
          const freshInRadius = filterMemoriesByRadius(freshInBoundingBox, location.lat, location.lng);
          const freshWithAudio = freshInRadius.filter(m => m.audio_url);
          if (freshWithAudio.length > 0) {
            await addMemoriesToQueue(location.lat, location.lng, freshWithAudio);
          }
        } catch (err) {
          console.warn('[output] Background fetch error:', err);
        }
      }, 10000); // Refresh every 10 seconds

      toast.success('Output enabled', {
        description: `Playing ${memoriesWithAudio.length} memories in radius.`,
      });
    } catch (error) {
      console.error('[output] Start error:', error);
      toast.error('Failed to start output', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [location, radiusM, userId, addMemoriesToQueue]);

  // Stop playback
  const stopOutput = useCallback(() => {
    audioQueue.mute();
    audioQueue.clear();
    setIsOutputEnabled(false);
    isInitializedRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    toast.info('Output disabled');
  }, []);

  // Toggle output
  const toggleOutput = useCallback(async () => {
    if (isOutputEnabled) {
      stopOutput();
    } else {
      await startOutput();
    }
  }, [isOutputEnabled, startOutput, stopOutput]);

  // Auto-start if enabled prop changes to true
  // Note: This effect is intentionally minimal - enabled is always false in our use case
  // so this won't trigger, but it's here for future use
  useEffect(() => {
    if (enabled && !isOutputEnabled && !isInitializedRef.current && location) {
      startOutput();
    } else if (!enabled && isOutputEnabled) {
      stopOutput();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isOutputEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isOutputEnabled,
    toggleOutput,
    startOutput,
    stopOutput,
  };
}

