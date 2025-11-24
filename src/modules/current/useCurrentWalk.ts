// The Current: Main hook orchestrating location, nodes, poem generation, and playback

import { useState, useEffect, useRef, useCallback } from 'react';
import { findNearestNode, distanceMeters } from './locationEngine';
import { getSegmentById, getNodeBySlug, type Node, type Segment } from './nodes';
import { requestPoemLine } from './poemClient';
import { playAmbientForSegment, speakLine, stopAllAudio } from './audioEngine';
import { useVoiceManager } from './voiceManager';
import { supabase } from '@/integrations/supabase/client';

export type WalkStatus = 'idle' | 'playing' | 'paused';

export type UseCurrentWalkReturn = {
  status: WalkStatus;
  currentNode: Node | null;
  currentSegment: Segment | null;
  currentVoiceSlug: string;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  cycleVoice: () => void;
  locationError: GeolocationPositionError | null;
  // Debug mode functions
  setDebugNode: (nodeSlug: string | null) => void;
  isDebugMode: boolean;
};

const LOCATION_UPDATE_INTERVAL = 2000; // 2 seconds
const POEM_LINE_INTERVAL = 10000; // 10 seconds
const MIN_DISTANCE_FOR_NEW_LINE = 5; // meters

export function useCurrentWalk(): UseCurrentWalkReturn {
  const [status, setStatus] = useState<WalkStatus>('idle');
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [currentSegment, setCurrentSegment] = useState<Segment | null>(null);
  const [locationError, setLocationError] = useState<GeolocationPositionError | null>(null);
  const [recentLineIds, setRecentLineIds] = useState<string[]>([]);
  const [lastLineLocation, setLastLineLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [debugNodeSlug, setDebugNodeSlug] = useState<string | null>(null);

  const { currentVoiceSlug, cycleVoiceSlug } = useVoiceManager();
  const locationWatchId = useRef<number | null>(null);
  const poemIntervalRef = useRef<number | null>(null);
  const lastLocationRef = useRef<{ lat: number; lon: number } | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Check for debug mode from URL
  const isDebugMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('debug') === 'true';

  // Get user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id || null;
    });
  }, []);

  // Handle debug node override
  useEffect(() => {
    if (debugNodeSlug) {
      const node = getNodeBySlug(debugNodeSlug);
      if (node) {
        setCurrentNode(node);
        lastLocationRef.current = { lat: node.lat, lon: node.lon };
        const segment = getSegmentById(node.segmentId);
        if (segment) {
          setCurrentSegment(segment);
          if (status === 'playing') {
            playAmbientForSegment(segment.slug, segment.ambientUrl || null).catch((error) => {
              console.error('Failed to play ambient:', error);
            });
          }
        }
      }
    }
  }, [debugNodeSlug, status]);

  // Request location permission and start watching (skip if debug mode)
  useEffect(() => {
    if (debugNodeSlug) {
      // Skip GPS if debug node is set
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    const watchLocation = () => {
      locationWatchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          lastLocationRef.current = { lat: latitude, lon: longitude };
          setLocationError(null);

          // Find nearest node
          const nearestNode = findNearestNode(latitude, longitude);
          
          if (nearestNode && nearestNode.slug !== currentNode?.slug) {
            setCurrentNode(nearestNode);
            const segment = getSegmentById(nearestNode.segmentId);
            if (segment) {
              setCurrentSegment(segment);
              
              // Play ambient for new segment if playing
              if (status === 'playing') {
                playAmbientForSegment(segment.slug, segment.ambientUrl || null).catch((error) => {
                  console.error('Failed to play ambient:', error);
                });
              }
            }
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    };

    watchLocation();

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, [currentNode?.slug, status, debugNodeSlug]);

  // Generate poem lines on interval or distance
  useEffect(() => {
    if (status !== 'playing' || !currentNode) {
      if (poemIntervalRef.current !== null) {
        clearInterval(poemIntervalRef.current);
        poemIntervalRef.current = null;
      }
      return;
    }

    const generateLine = async () => {
      if (!currentNode || !lastLocationRef.current) return;

      // Check if we've moved enough distance
      if (lastLineLocation && lastLocationRef.current) {
        const distance = distanceMeters(
          lastLocationRef.current.lat,
          lastLocationRef.current.lon,
          lastLineLocation.lat,
          lastLineLocation.lon
        );

        if (distance < MIN_DISTANCE_FOR_NEW_LINE) {
          return; // Not moved enough
        }
      }

      try {
        console.log('📝 Requesting poem line for node:', currentNode.slug);
        
        const result = await requestPoemLine({
          userId: userIdRef.current,
          nodeSlug: currentNode.slug,
          voiceSlug: currentVoiceSlug,
          recentLineIds: recentLineIds.slice(0, 20), // Keep last 20
        });

        console.log('✅ Got poem line:', result.line);

        // Update recent line IDs
        setRecentLineIds((prev) => [...prev.slice(-19), result.lineId]);

        // Speak the line
        console.log('🔊 Starting to speak line...');
        await speakLine(result.line, { voiceSlug: currentVoiceSlug });
        console.log('✅ Finished speaking line');

        // Update last line location
        if (lastLocationRef.current) {
          setLastLineLocation(lastLocationRef.current);
        }
      } catch (error) {
        console.error('❌ Failed to generate/speak line:', error);
        // Don't crash, just log and continue
      }
    };

    // Generate first line after a short delay
    const initialTimeout = setTimeout(() => {
      generateLine();
    }, 3000);

    // Then generate on interval
    poemIntervalRef.current = window.setInterval(() => {
      generateLine();
    }, POEM_LINE_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (poemIntervalRef.current !== null) {
        clearInterval(poemIntervalRef.current);
      }
    };
  }, [status, currentNode, currentVoiceSlug, recentLineIds, lastLineLocation]);

  // Play function
  const play = useCallback(() => {
    setStatus('playing');
    if (currentSegment) {
      playAmbientForSegment(currentSegment.slug, currentSegment.ambientUrl || null).catch((error) => {
        console.error('Failed to play ambient:', error);
      });
    }
  }, [currentSegment]);

  // Pause function
  const pause = useCallback(() => {
    setStatus('paused');
    stopAllAudio();
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (status === 'playing') {
      pause();
    } else {
      play();
    }
  }, [status, play, pause]);

  // Cycle voice
  const cycleVoice = useCallback(() => {
    cycleVoiceSlug();
  }, [cycleVoiceSlug]);

  // Set debug node (for testing)
  const setDebugNode = useCallback((nodeSlug: string | null) => {
    setDebugNodeSlug(nodeSlug);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
      if (poemIntervalRef.current !== null) {
        clearInterval(poemIntervalRef.current);
      }
    };
  }, []);

  return {
    status,
    currentNode,
    currentSegment,
    currentVoiceSlug,
    play,
    pause,
    togglePlay,
    cycleVoice,
    locationError,
    setDebugNode,
    isDebugMode,
  };
}

