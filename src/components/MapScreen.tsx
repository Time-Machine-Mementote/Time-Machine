// Berkeley Memory Map - Main Map Component (Optimized)
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useGeofencing } from '@/hooks/useGeofencing';
import { useMemoryAudio } from '@/hooks/useMemoryAudio';
import { AddMemorySheet } from '@/components/AddMemorySheet';
import { NowPlayingChip } from '@/components/NowPlayingChip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Plus } from 'lucide-react';
import { BERKELEY_CAMPUS_CENTER, BERKELEY_CAMPUS_ZOOM } from '@/types/memory';
import type { Memory } from '@/types/memory';

// Set Mapbox access token (optimized - only log in dev)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else if (import.meta.env.DEV) {
  console.error('Mapbox token not found in environment variables');
}

interface MapScreenProps {
  userId?: string;
}

export function MapScreen({ userId }: MapScreenProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pulseStyleRef = useRef<HTMLStyleElement | null>(null);
  const lastAccuracyRef = useRef<number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Geofencing hook (lazy load after map loads)
  const {
    location,
    accuracy,
    isTracking,
    nearbyMemories,
    currentlyPlaying,
    error,
    mute,
    unmute,
    skip,
    clearQueue,
  } = useGeofencing({
    enabled: isMapLoaded, // Only start tracking after map loads
    userId,
  });

  // Memory audio hook for click-to-play functionality
  const { generateAndPlay, isGenerating, isPlaying, stopPlaying } = useMemoryAudio();

  // Handle memory click - generate and play audio (defined before useEffect)
  const handleMemoryClick = useCallback(async (memory: Memory) => {
    setSelectedMemory(memory);
    
    // Fly to memory location
    if (map.current) {
      map.current.flyTo({
        center: [memory.lng, memory.lat],
        zoom: 18,
        duration: 1000,
      });
    }

    // Generate and play audio narration
    await generateAndPlay(memory);
  }, [generateAndPlay]);

  // Add UC Berkeley campus styling (memoized) - defined before useEffect that uses it
  const addBerkeleyCampusStyle = useCallback(() => {
    if (!map.current) return;

    // Add campus landmarks as custom markers (only once)
    const landmarks = [
      { id: 'landmark-campanile', name: 'Campanile', lat: 37.8721, lng: -122.2585, type: 'landmark' },
      { id: 'landmark-memorial-glade', name: 'Memorial Glade', lat: 37.8719, lng: -122.2585, type: 'landmark' },
      { id: 'landmark-doe-library', name: 'Doe Library', lat: 37.8723, lng: -122.2587, type: 'building' },
      { id: 'landmark-sproul-plaza', name: 'Sproul Plaza', lat: 37.8696, lng: -122.2593, type: 'plaza' },
      { id: 'landmark-sather-gate', name: 'Sather Gate', lat: 37.8696, lng: -122.2593, type: 'gate' },
    ];

    landmarks.forEach(landmark => {
      // Skip if already added
      if (markersRef.current.has(landmark.id)) return;

      const el = document.createElement('div');
      el.className = 'campus-landmark';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: ${landmark.type === 'landmark' ? '#1f2937' : '#3b82f6'};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([landmark.lng, landmark.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${landmark.name}</strong>`))
        .addTo(map.current!);
      
      markersRef.current.set(landmark.id, marker);
    });
  }, []);

  // Initialize map (optimized - faster loading)
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    // Create map with performance optimizations
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: BERKELEY_CAMPUS_CENTER,
      zoom: BERKELEY_CAMPUS_ZOOM,
      pitch: 0,
      bearing: 0,
      antialias: false, // Better performance
      fadeDuration: 0, // Instant transitions
    });

    // Set up pulse animation once (not on every render)
    if (!pulseStyleRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      pulseStyleRef.current = style;
    }

    map.current.on('load', () => {
      setIsMapLoaded(true);
      // Defer non-critical operations
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          addBerkeleyCampusStyle();
        }, { timeout: 1000 });
      } else {
        setTimeout(addBerkeleyCampusStyle, 100);
      }
    });

    map.current.on('error', (e) => {
      if (import.meta.env.DEV) console.error('Map error:', e);
    });

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, [addBerkeleyCampusStyle]);

  // Update user location marker (optimized - update existing marker instead of recreating)
  useEffect(() => {
    if (!map.current || !location || !isMapLoaded) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: #10b981;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      `;

      userMarkerRef.current = new mapboxgl.Marker(el).addTo(map.current);
    }

    // Update position (much faster than recreating)
    userMarkerRef.current.setLngLat([location.lng, location.lat]);
    
    // Update popup only if accuracy changed significantly
    if (accuracy) {
      const shouldUpdate = !lastAccuracyRef.current || Math.abs(accuracy - lastAccuracyRef.current) > 5;
      if (shouldUpdate) {
        userMarkerRef.current.setPopup(new mapboxgl.Popup().setHTML(`
          <div>
            <strong>Your Location</strong><br>
            Accuracy: ${Math.round(accuracy)}m
          </div>
        `));
        lastAccuracyRef.current = accuracy;
      }
    }
  }, [location, accuracy, isMapLoaded]);

  // Update memory markers (optimized - batch updates, reuse existing markers)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const memoryIds = new Set(nearbyMemories.map(m => m.id));
    
    // Remove markers that are no longer nearby
    for (const [id, marker] of markersRef.current.entries()) {
      if (!memoryIds.has(id) && !id.startsWith('landmark-')) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Batch marker updates using requestAnimationFrame
    requestAnimationFrame(() => {
      nearbyMemories.forEach(memory => {
        // Skip if marker already exists
        if (markersRef.current.has(memory.id)) return;

        const el = document.createElement('div');
        el.className = 'memory-marker';
        el.style.cssText = `
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${memory.privacy === 'private' ? '#ef4444' : 
                            memory.privacy === 'friends' ? '#f59e0b' : '#8b5cf6'};
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          cursor: pointer;
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([memory.lng, memory.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <strong>${memory.summary || 'Memory'}</strong><br>
              <small>${memory.place_name || 'Unknown location'}</small><br>
              <small>Radius: ${memory.radius_m}m</small><br>
              <button class="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                Play Memory
              </button>
            </div>
          `))
          .addTo(map.current!);

        // Add click handler for marker
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          handleMemoryClick(memory);
        });

        // Add click handler for popup button
        marker.getPopup().on('open', () => {
          const popupElement = marker.getPopup().getElement();
          if (popupElement) {
            const playButton = popupElement.querySelector('button');
            if (playButton) {
              playButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleMemoryClick(memory);
              });
            }
          }
        });

        markersRef.current.set(memory.id, marker);
      });
    });
  }, [nearbyMemories, isMapLoaded, handleMemoryClick]);

  // Memoized handlers
  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      unmute();
      setIsMuted(false);
    } else {
      mute();
      setIsMuted(true);
      // Also stop the memory audio if playing
      stopPlaying();
    }
  }, [isMuted, mute, unmute, stopPlaying]);

  const handleRecordingToggle = useCallback(() => {
    setIsRecording(!isRecording);
  }, [isRecording]);

  const handleAddMemory = useCallback(() => {
    setShowAddMemory(true);
  }, []);

  const handleCloseMemory = useCallback(() => {
    setShowAddMemory(false);
  }, []);

  return (
    <div className="relative w-full h-screen">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Loading/Error State */}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">
              {MAPBOX_TOKEN ? 'Loading Berkeley Memory Map...' : 'Mapbox token not configured'}
            </div>
            <div className="text-sm text-gray-500">
              {MAPBOX_TOKEN ? 'Please wait while the map loads' : 'Please check your environment variables'}
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="p-3 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isTracking ? 'Tracking' : 'Not tracking'}
              </span>
              {accuracy && (
                <span className="text-xs text-gray-500">
                  ±{Math.round(accuracy)}m
                </span>
              )}
            </div>
            
            {error && (
              <div className="text-xs text-red-600">
                {error}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Now Playing Chip - Geofencing */}
      {currentlyPlaying && (
        <NowPlayingChip memory={currentlyPlaying} onSkip={skip} />
      )}

      {/* Memory Audio Player - Click-to-play */}
      {selectedMemory && (isGenerating || isPlaying) && (
        <div className="absolute bottom-20 left-4 z-10">
          <Card className="p-4 bg-white/90 backdrop-blur-sm min-w-[300px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {selectedMemory.summary || 'Memory'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isGenerating ? 'Generating audio...' : isPlaying ? 'Playing...' : 'Ready'}
                </div>
              </div>
              {isPlaying && (
                <Button
                  onClick={stopPlaying}
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                >
                  <VolumeX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Control Panel */}
      <div className="absolute bottom-4 right-4 z-10 space-y-2">
        <Button
          onClick={handleMuteToggle}
          variant="outline"
          size="icon"
          className="bg-white/90 backdrop-blur-sm"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>

        <Button
          onClick={handleRecordingToggle}
          variant="outline"
          size="icon"
          className={`bg-white/90 backdrop-blur-sm ${isRecording ? 'bg-red-100' : ''}`}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button
          onClick={handleAddMemory}
          variant="outline"
          size="icon"
          className="bg-white/90 backdrop-blur-sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Add Memory Sheet */}
      {showAddMemory && (
        <AddMemorySheet
          isOpen={showAddMemory}
          onClose={handleCloseMemory}
          userLocation={location}
          userId={userId}
        />
      )}
    </div>
  );
}
