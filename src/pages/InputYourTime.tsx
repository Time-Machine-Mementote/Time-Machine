// Page 1: "Input your time" - Homepage with disappearing cursor that opens map
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BERKELEY_CAMPUS_CENTER, BERKELEY_CAMPUS_ZOOM } from '@/types/memory';
import { toast } from 'sonner';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Debug: Log token status (only first 20 chars for security)
if (import.meta.env.DEV) {
  console.log('Mapbox token check:', {
    exists: !!MAPBOX_TOKEN,
    length: MAPBOX_TOKEN?.length || 0,
    preview: MAPBOX_TOKEN ? MAPBOX_TOKEN.substring(0, 20) + '...' : 'MISSING',
    startsWithPk: MAPBOX_TOKEN?.startsWith('pk.') || false
  });
}

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else if (import.meta.env.DEV) {
  console.warn('⚠️ VITE_MAPBOX_TOKEN not found in environment variables');
  console.warn('Make sure .env.local exists with VITE_MAPBOX_TOKEN=...');
}

export default function InputYourTime() {
  const [showMap, setShowMap] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pinMarker = useRef<mapboxgl.Marker | null>(null);
  const navigateTimeout = useRef<number | null>(null);
  const hasClickedRef = useRef(false);
  const navigate = useNavigate();

  // Reveal map after initial click
  useEffect(() => {
    const handleInitialClick = () => {
      if (hasClickedRef.current) return;
      hasClickedRef.current = true;
      setShowCursor(false);
      setTimeout(() => setShowMap(true), 200);
      window.removeEventListener('click', handleInitialClick);
    };

    window.addEventListener('click', handleInitialClick);
    return () => window.removeEventListener('click', handleInitialClick);
  }, []);

  // Initialize map when it should be shown
  useEffect(() => {
    if (!showMap || !mapContainer.current) return;

    // Try to get token from environment at runtime (in case env wasn't loaded at module level)
    const runtimeToken = import.meta.env.VITE_MAPBOX_TOKEN || MAPBOX_TOKEN;
    
    console.log('Initializing map...', { 
      hasToken: !!runtimeToken,
      hasConstToken: !!MAPBOX_TOKEN,
      hasEnvToken: !!import.meta.env.VITE_MAPBOX_TOKEN,
      tokenPreview: runtimeToken ? runtimeToken.substring(0, 20) + '...' : 'none',
      tokenLength: runtimeToken?.length || 0,
      tokenStartsWithPk: runtimeToken?.startsWith('pk.') || false
    });

    if (!runtimeToken) {
      console.error('Mapbox token not found');
      toast.error('Mapbox token not configured. Please check .env.local file and restart the dev server.');
      return;
    }

    // Validate token format
    if (!runtimeToken.startsWith('pk.')) {
      console.error('Invalid token format:', runtimeToken.substring(0, 10));
      toast.error('Invalid Mapbox token format. Token should start with "pk."');
      return;
    }

    try {
      mapboxgl.accessToken = runtimeToken;
      console.log('✓ Mapbox access token set');

      // Validate token by checking if we can access Mapbox API
      try {
        const testUrl = `https://api.mapbox.com/tokens/v2?access_token=${runtimeToken}`;
        fetch(testUrl)
          .then(res => {
            if (!res.ok) {
              console.warn('Token validation failed:', res.status, res.statusText);
            } else {
              console.log('✓ Token validated successfully');
            }
          })
          .catch(err => {
            console.warn('Token validation check failed (this is ok):', err);
          });
      } catch (validationError) {
        console.warn('Could not validate token (continuing anyway):', validationError);
      }

      // Try to create map with error handling
      const mapConfig = {
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: BERKELEY_CAMPUS_CENTER,
        zoom: BERKELEY_CAMPUS_ZOOM,
        pitch: 0,
        bearing: 0,
      };

      console.log('Creating map with config:', { ...mapConfig, container: '[Element]' });
      
      map.current = new mapboxgl.Map(mapConfig);

      // Change cursor to pin on map
      map.current.getCanvas().style.cursor = 'crosshair';

      // Handle map load
      map.current.on('load', () => {
        console.log('✓ Map loaded successfully');
        console.log('Map style loaded:', map.current?.getStyle()?.name || 'Unknown');
      });

      // Handle style loading errors
      map.current.on('style.loading', () => {
        console.log('Map style loading...');
      });

      map.current.on('style.error', (e: any) => {
        console.error('Style loading error:', e);
        alert('Failed to load map style.\n\nThis usually means:\n1. Token is invalid/expired\n2. Token lacks style permissions\n3. Network connectivity issue\n\nCheck browser console (F12) for details.');
      });

      // Handle map errors - comprehensive error handling
      map.current.on('error', (e: any) => {
        console.error('=== MAPBOX ERROR ===');
        console.error('Full error object:', e);
        console.error('Error type:', e.type);
        console.error('Error message:', e.message);
        console.error('Error.error:', e.error);
        
        // Try to extract error details from various possible locations
        const errorMsg = e.error?.message || e.error?.error || e.message || e.toString() || 'Unknown error';
        const statusCode = e.error?.statusCode || e.statusCode;
        const errorType = e.error?.type || e.type;
        
        console.error('Extracted error details:', { errorMsg, statusCode, errorType });
        
        // Check for specific error types
        if (statusCode === 401 || errorMsg?.toLowerCase().includes('unauthorized') || errorMsg?.toLowerCase().includes('token')) {
          alert('Mapbox token is invalid or expired (401 Unauthorized).\n\nPlease:\n1. Verify your token at mapbox.com\n2. Check .env.local has correct VITE_MAPBOX_TOKEN\n3. Restart dev server completely\n4. Hard refresh browser (Ctrl+Shift+R)');
        } else if (statusCode === 403 || errorMsg?.toLowerCase().includes('forbidden')) {
          alert('Mapbox token access denied (403 Forbidden).\n\nToken may not have required permissions for map styles.');
        } else if (statusCode === 404 || errorMsg?.toLowerCase().includes('not found')) {
          alert('Mapbox resource not found (404).\n\nThis might be a token permissions issue.');
        } else {
          // For unknown errors, provide generic troubleshooting
          alert(`Map loading error (${statusCode || 'Unknown'}): ${errorMsg}\n\nTroubleshooting:\n1. Check browser console (F12) for details\n2. Verify .env.local exists with VITE_MAPBOX_TOKEN\n3. Ensure token starts with "pk."\n4. Restart dev server and hard refresh browser`);
        }
      });

      // Handle map click to place pin
      const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        setPinLocation({ lat, lng });

        // Remove existing pin
        if (pinMarker.current) {
          pinMarker.current.remove();
        }

        // Add new pin marker
        const el = document.createElement('div');
        el.className = 'pin-marker';
        el.style.cssText = `
          width: 30px;
          height: 30px;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="red"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');
          background-size: contain;
          background-repeat: no-repeat;
          cursor: pointer;
        `;

        pinMarker.current = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);

        if (navigateTimeout.current) {
          window.clearTimeout(navigateTimeout.current);
        }

        // Navigate to terminal page after holding pin briefly
        navigateTimeout.current = window.setTimeout(() => {
          navigate('/terminal', { 
            state: { 
              location: { lat, lng } 
            } 
          });
        }, 1000);
      };

      map.current.on('click', handleMapClick);

      return () => {
        if (navigateTimeout.current) {
          window.clearTimeout(navigateTimeout.current);
          navigateTimeout.current = null;
        }
        if (pinMarker.current) {
          pinMarker.current.remove();
        }
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      alert('Failed to initialize map. Please check your Mapbox configuration.');
    }
  }, [showMap, navigate]);

  return (
    <div className="relative w-full h-screen bg-black text-white font-mono overflow-hidden">
      {/* Terminal-style cursor overlay */}
      {showCursor && (
        <div 
          className="fixed pointer-events-none z-50 transition-opacity duration-300"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="text-6xl font-mono text-white animate-pulse">
            &gt;
          </div>
        </div>
      )}

      {/* Homepage text - terminal style */}
      {!showMap && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-4xl md:text-6xl font-mono text-white mb-4 animate-pulse">
              INPUT YOUR TIME
            </div>
            <div className="text-xl md:text-2xl font-mono text-white/70 mt-4">
              &gt; Click to continue.
            </div>
          </div>
        </div>
      )}

      {/* Map container */}
      {showMap && (
        <div className="absolute inset-0">
          <div ref={mapContainer} className="w-full h-full" />
          {!pinLocation && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-black/80 border border-white px-6 py-3 rounded font-mono text-white text-sm">
                &gt; click on campus to place pin
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terminal-style header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/90 border-b border-white/30 px-4 py-2">
        <div className="font-mono text-xs text-white/70">
          TIME_MACHINE.EXE v2.0 | STATUS: READY | {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

