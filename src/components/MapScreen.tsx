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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, MicOff, Volume2, VolumeX, Plus, Layers, MapPin, Headphones } from 'lucide-react';
import { BERKELEY_CAMPUS_CENTER, BERKELEY_CAMPUS_ZOOM } from '@/types/memory';
import { getAllPublicMemories } from '@/services/memoryApi';
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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mode, setMode] = useState<'input' | 'output'>('output');
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Geofencing hook (only enabled in output mode)
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
    calculateDistance,
  } = useGeofencing({
    enabled: isMapLoaded && mode === 'output', // Only start tracking in output mode
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

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center'
      })
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

    // Set up pulse animations for memory markers within range
    if (!pulseStyleRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes memoryPulse {
          0% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
          }
          50% { 
            transform: scale(1.3); 
            box-shadow: 0 0 0 10px rgba(139, 92, 246, 0);
          }
          100% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
          }
        }
        .memory-marker-active {
          animation: memoryPulse 2s infinite;
          z-index: 1000;
        }
        .memory-marker-glow {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
          pointer-events: none;
          animation: memoryPulse 2s infinite;
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

    // Handle map clicks in input mode
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (mode === 'input') {
        const { lng, lat } = e.lngLat;
        setPickedLocation({ lat, lng });
        // Show visual feedback - add temporary marker
        if (pickedLocation) {
          // Remove previous picked location marker if exists
          const existingMarker = markersRef.current.get('picked-location');
          if (existingMarker) {
            existingMarker.remove();
          }
        }
        // Add new marker for picked location
        const el = document.createElement('div');
        el.style.cssText = `
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #ef4444;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        `;
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat([lng, lat])
          .addTo(map.current!);
        markersRef.current.set('picked-location', marker);
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (map.current) {
        map.current.off('click', handleMapClick);
        map.current.remove();
      }
    };
  }, [addBerkeleyCampusStyle, mode]);

  // Update user location marker (optimized - update existing marker instead of recreating)
  useEffect(() => {
    if (!map.current || !location || !isMapLoaded) return;
    
    // Validate location coordinates
    if (typeof location.lng !== 'number' || typeof location.lat !== 'number' ||
        isNaN(location.lng) || isNaN(location.lat)) {
      return;
    }

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

      userMarkerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center'
      });
      // Only add to map if we have valid coordinates
      if (typeof location.lng === 'number' && typeof location.lat === 'number' &&
          !isNaN(location.lng) && !isNaN(location.lat)) {
        userMarkerRef.current.setLngLat([location.lng, location.lat]).addTo(map.current);
      }
    }

    // Update position (much faster than recreating) - only if marker exists and has valid coordinates
    if (userMarkerRef.current && typeof location.lng === 'number' && typeof location.lat === 'number' &&
        !isNaN(location.lng) && !isNaN(location.lat)) {
      userMarkerRef.current.setLngLat([location.lng, location.lat]);
      
      // Ensure marker is added to map if it wasn't before
      if (!userMarkerRef.current._map) {
        userMarkerRef.current.addTo(map.current!);
      }
    }
    
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

  // Fetch all public memories when in output mode
  useEffect(() => {
    if (mode === 'output' && isMapLoaded) {
      getAllPublicMemories().then(memories => {
        setAllMemories(memories);
      }).catch(error => {
        console.error('Failed to fetch memories:', error);
      });
    } else {
      // Clear memories when switching to input mode
      setAllMemories([]);
    }
  }, [mode, isMapLoaded]);

  // Update memory markers with pulsing animations when within range
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    
    // In output mode, show all memories or nearby memories
    // In input mode, don't show memory markers
    if (mode === 'input') {
      // Remove all memory markers in input mode
      for (const [id, marker] of markersRef.current.entries()) {
        if (!id.startsWith('landmark-')) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }
      return;
    }

    // Use allMemories in output mode, or nearbyMemories if location is available
    const memoriesToShow = location && nearbyMemories.length > 0 ? nearbyMemories : allMemories;
    
    if (!location && memoriesToShow.length === 0) return;

    const memoryIds = new Set(memoriesToShow.map(m => m.id));
    
    // Calculate which memories are within 20m for pulsing (only if location available)
    const activeMemoryIds = new Set<string>();
    if (location) {
      memoriesToShow.forEach(memory => {
        const dist = calculateDistance(
          location.lat, location.lng,
          memory.lat, memory.lng
        );
        if (dist <= 20) { // Within 20m radius
          activeMemoryIds.add(memory.id);
        }
      });
    }
    
    // Remove markers that are no longer nearby
    for (const [id, marker] of markersRef.current.entries()) {
      if (!memoryIds.has(id) && !id.startsWith('landmark-')) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Batch marker updates using requestAnimationFrame
    requestAnimationFrame(() => {
      memoriesToShow.forEach(memory => {
        const isActive = activeMemoryIds.has(memory.id);
        const isCurrentlyPlaying = currentlyPlaying?.id === memory.id;
        
        // Update existing marker or create new one
        if (markersRef.current.has(memory.id)) {
          const existingMarker = markersRef.current.get(memory.id);
          const existingContainer = existingMarker?.getElement();
          if (existingContainer) {
            // Find the inner marker element
            const existingEl = existingContainer.querySelector('.memory-marker') as HTMLElement;
            const existingGlow = existingContainer.querySelector('.memory-marker-glow');
            
            // Update animation based on active state
            if (isActive || isCurrentlyPlaying) {
              if (existingEl) {
                existingEl.classList.add('memory-marker-active');
                existingEl.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.8)';
              }
              // Add glow if not present
              if (!existingGlow) {
                const glow = document.createElement('div');
                glow.className = 'memory-marker-glow';
                glow.style.cssText = `
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 40px;
                  height: 40px;
                  border-radius: 50%;
                  background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%);
                  pointer-events: none;
                  animation: memoryPulse 2s infinite;
                `;
                existingContainer.appendChild(glow);
              }
            } else {
              if (existingEl) {
                existingEl.classList.remove('memory-marker-active');
                existingEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
              }
              // Remove glow
              if (existingGlow) {
                existingGlow.remove();
              }
            }
          }
          return;
        }
        
        // Validate memory has valid coordinates
        if (!memory || typeof memory.lng !== 'number' || typeof memory.lat !== 'number' ||
            isNaN(memory.lng) || isNaN(memory.lat)) {
          console.warn('Skipping memory with invalid coordinates:', memory);
          return;
        }

        // Create marker container with glow effect
        const container = document.createElement('div');
        container.style.cssText = 'position: relative; width: 40px; height: 40px; margin: 0; padding: 0; transform-origin: center center;';
        
        // Glow effect (only when active)
        if (isActive || isCurrentlyPlaying) {
          const glow = document.createElement('div');
          glow.className = 'memory-marker-glow';
          glow.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%);
            pointer-events: none;
            animation: memoryPulse 2s infinite;
          `;
          container.appendChild(glow);
        }
        
        const el = document.createElement('div');
        el.className = isActive || isCurrentlyPlaying ? 'memory-marker memory-marker-active' : 'memory-marker';
        el.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: ${memory.privacy === 'private' ? '#ef4444' : 
                            memory.privacy === 'friends' ? '#f59e0b' : '#8b5cf6'};
          border: 3px solid white;
          box-shadow: ${isActive || isCurrentlyPlaying ? '0 0 20px rgba(139, 92, 246, 0.8)' : '0 2px 4px rgba(0,0,0,0.2)'};
          cursor: pointer;
          z-index: 10;
        `;
        container.appendChild(el);

        const marker = new mapboxgl.Marker({
          element: container,
          anchor: 'center'
        })
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
        
        // Also allow clicking the glow/container
        container.addEventListener('click', (e) => {
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
  }, [mode, allMemories, nearbyMemories, isMapLoaded, location, currentlyPlaying, calculateDistance, handleMemoryClick]);

  // Memory density heatmap layer (only in output mode)
  useEffect(() => {
    if (!map.current || !isMapLoaded || mode !== 'output') return;

    const heatmapSourceId = 'memory-heatmap';
    const heatmapLayerId = 'memory-heatmap-layer';
    const currentMap = map.current; // Store reference

    // Create GeoJSON from nearby memories
    const geojson = {
      type: 'FeatureCollection' as const,
      features: allMemories.map(memory => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [memory.lng, memory.lat],
        },
        properties: {
          intensity: memory.emotion || 0.5,
        },
      })),
    };

    // Remove existing source and layer if they exist
    try {
      if (currentMap.getLayer && currentMap.getLayer(heatmapLayerId)) {
        currentMap.removeLayer(heatmapLayerId);
      }
      if (currentMap.getSource && currentMap.getSource(heatmapSourceId)) {
        currentMap.removeSource(heatmapSourceId);
      }
    } catch (error) {
      console.warn('Error removing existing heatmap layer:', error);
    }

    if (showHeatmap && allMemories.length > 0) {
      try {
        // Add heatmap source
        currentMap.addSource(heatmapSourceId, {
          type: 'geojson',
          data: geojson,
        });

        // Add heatmap layer
        currentMap.addLayer({
          id: heatmapLayerId,
          type: 'heatmap',
          source: heatmapSourceId,
          maxzoom: 15,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'intensity'],
              0,
              0,
              1,
              1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              1,
              9,
              3,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(139, 92, 246, 0)',
              0.2,
              'rgba(139, 92, 246, 0.3)',
              0.4,
              'rgba(139, 92, 246, 0.5)',
              0.6,
              'rgba(139, 92, 246, 0.7)',
              0.8,
              'rgba(139, 92, 246, 0.9)',
              1,
              'rgba(139, 92, 246, 1)',
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              2,
              9,
              20,
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              7,
              0.6,
              9,
              0.8,
            ],
          },
        });
      } catch (error) {
        console.warn('Error adding heatmap layer:', error);
      }
    }

    return () => {
      // Cleanup with proper null checks
      try {
        const mapToClean = map.current;
        if (mapToClean && mapToClean.getLayer && mapToClean.getSource) {
          if (mapToClean.getLayer(heatmapLayerId)) {
            mapToClean.removeLayer(heatmapLayerId);
          }
          if (mapToClean.getSource(heatmapSourceId)) {
            mapToClean.removeSource(heatmapSourceId);
          }
        }
      } catch (error) {
        // Silently fail during cleanup - map may have been destroyed
        console.warn('Error during heatmap cleanup (map may be destroyed):', error);
      }
    };
  }, [showHeatmap, allMemories, isMapLoaded, mode]);

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

      {/* Mode Toggle & Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="p-3 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Mode Toggle */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'input' | 'output')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="input" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Input
                </TabsTrigger>
                <TabsTrigger value="output" className="flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  Output
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Status (only show in output mode) */}
            {mode === 'output' && (
              <div className="flex items-center space-x-2 flex-wrap">
                <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">
                  {isTracking ? 'Tracking' : 'Not tracking'}
                </span>
                {accuracy && (
                  <span className="text-xs text-gray-500">
                    ±{Math.round(accuracy)}m
                  </span>
                )}
                {error && (
                  <div className="text-xs text-red-600 max-w-xs" title={error}>
                    {error.length > 50 ? error.substring(0, 50) + '...' : error}
                  </div>
                )}
                {!isTracking && !error && (
                  <div className="text-xs text-blue-600">
                    Requesting location...
                  </div>
                )}
              </div>
            )}

            {/* Input mode hint */}
            {mode === 'input' && (
              <div className="text-xs text-gray-600">
                {pickedLocation ? 'Location picked! Click + to add memory' : 'Click on map to add memory'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Now Playing Chip - Geofencing (only in output mode) */}
      {mode === 'output' && currentlyPlaying && (
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

      {/* Control Panel - Mobile-friendly with safe area insets */}
      <div 
        className="absolute z-10 space-y-2 bottom-4 right-4 sm:bottom-4 sm:right-4"
        style={{
          bottom: 'max(1.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)))',
          right: 'max(1.5rem, calc(1rem + env(safe-area-inset-right, 0px)))'
        }}
      >
        {/* Output mode controls */}
        {mode === 'output' && (
          <>
            <Button
              onClick={handleMuteToggle}
              variant="outline"
              size="icon"
              className="bg-white/90 backdrop-blur-sm touch-manipulation"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Button
              onClick={() => setShowHeatmap(!showHeatmap)}
              variant="outline"
              size="icon"
              className={`bg-white/90 backdrop-blur-sm touch-manipulation ${showHeatmap ? 'bg-purple-100' : ''}`}
              title="Toggle memory density heatmap"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Input mode controls */}
        {mode === 'input' && (
          <Button
            onClick={handleAddMemory}
            variant="outline"
            size="icon"
            className="bg-white/90 backdrop-blur-sm touch-manipulation"
            title="Add memory at picked location"
            disabled={!pickedLocation}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Common controls */}
        {mode === 'output' && (
          <>
            <Button
              onClick={handleRecordingToggle}
              variant="outline"
              size="icon"
              className={`bg-white/90 backdrop-blur-sm touch-manipulation ${isRecording ? 'bg-red-100' : ''}`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Button
              onClick={handleAddMemory}
              variant="outline"
              size="icon"
              className="bg-white/90 backdrop-blur-sm touch-manipulation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </>
        )}

      </div>

      {/* Add Memory Sheet */}
      {showAddMemory && (
        <AddMemorySheet
          isOpen={showAddMemory}
          onClose={() => {
            handleCloseMemory();
            setPickedLocation(null);
            // Remove picked location marker
            const marker = markersRef.current.get('picked-location');
            if (marker) {
              marker.remove();
              markersRef.current.delete('picked-location');
            }
          }}
          userLocation={pickedLocation ? { ...pickedLocation, timestamp: Date.now() } : location || undefined}
          userId={userId}
        />
      )}

      {/* Input Mode Cursor Hint */}
      {mode === 'input' && !pickedLocation && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
          <Card className="p-3 bg-blue-500/90 backdrop-blur-sm text-white">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span>Click on the map to place a memory</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
