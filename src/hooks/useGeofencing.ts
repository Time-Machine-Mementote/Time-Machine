// Geofencing Hook for Berkeley Memory Map
// Uses Turf.js for distance calculation and memory scoring
import { useState, useEffect, useRef, useCallback } from 'react';
import { getNearbyMemories, recordPlay } from '@/services/memoryApi';
import { audioQueue } from '@/utils/audioQueue';
import { getBestMemory } from '@/utils/memoryScoring';
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import type { Memory, UserLocation, GeofenceConfig } from '@/types/memory';
import { DEFAULT_GEOFENCE_CONFIG } from '@/types/memory';

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
  const locationRef = useRef<UserLocation | null>(null);
  const checkNearbyMemoriesRef = useRef<((location: UserLocation) => Promise<void>) | null>(null);

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

  // Calculate distance using Turf.js
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    try {
      const point1 = point([lng1, lat1]);
      const point2 = point([lng2, lat2]);
      return distance(point1, point2, { units: 'meters' });
    } catch (error) {
      // Fallback to Haversine if Turf.js fails
      console.warn('Turf.js distance calculation failed, using Haversine:', error);
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
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
      // Use nearby_memories RPC for optimized PostGIS query
      const memories = await getNearbyMemories(
        location.lat,
        location.lng,
        finalConfig.maxDistance
      );

      setState(prev => ({
        ...prev,
        nearbyMemories: memories,
      }));

      // Use memory scoring to get the best memory to play
      const bestMemory = getBestMemory(memories, location);
      
      if (bestMemory) {
        // Only add to queue if memory has audio URL or we can generate it
        // For now, skip memories without audio_url (they need to be generated via click first)
        if (!bestMemory.audio_url) {
          console.log('Memory has no audio URL, skipping auto-play:', bestMemory.id);
          console.log('Click on memory marker to generate audio first');
          return;
        }

        // Determine relationship to user
        const isOwner = userId ? bestMemory.author_id === userId : false;
        const isFriend = false; // TODO: Implement friendship checking

        // Add best memory to audio queue (scoring ensures highest priority)
        audioQueue.addMemory(bestMemory, location, isOwner, isFriend);

        // Record play if user is authenticated
        if (userId) {
          try {
            await recordPlay({
              user_id: userId,
              memory_id: bestMemory.id,
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
    } catch (error) {
      console.error('Failed to check nearby memories:', error);
    }
  }, [finalConfig.maxDistance, finalConfig.sampleInterval, userId]);

  // Update ref when checkNearbyMemories changes
  useEffect(() => {
    checkNearbyMemoriesRef.current = checkNearbyMemories;
  }, [checkNearbyMemories]);

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

      // Start watching position with more lenient settings
      // Try high accuracy first, but fall back to less strict settings if it times out
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };

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
          
          // Provide helpful error messages
          let errorMessage = 'Location error: ';
          if (error.code === error.TIMEOUT) {
            errorMessage += 'Timeout expired. Please check your location settings and try again.';
          } else if (error.code === error.PERMISSION_DENIED) {
            errorMessage += 'Permission denied. Please allow location access in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage += 'Position unavailable. Check your device location settings.';
          } else {
            errorMessage += error.message || 'Unknown error';
          }
          
          setState(prev => ({
            ...prev,
            error: errorMessage,
            isTracking: false,
          }));
        },
        {
          enableHighAccuracy: false, // Less strict for faster response
          maximumAge: 30000, // Accept cached location up to 30 seconds old
          timeout: 20000, // Increased timeout to 20 seconds
        }
      );

      // Start periodic memory checking (optimized - only when location exists)
      intervalRef.current = setInterval(async () => {
        const currentLocation = locationRef.current;
        const checkFn = checkNearbyMemoriesRef.current;
        if (currentLocation && checkFn) {
          await checkFn(currentLocation);
        }
      }, finalConfig.sampleInterval);

    } catch (error) {
      console.error('Failed to start location tracking:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to start location tracking',
      }));
    }
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

    setState(prev => ({
      ...prev,
      isTracking: false,
    }));
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
