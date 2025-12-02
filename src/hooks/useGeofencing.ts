// Geofencing Hook for Berkeley Memory Map
import { useState, useEffect, useRef, useCallback } from 'react';
import { getMemoriesInRadius, recordPlay } from '@/services/memoryApi';
import { audioQueue } from '@/utils/audioQueue';
import type { Memory, UserLocation, GeofenceConfig } from '@/types/memory';
import { DEFAULT_GEOFENCE_CONFIG } from '@/types/memory';

// Type definition for Wake Lock API
type WakeLockSentinel = {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
};

interface NavigatorWithWakeLock {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

interface UseGeofencingOptions {
  config?: Partial<GeofenceConfig>;
  enabled?: boolean;
  userId?: string;
}

interface GeofencingState {
  location: UserLocation | null;
  accuracy: number | null;
  isTracking: boolean;
  nearbyMemories: Memory[];
  currentlyPlaying: Memory | null;
  error: string | null;
}

export function useGeofencing(options: UseGeofencingOptions = {}) {
  const {
    config = {},
    enabled = true,
    userId
  } = options;

  const finalConfig = { ...DEFAULT_GEOFENCE_CONFIG, ...config };
  
  const [state, setState] = useState<GeofencingState>({
    location: null,
    accuracy: null,
    isTracking: false,
    nearbyMemories: [],
    currentlyPlaying: null,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const locationRef = useRef<UserLocation | null>(null); // Track current location to avoid stale closures

  // Update currently playing memory when audio queue changes
  useEffect(() => {
    const updateCurrentlyPlaying = () => {
      const playing = audioQueue.getCurrentlyPlaying();
      setState(prev => ({
        ...prev,
        currentlyPlaying: playing?.memory || null,
      }));
    };

    // Check every second for audio queue changes
    const checkInterval = setInterval(updateCurrentlyPlaying, 1000);
    
    return () => clearInterval(checkInterval);
  }, []);

  // Start location tracking
  const startTracking = useCallback(async () => {
    if (!enabled || !navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
      }));
      return;
    }

    try {
      // Request permissions
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (permission.state === 'denied') {
        setState(prev => ({
          ...prev,
          error: 'Location permission denied',
        }));
        return;
      }

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };

          // Update ref for use in interval callback (avoids stale closure)
          locationRef.current = newLocation;

          setState(prev => ({
            ...prev,
            location: newLocation,
            accuracy: position.coords.accuracy,
            isTracking: true,
            error: null,
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
          setState(prev => ({
            ...prev,
            error: `Location error: ${error.message}`,
            isTracking: false,
          }));
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );

      // Start periodic memory checking - use a ref to get latest location to avoid stale closure
      intervalRef.current = setInterval(async () => {
        // Get latest location from state by reading it at check time
        const currentLocation = locationRef.current;
        if (currentLocation) {
          await checkNearbyMemories(currentLocation);
        }
      }, finalConfig.sampleInterval);

      // Request wake lock to keep device awake (optional, for better background support)
      const nav = navigator as unknown as NavigatorWithWakeLock;
      if (nav.wakeLock) {
        try {
          wakeLockRef.current = await nav.wakeLock.request('screen');
          console.log('Wake lock acquired for background audio');
        } catch (err) {
          console.warn('Wake lock not available:', err);
        }
      }

    } catch (error) {
      console.error('Failed to start location tracking:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to start location tracking',
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, finalConfig.sampleInterval]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Release wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {
        // Ignore errors when releasing wake lock
      });
      wakeLockRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isTracking: false,
    }));
  }, []);

  // Check for nearby memories and trigger audio
  const checkNearbyMemories = useCallback(async (location: UserLocation) => {
    const now = Date.now();
    
    // Throttle checks
    if (now - lastCheckRef.current < finalConfig.sampleInterval) {
      return;
    }
    lastCheckRef.current = now;

    try {
      const memories = await getMemoriesInRadius(
        location.lat,
        location.lng,
        finalConfig.maxDistance
      );

      setState(prev => ({
        ...prev,
        nearbyMemories: memories,
      }));

      // Process each memory for audio queue
      for (const memory of memories) {
        // Calculate distance
        const distance = calculateDistance(
          location.lat, location.lng,
          memory.lat, memory.lng
        );

        // Check if within memory's radius
        if (distance <= memory.radius_m) {
          // Only add memories with audio URLs
          if (memory.audio_url) {
            // Determine relationship to user
            const isOwner = userId ? memory.author_id === userId : false;
            const isFriend = false; // TODO: Implement friendship checking

            // Add to audio queue
            console.log('Adding memory to queue - ID:', memory.id, 'Distance:', distance, 'Radius:', memory.radius_m, 'Audio URL:', memory.audio_url);
            audioQueue.addMemory(memory, location, isOwner, isFriend);
          } else {
            console.log('Memory has no audio_url, skipping:', memory.id);
          }

          // Record play if user is authenticated
          if (userId) {
            try {
              await recordPlay({
                user_id: userId,
                memory_id: memory.id,
                lat: location.lat,
                lng: location.lng,
                device_info: {
                  userAgent: navigator.userAgent,
                  timestamp: now,
                },
              });
            } catch (error) {
              console.warn('Failed to record play:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to check nearby memories:', error);
    }
  }, [finalConfig.maxDistance, finalConfig.sampleInterval, userId]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Audio controls
  const mute = useCallback(() => {
    audioQueue.mute();
  }, []);

  const unmute = useCallback(() => {
    audioQueue.unmute();
  }, []);

  const skip = useCallback(() => {
    audioQueue.skip();
  }, []);

  const clearQueue = useCallback(() => {
    audioQueue.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      audioQueue.cleanup();
    };
  }, [stopTracking]);

  // Auto-start tracking when enabled
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [enabled, startTracking, stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    mute,
    unmute,
    skip,
    clearQueue,
    calculateDistance,
  };
}
