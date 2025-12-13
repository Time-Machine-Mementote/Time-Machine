// Enhanced Dev Portal Component with Map, Ghost Preview, and Date Filtering
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Database, MapPin, Volume2, User, RefreshCw, Ghost, Filter, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { audioQueue } from '@/utils/audioQueue';
import { toast } from 'sonner';
import type { Memory, UserLocation } from '@/types/memory';
import { getMemoriesInRadius } from '@/services/memoryApi';
import { BERKELEY_CAMPUS_CENTER, BERKELEY_CAMPUS_ZOOM } from '@/types/memory';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MemoryPlayerPanel } from '@/components/MemoryPlayerPanel';
import { GhostDebugPanel } from '@/components/GhostDebugPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Set Mapbox access token (same pattern as MapScreen)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (MAPBOX_TOKEN && typeof window !== 'undefined') {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface DevPortalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  userId?: string;
}

const PREVIEW_RADIUS = 100; // 100 meters

export function DevPortal({ isOpen, onClose, userLocation, userId }: DevPortalProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const [memories, setMemories] = useState<Memory[]>([]);
  const [hasError, setHasError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [queueInfo, setQueueInfo] = useState({ length: 0, playing: null as any });
  
  // Debug state for ghost mode
  const [queryStatus, setQueryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Get Supabase config for debug panel
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Map state
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  // Ghost preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewMemories, setPreviewMemories] = useState<Memory[]>([]);
  const [isGhostPlaying, setIsGhostPlaying] = useState(false);
  const previewMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDateFilter, setActiveDateFilter] = useState<{ start?: string; end?: string }>({});
  const [userIdFilterInput, setUserIdFilterInput] = useState('');
  const [activeUserIdFilter, setActiveUserIdFilter] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  
  // Selected memory for audio playback
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

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

  // Filter memories by radius (preview point must be within memory's radius)
  const filterMemoriesByRadius = useCallback((memories: Memory[], previewLat: number, previewLng: number): Memory[] => {
    return memories.filter(memory => {
      const distance = calculateDistance(previewLat, previewLng, memory.lat, memory.lng);
      return distance <= memory.radius_m;
    });
  }, [calculateDistance]);

  // Initialize map (same pattern as MapScreen)
  useEffect(() => {
    if (!isOpen || !mapContainer.current || map.current) return;

    // Check if Mapbox token is available
    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox token not found - map will not be available');
      setHasError('Mapbox token not configured. Please set VITE_MAPBOX_TOKEN in your environment variables.');
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: userLocation ? [userLocation.lng, userLocation.lat] : BERKELEY_CAMPUS_CENTER,
        zoom: userLocation ? 16 : BERKELEY_CAMPUS_ZOOM,
      });

      map.current.on('load', () => {
        setIsMapLoaded(true);
      });

      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e);
        setHasError(`Map failed to load: ${e.error?.message || 'Unknown error'}`);
        toast.error('Map failed to load');
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setHasError(`Map initialization failed: ${errorMessage}`);
      toast.error('Failed to initialize map');
    }

    return () => {
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        map.current = null;
        setIsMapLoaded(false);
      }
    };
  }, [isOpen, userLocation]);

  // Load memories with filters
  const loadMemories = useCallback(async () => {
    setLoading(true);
    setQueryStatus('loading');
    setQueryError(null);
    
    // Validate Supabase config
    if (!supabaseUrl || !supabaseAnonKey) {
      const errorMsg = 'Supabase env missing on this branch';
      console.error('[ghost]', errorMsg, { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
      setQueryError(errorMsg);
      setQueryStatus('error');
      setLoading(false);
      setHasError(errorMsg);
      return;
    }
    
    // Log masked config
    console.log('[ghost] Supabase config:', {
      url: supabaseUrl.substring(0, 6) + '...',
      key: supabaseAnonKey.substring(0, 6) + '...',
      userId: userId || 'anon'
    });
    
    try {
      let query = supabase
        .from('memories')
        .select('*');

      // Apply user ID filter
      if (activeUserIdFilter) {
        query = query.eq('author_id', activeUserIdFilter);
      }

      // Apply date filters
      if (activeDateFilter.start) {
        const startDateTime = `${activeDateFilter.start}T00:00:00Z`;
        query = query.gte('created_at', startDateTime);
      }
      if (activeDateFilter.end) {
        const endDateTime = `${activeDateFilter.end}T23:59:59Z`;
        query = query.lte('created_at', endDateTime);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(500);

      if (error) {
        console.error('[ghost] supabase error', error);
        let errorMessage = error.message || 'Unknown Supabase error';
        
        // Handle network errors specifically
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          const clientUrl = supabase.supabaseUrl;
          errorMessage = `Network error: Cannot connect to Supabase.

Current URL: ${clientUrl}
Expected URL: ${supabaseUrl}

Possible fixes:
1. Add CORS: Go to Supabase Dashboard → Settings → API → Add "http://localhost:8080" to allowed origins
2. Check if Supabase project is active (not paused)
3. Verify the URL in .env.local matches your Supabase project
4. Restart dev server after changing .env.local

Check browser console Network tab for CORS errors.`;
        }
        
        setQueryError(errorMessage);
        setQueryStatus('error');
        setHasError(`Query failed: ${errorMessage}`);
        toast.error('Failed to load memories');
        return;
      }
      
      setMemories(data || []);
      setQueryStatus('success');
      setQueryError(null);
      console.log(`[ghost] Loaded ${data?.length || 0} memories`);
    } catch (error) {
      let errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle network/fetch errors
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = `Network error: Cannot connect to Supabase.
Possible causes:
1. CORS not configured in Supabase dashboard
2. Supabase project is paused
3. Incorrect Supabase URL
4. Network connectivity issue

Check Supabase URL: ${supabaseUrl || 'NOT SET'}`;
      }
      
      console.error('[ghost] Error loading memories:', error);
      setQueryError(errorMsg);
      setQueryStatus('error');
      setHasError(`Failed to load memories: ${errorMsg}`);
      toast.error('Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [activeUserIdFilter, activeDateFilter, supabaseUrl, supabaseAnonKey, userId]);

  // Update map markers when memories change
  useEffect(() => {
    if (!map.current || !isMapLoaded || !MAPBOX_TOKEN) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          // Marker already removed
        }
      });
      markersRef.current = [];

      // Add markers for each memory
      memories.forEach(memory => {
        try {
          const el = document.createElement('div');
          el.className = 'memory-marker';
          el.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: ${memory.audio_url ? '#10b981' : '#6b7280'};
            border: 2px solid white;
            cursor: pointer;
          `;

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([memory.lng, memory.lat])
            .addTo(map.current!);

          marker.getElement().addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent map click events
            setSelectedMemory(memory);
          });

          markersRef.current.push(marker);
        } catch (e) {
          console.warn('Error creating marker for memory:', memory.id, e);
        }
      });
    } catch (error) {
      console.error('Error updating markers:', error);
    }
  }, [memories, isMapLoaded]);

  // Handle map click for preview mode
  useEffect(() => {
    if (!map.current || !isMapLoaded || !isPreviewMode || !MAPBOX_TOKEN) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      try {
        const target = e.originalEvent.target as HTMLElement;
        if (target.closest('.memory-marker') || target.closest('.preview-marker')) {
          return;
        }

        const { lat, lng } = e.lngLat;
        handlePreviewAtPoint(lat, lng);
      } catch (error) {
        console.error('Error handling map click:', error);
      }
    };

    try {
      map.current.on('click', handleMapClick);
    } catch (error) {
      console.error('Error attaching map click handler:', error);
    }

    return () => {
      if (map.current) {
        try {
          map.current.off('click', handleMapClick);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [isMapLoaded, isPreviewMode]);

  // Stop preview playback
  const stopPreviewPlayback = useCallback(() => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    audioQueue.mute();
    audioQueue.clear();
    setIsGhostPlaying(false);
    setPreviewStatus('idle');
    setPreviewError(null);
  }, []);

  // Add preview memories to queue
  const addPreviewMemoriesToQueue = useCallback(async (lat: number, lng: number, memoriesWithAudio: Memory[]) => {
    const previewUserLocation: UserLocation = {
      lat,
      lng,
      accuracy: 10,
      timestamp: Date.now(),
    };

    const memoriesInRadius = filterMemoriesByRadius(memoriesWithAudio, lat, lng);

    for (const memory of memoriesInRadius) {
      const distance = calculateDistance(lat, lng, memory.lat, memory.lng);
      if (distance > memory.radius_m || distance > PREVIEW_RADIUS) continue;

      const isOwner = userId ? memory.author_id === userId : false;
      audioQueue.addMemory(memory, previewUserLocation, isOwner, false);
    }
  }, [userId, filterMemoriesByRadius, calculateDistance]);

  // Handle preview at point
  const handlePreviewAtPoint = useCallback(async (lat: number, lng: number) => {
    if (!isPreviewMode || !MAPBOX_TOKEN) return;

    try {
      stopPreviewPlayback();
      setPreviewLocation({ lat, lng });
      setIsPreviewLoading(true);
      setPreviewStatus('loading');
      setPreviewError(null);
      
      console.log(`[ghost] Preview at point: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

      // Remove existing preview marker
      if (previewMarkerRef.current) {
        try {
          previewMarkerRef.current.remove();
        } catch (e) {
          // Marker already removed
        }
        previewMarkerRef.current = null;
      }

      // Create preview marker
      if (map.current) {
        const el = document.createElement('div');
        el.className = 'preview-marker';
        el.style.cssText = `
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: rgba(6, 182, 212, 0.7);
          border: 3px dashed white;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.8);
          cursor: pointer;
          pointer-events: none;
          animation: pulse 2s infinite;
        `;

        if (!document.getElementById('preview-marker-style')) {
          const style = document.createElement('style');
          style.id = 'preview-marker-style';
          style.textContent = `
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.2); opacity: 1; }
              100% { transform: scale(1); opacity: 0.7; }
            }
          `;
          document.head.appendChild(style);
        }

        previewMarkerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }

      // Step 1: Fetch memories in bounding box
      let memoriesInBoundingBox: Memory[] = [];
      try {
        memoriesInBoundingBox = await getMemoriesInRadius(lat, lng, PREVIEW_RADIUS);
        console.log(`[ghost] Found ${memoriesInBoundingBox.length} memories in ${PREVIEW_RADIUS}m bounding box`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ghost] Error fetching memories:', error);
        setPreviewError(`Failed to fetch memories: ${errorMsg}`);
        setPreviewStatus('error');
        setIsPreviewLoading(false);
        toast.error('Failed to fetch memories');
        return;
      }

      // Step 2: Apply strict radius filtering
      const memoriesInRadius = filterMemoriesByRadius(memoriesInBoundingBox, lat, lng);
      console.log(`[ghost] After radius filtering: ${memoriesInRadius.length} memories`);
      setPreviewMemories(memoriesInRadius);

      if (memoriesInRadius.length === 0) {
        toast.info('No memories found at this location', {
          description: `No memories with radius covering this point within ${PREVIEW_RADIUS}m.`,
          duration: 4000,
        });
        setPreviewStatus('idle');
        setIsPreviewLoading(false);
        return;
      }

      // Step 3: Filter to only memories with audio
      const memoriesWithAudio = memoriesInRadius.filter(m => m.audio_url);
      console.log(`[ghost] Final: ${memoriesWithAudio.length} memories with audio to play`);
      
      if (memoriesWithAudio.length === 0) {
        toast.info('No audio memories at this location', {
          description: `Found ${memoriesInRadius.length} memories but none have audio recordings.`,
          duration: 4000,
        });
        setPreviewStatus('idle');
        setIsPreviewLoading(false);
        return;
      }

      // Step 4: Unlock audio and start playback
      try {
        await audioQueue.unlockAudio();
        audioQueue.clear();
        await addPreviewMemoriesToQueue(lat, lng, memoriesWithAudio);
        audioQueue.unmute();
        setIsGhostPlaying(true);
        setPreviewStatus('playing');
        setPreviewError(null);

        // Continuous playback - periodically re-add memories to keep the queue filled
        previewIntervalRef.current = setInterval(async () => {
          try {
            const freshInBoundingBox = await getMemoriesInRadius(lat, lng, PREVIEW_RADIUS);
            const freshInRadius = filterMemoriesByRadius(freshInBoundingBox, lat, lng);
            const freshWithAudio = freshInRadius.filter(m => m.audio_url);
            if (freshWithAudio.length > 0) {
              await addPreviewMemoriesToQueue(lat, lng, freshWithAudio);
            }
          } catch (err) {
            console.warn('[ghost] Preview fetch error:', err);
            // Don't set error status for background refresh failures
          }
        }, 10000);

        toast.success(`Preview started: ${memoriesWithAudio.length} memories`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ghost] Preview audio error:', error);
        setPreviewError(`Audio playback failed: ${errorMsg}`);
        setPreviewStatus('error');
        toast.error('Failed to start audio playback');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ghost] Preview error:', error);
      setPreviewError(errorMsg);
      setPreviewStatus('error');
      toast.error('Failed to load preview');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [isPreviewMode, userId, stopPreviewPlayback, addPreviewMemoriesToQueue, filterMemoriesByRadius]);

  // Cleanup preview when mode disabled
  useEffect(() => {
    if (!isPreviewMode) {
      stopPreviewPlayback();
      if (previewMarkerRef.current) {
        previewMarkerRef.current.remove();
        previewMarkerRef.current = null;
      }
      setPreviewLocation(null);
      setPreviewMemories([]);
      setPreviewStatus('idle');
      setPreviewError(null);
    }
  }, [isPreviewMode, stopPreviewPlayback]);
  
  // Diagnostic query on mount
  useEffect(() => {
    if (isOpen && isPreviewMode) {
      // Test query to verify RLS policies
      supabase
        .from('memories')
        .select('*')
        .limit(1)
        .then(({ data, error }) => {
          if (error) {
            console.error('[ghost] Diagnostic query error:', error);
          } else {
            console.log(`[ghost] Diagnostic query: ${data?.length || 0} rows returned`);
          }
        });
    }
  }, [isOpen, isPreviewMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
      }
      stopPreviewPlayback();
    };
  }, [stopPreviewPlayback]);

  // Load memories when filters change
  const updateQueueInfo = useCallback(() => {
    setQueueInfo({
      length: audioQueue.getQueueLength(),
      playing: audioQueue.getCurrentlyPlaying(),
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMemories();
      updateQueueInfo();
      const interval = setInterval(updateQueueInfo, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadMemories, updateQueueInfo]);

  const handleApplyDateFilter = () => {
    setActiveDateFilter({
      start: startDate || undefined,
      end: endDate || undefined,
    });
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setActiveDateFilter({});
  };

  const handleApplyUserIdFilter = () => {
    setActiveUserIdFilter(userIdFilterInput.trim() || undefined);
  };

  const handleClearUserIdFilter = () => {
    setUserIdFilterInput('');
    setActiveUserIdFilter(undefined);
  };

  const togglePreviewMode = () => {
    setIsPreviewMode(prev => {
      if (!prev) {
        toast.info('Ghost Preview Mode: Click map to preview audio');
      } else {
        stopPreviewPlayback();
        toast.info('Ghost Preview disabled');
      }
      return !prev;
    });
  };

  // NOW we can do early return after all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-black border-2 border-white">
        <CardHeader className="flex-shrink-0 border-b border-white">
          <div className="flex items-center justify-between">
            <CardTitle className="font-terminal text-white text-xl">
              &gt; DEV_PORTAL.EXE
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:text-black"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-6 space-y-4 flex flex-col">
          {/* Error Display */}
          {hasError && (
            <div className="bg-red-900/50 border-2 border-red-500 text-white p-4 rounded font-terminal text-sm">
              <div className="font-bold mb-2">ERROR:</div>
              <div>{hasError}</div>
              {!MAPBOX_TOKEN && (
                <div className="mt-2 text-xs">
                  Please set VITE_MAPBOX_TOKEN in your .env.local file
                </div>
              )}
            </div>
          )}

          {/* Controls Row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={togglePreviewMode}
              variant="outline"
              size="sm"
              className={`font-terminal border-white hover:bg-white hover:text-black ${
                isPreviewMode ? 'bg-white text-black' : 'bg-black text-white'
              }`}
            >
              <Ghost className="h-4 w-4 mr-2" />
              {isPreviewMode ? 'Ghost ON' : 'Ghost OFF'}
            </Button>
            {isPreviewMode && (
              <Button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                variant="outline"
                size="sm"
                className="font-terminal text-cyan-400 border-cyan-400 hover:bg-cyan-400 hover:text-black"
              >
                Debug
              </Button>
            )}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="font-terminal bg-black text-white border-white hover:bg-white hover:text-black"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              onClick={loadMemories}
              variant="outline"
              size="sm"
              className="font-terminal bg-black text-white border-white hover:bg-white hover:text-black"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filters Panel - Now as Sheet Overlay */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetContent 
              side="right" 
              className="bg-black border-white overflow-y-auto w-full sm:max-w-md max-h-screen"
            >
              <SheetHeader>
                <SheetTitle className="font-terminal text-white text-sm">
                  &gt; FILTERS:
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
              
              {/* Date Filters */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Date Range:</span>
                </div>
                
                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      setStartDate(yesterday.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                      setActiveDateFilter({
                        start: yesterday.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0],
                      });
                    }}
                    size="sm"
                    variant="outline"
                    className="font-terminal text-xs bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    Last Day
                  </Button>
                  <Button
                    onClick={() => {
                      const today = new Date();
                      const weekAgo = new Date(today);
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      setStartDate(weekAgo.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                      setActiveDateFilter({
                        start: weekAgo.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0],
                      });
                    }}
                    size="sm"
                    variant="outline"
                    className="font-terminal text-xs bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    Last Week
                  </Button>
                  <Button
                    onClick={() => {
                      const today = new Date();
                      const monthAgo = new Date(today);
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      setStartDate(monthAgo.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                      setActiveDateFilter({
                        start: monthAgo.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0],
                      });
                    }}
                    size="sm"
                    variant="outline"
                    className="font-terminal text-xs bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    Last Month
                  </Button>
                  <Button
                    onClick={() => {
                      const today = new Date();
                      const threeMonthsAgo = new Date(today);
                      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                      setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                      setActiveDateFilter({
                        start: threeMonthsAgo.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0],
                      });
                    }}
                    size="sm"
                    variant="outline"
                    className="font-terminal text-xs bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    onClick={() => {
                      const today = new Date();
                      const yearAgo = new Date(today);
                      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                      setStartDate(yearAgo.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                      setActiveDateFilter({
                        start: yearAgo.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0],
                      });
                    }}
                    size="sm"
                    variant="outline"
                    className="font-terminal text-xs bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    Last Year
                  </Button>
                  <Button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setActiveDateFilter({});
                    }}
                    size="sm"
                    variant="outline"
                    className="font-terminal text-xs bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    All Time
                  </Button>
                </div>

                {/* Manual Date Inputs */}
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-black border-white text-white"
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black border-white text-white"
                  />
                  <Button
                    onClick={handleApplyDateFilter}
                    size="sm"
                    className="bg-white text-black hover:bg-gray-200"
                  >
                    Apply
                  </Button>
                  <Button
                    onClick={handleClearDateFilter}
                    size="sm"
                    variant="outline"
                    className="bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* User ID Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white text-sm">
                  <User className="h-4 w-4" />
                  <span>User ID:</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="User ID (UUID)"
                    value={userIdFilterInput}
                    onChange={(e) => setUserIdFilterInput(e.target.value)}
                    className="bg-black border-white text-white"
                  />
                  <Button
                    onClick={handleApplyUserIdFilter}
                    size="sm"
                    className="bg-white text-black hover:bg-gray-200"
                  >
                    Apply
                  </Button>
                  <Button
                    onClick={handleClearUserIdFilter}
                    size="sm"
                    variant="outline"
                    className="bg-black border-white text-white hover:bg-white hover:text-black"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Debug Panel */}
          {isPreviewMode && showDebugPanel && (
            <div className="border border-cyan-500 p-2">
              <GhostDebugPanel
                supabaseUrl={supabaseUrl}
                supabaseAnonKey={supabaseAnonKey}
                userId={userId}
                queryStatus={queryStatus}
                queryError={queryError}
                memoriesCount={memories.length}
                previewStatus={previewStatus}
                previewError={previewError}
                previewLocation={previewLocation}
              />
            </div>
          )}

          {/* Map and Info Split */}
          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            {/* Map */}
            <div className="border border-white relative bg-black" style={{ minHeight: '400px' }}>
              {MAPBOX_TOKEN ? (
                <>
                  <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />
                  {isPreviewLoading && (
                    <div className="absolute top-2 left-2 bg-black/80 text-white p-2 text-sm font-terminal">
                      Loading preview...
                    </div>
                  )}
                  {isGhostPlaying && previewLocation && (
                    <div className="absolute top-2 left-2 bg-cyan-500/80 text-white p-2 text-sm font-terminal">
                      🔮 Playing at {previewLocation.lat.toFixed(4)}, {previewLocation.lng.toFixed(4)}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-terminal text-sm" style={{ minHeight: '400px' }}>
                  <div className="text-center p-4">
                    <div className="mb-2">Mapbox token not configured</div>
                    <div className="text-xs text-gray-400">Set VITE_MAPBOX_TOKEN in .env.local</div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="border border-white overflow-y-auto p-4 space-y-4">
              {/* Memory Player Panel */}
              {selectedMemory && (
                <MemoryPlayerPanel
                  memory={selectedMemory}
                  onClose={() => setSelectedMemory(null)}
                />
              )}

              {/* Location Info */}
              <div className="font-terminal text-white space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>&gt; LOCATION:</span>
                </div>
                {userLocation ? (
                  <div className="pl-6 text-sm">
                    <div>Lat: {userLocation.lat.toFixed(6)}</div>
                    <div>Lng: {userLocation.lng.toFixed(6)}</div>
                    {userLocation.accuracy && <div>Accuracy: ±{Math.round(userLocation.accuracy)}m</div>}
                  </div>
                ) : (
                  <div className="pl-6 text-sm text-gray-400">No location data</div>
                )}
              </div>

              {/* User Info */}
              <div className="font-terminal text-white space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>&gt; USER_ID:</span>
                </div>
                <div className="pl-6 text-sm">{userId || 'Not logged in'}</div>
              </div>

              {/* Audio Queue Info */}
              <div className="font-terminal text-white space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span>&gt; AUDIO_QUEUE:</span>
                </div>
                <div className="pl-6 text-sm">
                  <div>Queue Length: {queueInfo.length}</div>
                  {queueInfo.playing && (
                    <div>Playing: {queueInfo.playing.memory?.summary || 'Unknown'}</div>
                  )}
                </div>
              </div>

              {/* Memories List */}
              <div className="font-terminal text-white space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>&gt; MEMORIES ({memories.length}):</span>
                </div>
                <div className="pl-6 space-y-2 max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="text-sm text-gray-400">Loading...</div>
                  ) : memories.length === 0 ? (
                    <div className="text-sm text-gray-400">No memories found</div>
                  ) : (
                    memories.map((memory) => (
                      <div key={memory.id} className="text-sm border-b border-gray-700 pb-2">
                        <div className="font-semibold">{memory.summary || 'No summary'}</div>
                        <div className="text-gray-400 text-xs">
                          {memory.place_name} | {memory.audio_url ? 'Has audio' : 'No audio'} | 
                          Created: {new Date(memory.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
