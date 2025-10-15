// Berkeley Memory Map - Main Map Component
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useGeofencing } from '@/hooks/useGeofencing';
import { AddMemorySheet } from '@/components/AddMemorySheet';
import { NowPlayingChip } from '@/components/NowPlayingChip';
import { SupabaseTest } from '@/components/SupabaseTest';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, SkipForward, Plus } from 'lucide-react';
import { BERKELEY_CAMPUS_CENTER, BERKELEY_CAMPUS_ZOOM } from '@/types/memory';
import type { Memory } from '@/types/memory';

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
console.log('Mapbox token from env:', MAPBOX_TOKEN ? MAPBOX_TOKEN.substring(0, 20) + '...' : 'NOT FOUND');
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  console.log('Mapbox token set successfully');
} else {
  console.error('Mapbox token not found in environment variables');
}

interface MapScreenProps {
  userId?: string;
}

export function MapScreen({ userId }: MapScreenProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Geofencing hook
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
    enabled: true,
    userId,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not found');
      return;
    }

    console.log('Initializing map with token:', MAPBOX_TOKEN.substring(0, 20) + '...');

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: BERKELEY_CAMPUS_CENTER,
      zoom: BERKELEY_CAMPUS_ZOOM,
      pitch: 0,
      bearing: 0,
    });

    map.current.on('load', () => {
      console.log('Map loaded successfully');
      setIsMapLoaded(true);
      
      // Add custom UC Berkeley campus style
      addBerkeleyCampusStyle();
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Add UC Berkeley campus styling
  const addBerkeleyCampusStyle = () => {
    if (!map.current) return;

    // Add campus landmarks as custom markers
    const landmarks = [
      { name: 'Campanile', lat: 37.8721, lng: -122.2585, type: 'landmark' },
      { name: 'Memorial Glade', lat: 37.8719, lng: -122.2585, type: 'landmark' },
      { name: 'Doe Library', lat: 37.8723, lng: -122.2587, type: 'building' },
      { name: 'Sproul Plaza', lat: 37.8696, lng: -122.2593, type: 'plaza' },
      { name: 'Sather Gate', lat: 37.8696, lng: -122.2593, type: 'gate' },
    ];

    landmarks.forEach(landmark => {
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

      new mapboxgl.Marker(el)
        .setLngLat([landmark.lng, landmark.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${landmark.name}</strong>`))
        .addTo(map.current!);
    });
  };

  // Update user location marker
  useEffect(() => {
    if (!map.current || !location || !isMapLoaded) return;

    // Remove existing user marker
    const existingMarker = document.querySelector('.user-location-marker');
    if (existingMarker) {
      existingMarker.remove();
    }

    // Add new user marker
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

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    new mapboxgl.Marker(el)
      .setLngLat([location.lng, location.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div>
          <strong>Your Location</strong><br>
          Accuracy: ${Math.round(accuracy || 0)}m
        </div>
      `))
      .addTo(map.current);
  }, [location, accuracy, isMapLoaded]);

  // Update memory markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove existing memory markers
    const existingMarkers = document.querySelectorAll('.memory-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add new memory markers
    nearbyMemories.forEach(memory => {
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
        position: relative;
      `;

      // Add radius circle
      const radiusEl = document.createElement('div');
      radiusEl.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${memory.radius_m * 2}px;
        height: ${memory.radius_m * 2}px;
        border: 1px dashed rgba(139, 92, 246, 0.3);
        border-radius: 50%;
        pointer-events: none;
      `;
      el.appendChild(radiusEl);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([memory.lng, memory.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <strong>${memory.summary || 'Memory'}</strong><br>
            <small>${memory.place_name || 'Unknown location'}</small><br>
            <small>Radius: ${memory.radius_m}m</small>
          </div>
        `))
        .addTo(map.current!);

      // Add click handler
      el.addEventListener('click', () => {
        // Center map on memory
        map.current?.flyTo({
          center: [memory.lng, memory.lat],
          zoom: 18,
        });
      });
    });
  }, [nearbyMemories, isMapLoaded]);

  // Handle mute toggle
  const handleMuteToggle = () => {
    if (isMuted) {
      unmute();
      setIsMuted(false);
    } else {
      mute();
      setIsMuted(true);
    }
  };

  // Handle recording toggle
  const handleRecordingToggle = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
  };

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

      {/* Now Playing Chip */}
      {currentlyPlaying && (
        <NowPlayingChip memory={currentlyPlaying} onSkip={skip} />
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
          onClick={() => setShowAddMemory(true)}
          variant="outline"
          size="icon"
          className="bg-white/90 backdrop-blur-sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Supabase Integration Test */}
      <SupabaseTest />

      {/* Add Memory Sheet */}
      {showAddMemory && (
        <AddMemorySheet
          isOpen={showAddMemory}
          onClose={() => setShowAddMemory(false)}
          userLocation={location}
          userId={userId}
        />
      )}
    </div>
  );
}
