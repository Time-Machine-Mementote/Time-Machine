// Shared hook for output playback (used by Ghost Mode and secret triggers)
import { useState, useEffect, useRef, useCallback } from 'react';
import { audioQueue } from '@/utils/audioQueue';
import { startAreaOutputPlayback, refreshAreaOutputMemories, OUTPUT_RADIUS_M } from '@/utils/areaOutputPlayback';
import type { UserLocation } from '@/types/memory';
import { toast } from 'sonner';

interface UseOutputPlaybackOptions {
  enabled?: boolean;
  userId?: string;
  location?: UserLocation | null;
  radiusM?: number;
  // Optional: function to request location if not available
  requestLocation?: () => Promise<UserLocation | null>;
}

interface UseOutputPlaybackReturn {
  isOutputEnabled: boolean;
  toggleOutput: () => Promise<void>;
  startOutput: () => Promise<void>;
  stopOutput: () => void;
}

/**
 * Shared hook for output playback - reuses Ghost Mode logic
 * Handles starting/stopping continuous area audio playback
 */
export function useOutputPlayback({
  enabled = false,
  userId,
  location,
  radiusM = OUTPUT_RADIUS_M,
  requestLocation,
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

  // Start continuous playback - uses shared utility (same as Ghost Mode)
  const startOutput = useCallback(async () => {
    // Step 1: Ensure location is available
    let currentLocation = location;
    
    if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
      // Try to request location if function provided
      if (requestLocation) {
        console.log('[output] Location not available, requesting...');
        currentLocation = await requestLocation();
      }
      
      if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
        toast.error('Location required', {
          description: 'Location required for output playback. Please enable location access.',
        });
        return;
      }
    }

    // Step 2: Use shared playback function (same as Ghost Mode)
    const result = await startAreaOutputPlayback(currentLocation, userId, radiusM);

    if (!result.success) {
      if (result.memoriesFound === 0) {
        toast.info('No memories found', {
          description: `No memories found within ${radiusM}m radius.`,
        });
      } else if (result.memoriesWithAudio === 0) {
        toast.info('No audio memories found', {
          description: `Found ${result.memoriesFound} memories but none have audio recordings.`,
        });
      } else {
        toast.error('Failed to start output', {
          description: result.error || 'Unknown error',
        });
      }
      return;
    }

    // Step 3: Mark as enabled and start continuous refresh
    setIsOutputEnabled(true);
    isInitializedRef.current = true;

    // Start continuous playback - periodically refresh memories (same as Ghost Mode)
    // Use a ref to track the location used for refresh (updates if location state changes)
    const locationForRefreshRef = { current: currentLocation };
    intervalRef.current = setInterval(async () => {
      try {
        // Use latest location from state if available, otherwise use stored location
        // This allows the refresh to use updated location if user moves
        const latestLocation = location || locationForRefreshRef.current;
        if (latestLocation && latestLocation.lat && latestLocation.lng) {
          locationForRefreshRef.current = latestLocation; // Update ref for next iteration
          await refreshAreaOutputMemories(latestLocation, userId, radiusM);
        }
      } catch (err) {
        console.warn('[output] Background refresh error:', err);
      }
    }, 10000); // Refresh every 10 seconds (same as Ghost Mode)

    toast.success('Output enabled', {
      description: `Playing ${result.memoriesWithAudio} memories in radius.`,
    });
  }, [location, radiusM, userId, requestLocation]);

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

