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
  const isStartingRef = useRef(false); // Guard against concurrent start calls

  // Note: We don't auto-load from localStorage to avoid conflicts
  // The state should be controlled explicitly by user actions
  // localStorage is only used for persistence, not initialization

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('tm_output_enabled', isOutputEnabled ? 'true' : 'false');
  }, [isOutputEnabled]);

  // Start continuous playback - uses shared utility (same as Ghost Mode)
  const startOutput = useCallback(async () => {
    // Guard against concurrent calls
    if (isStartingRef.current) {
      console.log('[output] Start already in progress, ignoring duplicate call');
      return;
    }
    
    if (isOutputEnabled) {
      console.log('[output] Already enabled, ignoring start call');
      return;
    }

    isStartingRef.current = true;

    try {
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
    } finally {
      isStartingRef.current = false;
    }
  }, [location, radiusM, userId, requestLocation, isOutputEnabled]);

  // Stop playback
  const stopOutput = useCallback(() => {
    // Guard: don't stop if already stopped
    if (!isOutputEnabled) {
      console.log('[output] Already disabled, ignoring stop call');
      return;
    }

    audioQueue.mute();
    audioQueue.clear();
    setIsOutputEnabled(false);
    isInitializedRef.current = false;
    isStartingRef.current = false; // Reset start guard

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    toast.info('Output disabled');
  }, [isOutputEnabled]);

  // Toggle output
  const toggleOutput = useCallback(async () => {
    if (isOutputEnabled) {
      stopOutput();
    } else {
      await startOutput();
    }
  }, [isOutputEnabled, startOutput, stopOutput]);

  // Auto-start if enabled prop changes to true
  // Note: In our use case, enabled is always false (controlled by gesture)
  // So this effect only handles the enabled=true case for future use
  // We do NOT auto-stop when enabled=false to avoid conflicts with gesture control
  useEffect(() => {
    if (enabled && !isOutputEnabled && !isInitializedRef.current && location) {
      startOutput();
    }
    // Note: We intentionally don't auto-stop when enabled=false
    // The gesture toggle should be the only way to stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

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

