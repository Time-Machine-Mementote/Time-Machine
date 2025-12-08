// Berkeley Memory Map - Main Map Component
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useGeofencing } from '@/hooks/useGeofencing';
import { AddMemorySheet } from '@/components/AddMemorySheet';
import { DevPortal } from '@/components/DevPortal';
import { SecretCodeWindow } from '@/components/SecretCodeWindow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Filter, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { BERKELEY_CAMPUS_CENTER, BERKELEY_CAMPUS_ZOOM } from '@/types/memory';
import type { Memory } from '@/types/memory';
import { supabase } from '@/integrations/supabase/client';
import { audioQueue } from '@/utils/audioQueue';

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
  filterUserId?: string; // Optional: filter memories by specific user ID (for admin/debug views)
  showAllMemories?: boolean; // Optional: show all memories instead of filtering by user (default: false)
}

export function MapScreen({ userId, showOverlay = true, filterUserId, showAllMemories = false }: MapScreenProps) {
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
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [userIdFilterInput, setUserIdFilterInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeUserIdFilter, setActiveUserIdFilter] = useState<string | undefined>(filterUserId);
  
  // Date filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDateFilter, setActiveDateFilter] = useState<{ start?: string; end?: string }>({});

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

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

  // Load memories from Supabase database
  // - If showAllMemories is true: show all public memories + user's own memories
  // - If filterUserId is provided: show only that specific user's memories
  // - Otherwise: show only the current authenticated user's memories
  useEffect(() => {
    const loadMemories = async () => {
      try {
        // Determine which user ID to filter by (activeUserIdFilter takes priority)
        const effectiveUserId = activeUserIdFilter ?? filterUserId ?? userId;
        
        // If showAllMemories is true, use the original behavior (public + user's own)
        if (showAllMemories) {
          console.log('Loading all memories (public + user own)...');
          
          let query = supabase
            .from('memories')
            .select('*')
            .eq('privacy', 'public');
          
          if (userId) {
            const { data: publicMemories, error: publicError } = await query;
            
            if (publicError) {
              console.error('Error loading public memories:', publicError);
            }
            
            const { data: userMemories, error: userError } = await supabase
              .from('memories')
              .select('*')
              .eq('author_id', userId);
            
            if (userError) {
              console.error('Error loading user memories:', userError);
            }
            
            const allMemoriesMap = new Map();
            (publicMemories || []).forEach(m => allMemoriesMap.set(m.id, m));
            (userMemories || []).forEach(m => allMemoriesMap.set(m.id, m));
            
            const combinedMemories = Array.from(allMemoriesMap.values());
            console.log(`Loaded ${combinedMemories.length} memories (all mode)`);
            setAllMemories(combinedMemories);
          } else {
            const { data, error } = await query;
            if (error) {
              console.error('Error loading memories:', error);
              return;
            }
            console.log(`Loaded ${data?.length || 0} public memories`);
            setAllMemories(data || []);
          }
          return;
        }
        
        // Filter by specific user ID
        if (!effectiveUserId) {
          console.log('No user ID available, showing empty state');
          setAllMemories([]);
          return;
        }
        
        console.log(`Loading memories for user: ${effectiveUserId}`, {
          dateFilter: activeDateFilter
        });
        
        // Build query with optional date filters
        let query = supabase
          .from('memories')
          .select('*')
          .eq('author_id', effectiveUserId);
        
        // Apply date filters if set
        if (activeDateFilter.start) {
          const startDateTime = `${activeDateFilter.start}T00:00:00Z`;
          query = query.gte('created_at', startDateTime);
          console.log(`Filtering from: ${startDateTime}`);
        }
        
        if (activeDateFilter.end) {
          const endDateTime = `${activeDateFilter.end}T23:59:59Z`;
          query = query.lte('created_at', endDateTime);
          console.log(`Filtering to: ${endDateTime}`);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading user memories:', error);
          setAllMemories([]);
          return;
        }
        
        console.log(`Loaded ${data?.length || 0} memories for user ${effectiveUserId}`);
        setAllMemories(data || []);
      } catch (err) {
        console.error('Failed to load memories:', err);
        setAllMemories([]);
      }
    };

    loadMemories();
  }, [userId, filterUserId, showAllMemories, activeUserIdFilter, activeDateFilter]);

  // Filter memories based on search query
  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) {
      return allMemories;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return allMemories.filter(memory => {
      const searchableText = [
        memory.text,
        memory.summary,
        memory.place_name,
        ...(memory.tags || []),
        ...(memory.extracted_people || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return searchableText.includes(query);
    });
  }, [allMemories, searchQuery]);

  // Apply user ID filter
  const handleApplyUserIdFilter = () => {
    const trimmedId = userIdFilterInput.trim();
    setActiveUserIdFilter(trimmedId || undefined);
  };

  // Clear user ID filter
  const handleClearUserIdFilter = () => {
    setUserIdFilterInput('');
    setActiveUserIdFilter(undefined);
  };

  // Apply date filter
  const handleApplyDateFilter = () => {
    setActiveDateFilter({
      start: startDate || undefined,
      end: endDate || undefined,
    });
  };

  // Clear date filter
  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setActiveDateFilter({});
  };

  // Quick date filter presets
  const handleQuickDateFilter = (days: number) => {
    const now = new Date();
    const past = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setStartDate(past.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    setActiveDateFilter({
      start: past.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    });
  };

  // Format time in mm:ss format
  const formatTime = (seconds: number): string => {
    if (!seconds || Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Audio player handlers
  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setAudioCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioCurrentTime(0);
  };

  // Reset audio state when selected memory changes
  useEffect(() => {
    setIsPlaying(false);
    setAudioDuration(0);
    setAudioCurrentTime(0);
  }, [selectedMemory?.id]);

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

    console.log(`Creating ${filteredMemories.length} markers on map (${allMemories.length} total, filtered by search: "${searchQuery}")...`);

    // Remove existing markers properly
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];

    // Show filtered memories as pins on the map
    filteredMemories.forEach((memory) => {
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
      `;

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
  }, [filteredMemories, allMemories, searchQuery, isMapLoaded, showOverlay]);

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
      // CRITICAL: Unlock audio FIRST - must happen synchronously in click handler for mobile
      // This plays a silent sound to "warm up" audio elements on iOS/Android
      console.log('📱 Output clicked - unlocking audio for mobile...');
      await audioQueue.unlockAudio();
      
      // Request location permission if not already granted
      // This ensures we have location data to find nearby memories
      if (!location && navigator.geolocation) {
        console.log('📍 Requesting location permission...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('✅ Location permission granted:', position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.warn('⚠️ Location permission denied or error:', error.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
      
      // Now unmute and start playing memories in radius
      unmute();
      setIsMuted(false);
      setIsOutputPlaying(true); // Turn white and stay white - only changes on next click
      console.log('🔊 Audio output enabled');
    } else {
      // Mute and stop playing
      mute();
      setIsMuted(true);
      setIsOutputPlaying(false); // Turn black - only changes on next click
      console.log('🔇 Audio output disabled');
    }
  }, [isMuted, unmute, mute, location]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ height: '100%', width: '100%', minHeight: 0 }}>
      {/* Map Container - Visible or hidden based on showOverlay */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full" 
        style={{ zIndex: 1, minHeight: 0, pointerEvents: showOverlay ? 'none' : 'auto' }} 
      />

      {/* Search Bar - Only visible on /map route (when overlay is hidden) */}
      {!showOverlay && (
        <div className="absolute top-4 left-4 right-4 z-20">
          {/* Main Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/90 border-white text-white placeholder:text-gray-400 font-terminal focus:ring-white focus:border-white"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="icon"
              className={`bg-black/90 border-white text-white hover:bg-white hover:text-black ${showFilters ? 'bg-white text-black' : ''}`}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Panel - Expandable */}
          {showFilters && (
            <div className="mt-2 p-3 bg-black/90 border border-white rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-terminal text-white text-sm">&gt; USER_ID_FILTER:</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter user ID (UUID)"
                  value={userIdFilterInput}
                  onChange={(e) => setUserIdFilterInput(e.target.value)}
                  className="flex-1 bg-black border-white text-white placeholder:text-gray-500 font-terminal text-sm focus:ring-white focus:border-white"
                />
                <Button
                  onClick={handleApplyUserIdFilter}
                  variant="outline"
                  size="sm"
                  className="bg-white text-black border-white hover:bg-gray-200 font-terminal"
                >
                  Apply
                </Button>
                {activeUserIdFilter && (
                  <Button
                    onClick={handleClearUserIdFilter}
                    variant="outline"
                    size="sm"
                    className="bg-black text-white border-white hover:bg-white hover:text-black font-terminal"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {activeUserIdFilter && (
                <div className="mt-2 font-terminal text-green-400 text-xs">
                  ✓ Filtering by user: {activeUserIdFilter.substring(0, 8)}...
                </div>
              )}

              {/* Date Filter Section */}
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-terminal text-white text-sm">&gt; DATE_FILTER:</span>
                </div>
                
                {/* Quick Filter Buttons */}
                <div className="flex gap-2 mb-2 flex-wrap">
                  <Button
                    onClick={() => handleQuickDateFilter(7)}
                    variant="outline"
                    size="sm"
                    className="bg-black text-white border-gray-600 hover:bg-white hover:text-black font-terminal text-xs px-2 py-1"
                  >
                    Last 7 days
                  </Button>
                  <Button
                    onClick={() => handleQuickDateFilter(30)}
                    variant="outline"
                    size="sm"
                    className="bg-black text-white border-gray-600 hover:bg-white hover:text-black font-terminal text-xs px-2 py-1"
                  >
                    Last 30 days
                  </Button>
                  <Button
                    onClick={() => handleQuickDateFilter(90)}
                    variant="outline"
                    size="sm"
                    className="bg-black text-white border-gray-600 hover:bg-white hover:text-black font-terminal text-xs px-2 py-1"
                  >
                    Last 90 days
                  </Button>
                </div>

                {/* Custom Date Range */}
                <div className="flex gap-2 items-center mb-2">
                  <div className="flex-1">
                    <label className="font-terminal text-gray-400 text-xs block mb-1">From:</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-black border-white text-white font-terminal text-sm focus:ring-white focus:border-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="font-terminal text-gray-400 text-xs block mb-1">To:</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-black border-white text-white font-terminal text-sm focus:ring-white focus:border-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleApplyDateFilter}
                    variant="outline"
                    size="sm"
                    className="bg-white text-black border-white hover:bg-gray-200 font-terminal"
                  >
                    Apply Dates
                  </Button>
                  {(activeDateFilter.start || activeDateFilter.end) && (
                    <Button
                      onClick={handleClearDateFilter}
                      variant="outline"
                      size="sm"
                      className="bg-black text-white border-white hover:bg-white hover:text-black font-terminal"
                    >
                      Clear Dates
                    </Button>
                  )}
                </div>

                {(activeDateFilter.start || activeDateFilter.end) && (
                  <div className="mt-2 font-terminal text-green-400 text-xs">
                    ✓ Date filter: {activeDateFilter.start || 'any'} to {activeDateFilter.end || 'any'}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700 font-terminal text-gray-400 text-xs">
                Showing {filteredMemories.length} of {allMemories.length} memories
              </div>
              {userId && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="font-terminal text-gray-500 text-xs">
                    Your User ID:
                  </div>
                  <div className="font-terminal text-blue-400 text-xs select-all break-all">
                    {userId}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Results Count (when searching) */}
          {searchQuery && !showFilters && (
            <div className="mt-2 px-3 py-1 bg-black/80 rounded font-terminal text-gray-300 text-xs">
              Found {filteredMemories.length} memories matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
      
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
          style={{ maxHeight: '40vh', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0 mr-3">
              <h3 className="font-terminal text-white text-lg truncate">
                &gt; {selectedMemory.summary || selectedMemory.text || 'Untitled Memory'}
              </h3>
              <p className="font-terminal text-gray-400 text-sm">
                {new Date(selectedMemory.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Button
              onClick={() => setSelectedMemory(null)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:text-black flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {selectedMemory.place_name && (
            <p className="font-terminal text-white text-sm mb-2">
              📍 {selectedMemory.place_name}
            </p>
          )}
          
          {/* Audio Player */}
          {selectedMemory.audio_url ? (
            <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
              <p className="font-terminal text-gray-400 text-xs mb-2">🎧 Audio Memory</p>
              
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={selectedMemory.audio_url}
                preload="metadata"
                onLoadedMetadata={handleAudioLoadedMetadata}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={handleAudioEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              
              {/* Custom Audio Player UI */}
              <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <Button
                  onClick={toggleAudioPlayback}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white text-black border-white hover:bg-gray-200 flex-shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
                
                {/* Timeline and Time Display */}
                <div className="flex-1 min-w-0">
                  {/* Progress Bar / Scrubber */}
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 0}
                    step={0.1}
                    value={audioCurrentTime}
                    onChange={handleAudioSeek}
                    disabled={!audioDuration}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: audioDuration
                        ? `linear-gradient(to right, white ${(audioCurrentTime / audioDuration) * 100}%, #374151 ${(audioCurrentTime / audioDuration) * 100}%)`
                        : '#374151'
                    }}
                  />
                  
                  {/* Time Display */}
                  <div className="flex justify-between mt-1">
                    <span className="font-terminal text-white text-xs">
                      {formatTime(audioCurrentTime)}
                    </span>
                    <span className="font-terminal text-gray-400 text-xs">
                      {formatTime(audioDuration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="font-terminal text-gray-500 text-sm mt-3 italic">
              No audio available for this memory
            </p>
          )}
        </div>
      )}
    </div>
  );
}
