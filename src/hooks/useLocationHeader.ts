import { useState, useEffect } from 'react';

interface LocationHeaderState {
  day: string;
  date: string;
  time: string;
  town: string;
  isLoading: boolean;
}

export function useLocationHeader(location: { lat: number; lng: number } | null) {
  const [state, setState] = useState<LocationHeaderState>({
    day: '',
    date: '',
    time: '',
    town: 'Locating…',
    isLoading: true,
  });

  // Update date/time every minute
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Day of week
      const day = now.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Date: Month Day, Year
      const date = now.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      // Time: 12-hour with AM/PM
      const time = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      setState(prev => ({
        ...prev,
        day,
        date,
        time,
      }));
    };

    // Update immediately
    updateDateTime();
    
    // Then update every minute
    const interval = setInterval(updateDateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Reverse geocode location to get city/town
  useEffect(() => {
    if (!location) {
      setState(prev => ({
        ...prev,
        town: 'Unknown location',
        isLoading: false,
      }));
      return;
    }

    const reverseGeocode = async () => {
      try {
        const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
        
        if (!mapboxToken) {
          // Fallback: try using browser's built-in reverse geocoding if available
          // Or use a free service like OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Time-Machine/1.0',
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            // Try to get city, town, or locality
            const address = data.address || {};
            const town = address.city || address.town || address.locality || address.village || address.county || 'Unknown location';
            
            setState(prev => ({
              ...prev,
              town,
              isLoading: false,
            }));
            return;
          }
        } else {
          // Use Mapbox reverse geocoding
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${mapboxToken}&types=place,locality,neighborhood`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              // Get the most relevant place feature
              const feature = data.features.find((f: any) => 
                f.place_type?.includes('place') || 
                f.place_type?.includes('locality') ||
                f.place_type?.includes('neighborhood')
              ) || data.features[0];
              
              // Extract city/town name from place_name or text
              const town = feature.text || feature.place_name?.split(',')[0] || 'Unknown location';
              
              setState(prev => ({
                ...prev,
                town,
                isLoading: false,
              }));
              return;
            }
          }
        }
        
        // Fallback if both fail
        setState(prev => ({
          ...prev,
          town: 'Unknown location',
          isLoading: false,
        }));
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
        setState(prev => ({
          ...prev,
          town: 'Unknown location',
          isLoading: false,
        }));
      }
    };

    reverseGeocode();
  }, [location]);

  return state;
}

