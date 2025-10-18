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
import { supabase } from '@/integrations/supabase/client';

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
console.log('Environment check:', {
  nodeEnv: import.meta.env.MODE,
  mapboxToken: MAPBOX_TOKEN ? MAPBOX_TOKEN.substring(0, 20) + '...' : 'NOT FOUND',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Present' : 'Missing',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
});

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  console.log('Mapbox token set successfully');
} else {
  console.error('Mapbox token not found in environment variables');
  console.error('Available env vars:', Object.keys(import.meta.env));
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
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  // Geofencing hook (disabled for now)
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
    enabled: true, // Re-enabled location tracking
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
    });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          console.error('Mapbox token status:', MAPBOX_TOKEN ? 'Present' : 'Missing');
          console.error('Error details:', e.error);
          setMapError(`Map failed to load: ${e.error?.message || 'Unknown error'}`);
        });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Load all memories from database
  useEffect(() => {
    const loadAllMemories = async () => {
      try {
        console.log('Loading all memories from database...');
        console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
        console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
        
        // Test basic Supabase connection
        console.log('Testing Supabase connection...');
        const { data: testData, error: testError } = await supabase
          .from('_supabase_migrations')
          .select('*')
          .limit(1);
        
        console.log('Connection test result:', { testData, testError });
        
        // Check authentication status
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session:', session);
        
        // Try a simple count query first
        const { count, error: countError } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true });
        
        console.log('Memory count:', count);
        console.log('Count error:', countError);
        
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .limit(50); // Limit to first 50 memories

        if (error) {
          console.error('Error loading memories:', error);
          console.error('Error details:', error.message, error.code, error.hint);
          return;
        }

        console.log('Loaded memories from database:', data);
        console.log('Number of memories loaded:', data?.length || 0);
        setAllMemories(data || []);
      } catch (err) {
        console.error('Failed to load memories:', err);
      }
    };

    loadAllMemories();
  }, []);

  // Update memory markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove existing memory markers more thoroughly
    const existingMarkers = document.querySelectorAll('.memory-marker');
    existingMarkers.forEach(marker => marker.remove());
    
    // Also remove any markers that might be attached to the map
    if (map.current) {
      const mapMarkers = map.current.getContainer().querySelectorAll('.mapboxgl-marker');
      mapMarkers.forEach(marker => marker.remove());
    }

    console.log('All memories from database:', allMemories);
    console.log('Memory IDs:', allMemories.map(m => m.id));
    console.log('Memory summaries:', allMemories.map(m => m.summary));

    // Deduplicate memories by summary to prevent showing the same memory multiple times
    const uniqueMemories = allMemories.reduce((acc, memory) => {
      if (!acc.find(m => m.summary === memory.summary)) {
        acc.push(memory);
      } else {
        console.log('Duplicate found by summary:', memory.summary);
      }
      return acc;
    }, [] as Memory[]);

    console.log('Unique memories after deduplication:', uniqueMemories.length);
    console.log('Unique memory summaries:', uniqueMemories.map(m => m.summary));

    // Add new memory markers (show ALL memories, not just nearby ones)
    uniqueMemories.forEach((memory, index) => {
      console.log(`Creating marker ${index + 1} for:`, memory.summary, 'at', [memory.lng, memory.lat]);
      
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
        position: absolute;
        transform: translate(-50%, -50%);
        pointer-events: auto;
      `;

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center'
      })
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
  }, [allMemories, isMapLoaded]);

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
              {mapError ? 'Map Loading Error' : MAPBOX_TOKEN ? 'Loading Berkeley Memory Map...' : 'Mapbox token not configured'}
            </div>
            <div className="text-sm text-gray-500">
              {mapError ? mapError : MAPBOX_TOKEN ? 'Please wait while the map loads' : 'Please check your environment variables'}
            </div>
            {mapError && (
              <div className="mt-4 p-3 bg-red-50 rounded text-sm text-red-700">
                Check browser console for more details. This is likely due to missing environment variables in production.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="p-3 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">
                Showing {allMemories.length} memories
              </span>
            </div>
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
          userLocation={location ? { lat: location.lat, lng: location.lng, accuracy, timestamp: Date.now() } : null}
          userId={userId}
        />
      )}
    </div>
  );
}
