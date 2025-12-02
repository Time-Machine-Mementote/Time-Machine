// Berkeley Memory Map - Main Map Component
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useGeofencing } from '@/hooks/useGeofencing';
import { AddMemorySheet } from '@/components/AddMemorySheet';
import { DevPortal } from '@/components/DevPortal';
import { SecretCodeWindow } from '@/components/SecretCodeWindow';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { BERKELEY_CAMPUS_CENTER, BERKELEY_CAMPUS_ZOOM } from '@/types/memory';
import type { Memory } from '@/types/memory';
import { supabase } from '@/integrations/supabase/client';

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
  showOverlay?: boolean; // Whether to show the white overlay and buttons
}

export function MapScreen({ userId, showOverlay = true }: MapScreenProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]); // Store marker references
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted - user must click Output first
  const [isRecording, setIsRecording] = useState(false);
  const [isOutputPlaying, setIsOutputPlaying] = useState(false);
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [showDevPortal, setShowDevPortal] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

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

  // Initialize map (hidden behind white overlay)
  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }

    if (!MAPBOX_TOKEN) {
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: BERKELEY_CAMPUS_CENTER,
      zoom: BERKELEY_CAMPUS_ZOOM,
      pitch: 0,
      bearing: 0,
      interactive: !showOverlay, // Interactive only when overlay is hidden
      boxZoom: !showOverlay,
      doubleClickZoom: !showOverlay,
      dragRotate: !showOverlay,
      dragPan: !showOverlay,
      keyboard: !showOverlay,
      scrollZoom: !showOverlay,
      touchZoomRotate: !showOverlay,
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [showOverlay]);

  // Update map interactivity when showOverlay changes
  useEffect(() => {
    if (map.current) {
      if (showOverlay) {
        // Disable interactions
        map.current.boxZoom.disable();
        map.current.doubleClickZoom.disable();
        map.current.dragRotate.disable();
        map.current.dragPan.disable();
        map.current.scrollZoom.disable();
        map.current.touchZoomRotate.disable();
        map.current.keyboard.disable();
      } else {
        // Enable interactions
        map.current.boxZoom.enable();
        map.current.doubleClickZoom.enable();
        map.current.dragRotate.enable();
        map.current.dragPan.enable();
        map.current.scrollZoom.enable();
        map.current.touchZoomRotate.enable();
        map.current.keyboard.enable();
      }
    }
  }, [showOverlay]);

  // Load all memories from Supabase database
  useEffect(() => {
    const loadAllMemories = async () => {
      try {
        console.log('Loading memories from Supabase...');
        
        // Load all public memories from Supabase, plus user's own memories
        let query = supabase
          .from('memories')
          .select('*')
          .eq('privacy', 'public'); // Get public memories
        
        // If user is logged in, also get their own memories (private and friends)
        if (userId) {
          const { data: publicMemories, error: publicError } = await query;
          
          if (publicError) {
            console.error('Error loading public memories:', publicError);
          }
          
          // Get user's own memories (all privacy levels)
          const { data: userMemories, error: userError } = await supabase
            .from('memories')
            .select('*')
            .eq('author_id', userId);
          
          if (userError) {
            console.error('Error loading user memories:', userError);
          }
          
          // Combine and deduplicate by ID
          const allMemoriesMap = new Map();
          
          (publicMemories || []).forEach(m => allMemoriesMap.set(m.id, m));
          (userMemories || []).forEach(m => allMemoriesMap.set(m.id, m));
          
          const combinedMemories = Array.from(allMemoriesMap.values());
          console.log(`Loaded ${combinedMemories.length} memories from Supabase`);
          setAllMemories(combinedMemories);
        } else {
          // No user - just get public memories
          const { data, error } = await query;
          
          if (error) {
            console.error('Error loading memories:', error);
            console.error('Error details:', error.message, error.code, error.hint);
            return;
          }
          
          console.log(`Loaded ${data?.length || 0} public memories from Supabase`);
          setAllMemories(data || []);
        }
      } catch (err) {
        console.error('Failed to load memories:', err);
      }
    };

    loadAllMemories();
  }, [userId]);

  // Helper function to extract and abbreviate filename from audio URL
  const getAbbreviatedFileName = (audioUrl: string | undefined): string => {
    if (!audioUrl) return 'No audio';
    
    try {
      // Extract filename from URL (handles both full URLs and paths)
      const url = new URL(audioUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Remove file extension
      const nameWithoutExt = fileName.split('.')[0];
      
      // Abbreviate to 10 characters
      if (nameWithoutExt.length <= 10) {
        return nameWithoutExt;
      }
      return nameWithoutExt.substring(0, 10) + '...';
    } catch {
      // If URL parsing fails, try to extract from path directly
      const pathParts = audioUrl.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const nameWithoutExt = fileName.split('.')[0];
      
      if (nameWithoutExt.length <= 10) {
        return nameWithoutExt;
      }
      return nameWithoutExt.substring(0, 10) + '...';
    }
  };

  // Update memory markers (only show when overlay is hidden - on /map route)
  useEffect(() => {
    if (!map.current || !isMapLoaded || showOverlay) return;

    console.log(`Creating ${allMemories.length} markers on map...`);

    // Remove existing markers properly
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];

    // Show all Supabase memories as pins on the map
    allMemories.forEach((memory) => {
      // Skip memories without valid coordinates
      if (!memory.lat || !memory.lng || isNaN(memory.lat) || isNaN(memory.lng)) {
        console.warn('Skipping memory with invalid coordinates:', memory.id);
        return;
      }
      const el = document.createElement('div');
      el.className = 'memory-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: ${memory.privacy === 'private' ? '#ef4444' : 
                          memory.privacy === 'friends' ? '#f59e0b' : '#8b5cf6'};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        pointer-events: auto;
        transition: transform 0.2s;
      `;

      // Hover effect - use scale transform
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '1000'; // Bring to front on hover
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1'; // Reset z-index
      });

      const abbreviatedFileName = getAbbreviatedFileName(memory.audio_url);
      
      // Store coordinates to lock marker position
      const lockedLng = memory.lng;
      const lockedLat = memory.lat;
      
      // Create marker WITHOUT popup - just a button
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center', // Center of circle at exact coordinates
        draggable: false // Explicitly disable dragging
      })
        .setLngLat([lockedLng, lockedLat]) // Lock to exact coordinates
        .addTo(map.current!);

      // Add click handler - just set selected memory, no popup
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent any map click events
        e.stopImmediatePropagation(); // Prevent other handlers
        e.preventDefault(); // Prevent default behavior
        
        // Set selected memory to show in fixed panel
        setSelectedMemory(memory);
        
        // Ensure marker stays locked
        marker.setLngLat([lockedLng, lockedLat]);
      });
      
      // Store marker reference
      markersRef.current.push(marker);
      
      // Re-lock position on map move/zoom to prevent drift
      const lockPosition = () => {
        marker.setLngLat([lockedLng, lockedLat]);
      };
      
      map.current?.on('moveend', lockPosition);
      map.current?.on('zoomend', lockPosition);
    });
    
    console.log(`Successfully created ${markersRef.current.length} markers on map from Supabase`);
  }, [allMemories, isMapLoaded, showOverlay]);

  // Track output playing state - stays true when Output is clicked until turned off
  // Don't automatically update based on currentlyPlaying - only on button click

  // Secret code handler - double click on white overlay to open secret code window
  useEffect(() => {
    if (!showOverlay) return; // Only on main route with overlay
    
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;

    const handleClick = (e: MouseEvent) => {
      // Only trigger on white overlay area (not on buttons)
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;

      clickCount++;
      
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 500); // 500ms window for double click
      } else if (clickCount === 2) {
        clearTimeout(clickTimer);
        setShowSecretCode(true);
        clickCount = 0;
      }
    };

    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      if (clickTimer) clearTimeout(clickTimer);
    };
  }, [showOverlay]);

  // Handle Input button - open recording sheet
  const handleInputClick = () => {
    setShowAddMemory(true);
  };

  // Handle Output button - toggle audio playback
  // State only changes on user click - never automatically
  const handleOutputClick = useCallback(async () => {
    if (isMuted) {
      // On mobile, explicitly request location permission on user gesture
      if (navigator.geolocation) {
        try {
          // This triggers the permission prompt on mobile (requires user gesture)
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Location permission granted:', position.coords.latitude, position.coords.longitude);
            },
            (error) => {
              console.error('Location permission denied or error:', error.message);
              alert('Location access is required to play nearby memories. Please enable location in your browser settings.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } catch (err) {
          console.error('Error requesting location:', err);
        }
      }
      
      // Unmute and start playing memories in radius
      unmute();
      setIsMuted(false);
      setIsOutputPlaying(true); // Turn white and stay white - only changes on next click
    } else {
      // Mute and stop playing
      mute();
      setIsMuted(true);
      setIsOutputPlaying(false); // Turn black - only changes on next click
    }
  }, [isMuted, unmute, mute]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ height: '100%', width: '100%', minHeight: 0 }}>
      {/* Map Container - Visible or hidden based on showOverlay */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full" 
        style={{ zIndex: 1, minHeight: 0, pointerEvents: showOverlay ? 'none' : 'auto' }} 
      />
      
      {/* White Overlay - Covers the entire map (only if showOverlay is true) */}
      {showOverlay && (
        <>
          <div 
            className="absolute inset-0 bg-white"
            style={{ zIndex: 10, pointerEvents: 'auto' }}
          />

          {/* Input and Output Buttons - Split screen top/bottom */}
          <div 
            className="absolute inset-0 flex flex-col z-20"
            style={{ pointerEvents: 'auto' }}
          >
        {/* Output Button - Top half */}
        <Button
          onClick={handleOutputClick}
          variant="outline"
          className={`w-full h-1/2 font-robotic rounded-none border-2 border-b-0 focus:outline-none focus:ring-0 ${
            isOutputPlaying 
              ? 'bg-white text-black border-black hover:bg-white hover:text-black' 
              : 'bg-black text-white border-white hover:bg-black hover:text-white'
          }`}
          style={{ borderRadius: '0', outline: 'none', boxShadow: 'none' }}
        >
          <span className="text-2xl sm:text-3xl">Output</span>
        </Button>

        {/* Input Button - Bottom half */}
        <Button
          onClick={handleInputClick}
          variant="outline"
          className={`relative w-full h-1/2 font-robotic rounded-none border-2 border-t-0 focus:outline-none focus:ring-0 ${
            isRecording 
              ? 'bg-white text-black border-black hover:bg-white hover:text-black' 
              : 'bg-black text-white border-white hover:bg-black hover:text-white'
          }`}
          style={{ borderRadius: '0', outline: 'none', boxShadow: 'none' }}
        >
          {isRecording && (
            <div className="absolute top-2 right-2 w-4 h-4 bg-white border border-black rounded-none" 
                 style={{ borderRadius: '0' }} />
          )}
          <span className="text-2xl sm:text-3xl">Input</span>
        </Button>
          </div>
        </>
      )}

      {/* Add Memory Sheet */}
      <AddMemorySheet
        isOpen={showAddMemory}
        onClose={() => {
          setShowAddMemory(false);
          setIsRecording(false);
        }}
        userLocation={location ? { lat: location.lat, lng: location.lng, accuracy: accuracy || 0, timestamp: Date.now() } : null}
        userId={userId}
        onRecordingStateChange={setIsRecording}
      />

      {/* Dev Portal */}
      <DevPortal
        isOpen={showDevPortal}
        onClose={() => setShowDevPortal(false)}
        userLocation={location ? { lat: location.lat, lng: location.lng, accuracy: accuracy || 0 } : null}
        userId={userId}
      />

      {/* Secret Code Window */}
      {showOverlay && (
        <SecretCodeWindow
          isOpen={showSecretCode}
          onClose={() => setShowSecretCode(false)}
        />
      )}

      {/* Memory Info Panel - Fixed at bottom when pin is clicked (only on /map route) */}
      {!showOverlay && selectedMemory && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-black border-t-2 border-white z-30 p-4"
          style={{ maxHeight: '30vh', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-terminal text-white text-lg">
              &gt; {getAbbreviatedFileName(selectedMemory.audio_url)}
            </h3>
            <Button
              onClick={() => setSelectedMemory(null)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:text-black"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {selectedMemory.place_name && (
            <p className="font-terminal text-white text-sm mb-1">
              Location: {selectedMemory.place_name}
            </p>
          )}
          {selectedMemory.summary && (
            <p className="font-terminal text-white text-sm">
              Summary: {selectedMemory.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
