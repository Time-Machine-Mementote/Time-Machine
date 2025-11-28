// Berkeley Memory Map API Services
import { supabase } from '@/integrations/supabase/client';
import type { Memory, MemoryLink, Play, Place, ExtractedPlace, ExtractedTime } from '@/types/memory';

// Get Supabase URL - use same fallback as client.ts for consistency
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qhbrnotooiutpwwtadlx.supabase.co';

if (!SUPABASE_URL) {
  console.error('VITE_SUPABASE_URL is not set in environment variables');
} else {
  console.log('📡 Using Supabase URL for Edge Functions:', SUPABASE_URL);
}

// Edge Function calls
export async function extractEntities(text: string) {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured');
  }

  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Extract entities failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to extract entities:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
}

export async function geocodePlace(name: string, hint?: string) {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured');
  }

  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/geocode-place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ name, hint }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Geocoding failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to geocode place:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
}

export async function synthesizeAudio(text: string, memoryId?: string) {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured');
  }

  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/generate-audio`;
    
    console.log('Calling generate-audio Edge Function:', {
      url: edgeFunctionUrl,
      hasToken: !!token,
      textLength: text.length,
      supabaseUrl: SUPABASE_URL,
    });

    // First, test if the Edge Function endpoint is reachable
    let response: Response;
    try {
      response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ text, memory_id: memoryId }),
      });
    } catch (fetchError: any) {
      console.error('Network error calling Edge Function:', fetchError);
      
      // Check if it's a network error (CORS, DNS, etc.)
      if (fetchError instanceof TypeError) {
        const errorMsg = `Cannot reach Edge Function at ${edgeFunctionUrl}.\n\n` +
          `Possible causes:\n` +
          `1. Edge Function not deployed (404)\n` +
          `2. Supabase project paused or inactive\n` +
          `3. Network/CORS issue\n` +
          `4. Wrong Supabase URL: ${SUPABASE_URL}\n\n` +
          `To fix:\n` +
          `- Deploy: supabase functions deploy generate-audio\n` +
          `- Check: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx/functions`;
        
        throw new Error(errorMsg);
      }
      throw fetchError;
    }

    console.log('Edge Function response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error response:', errorText);
      
      // Try to parse as JSON for better error message
      let errorMessage = `Audio synthesis failed: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        errorMessage += ` - ${errorText}`;
      }

      // Provide helpful guidance
      if (response.status === 404) {
        errorMessage += '\n\n⚠️ Edge Function not found. Please deploy the generate-audio function:';
        errorMessage += '\n   Run: supabase functions deploy generate-audio';
      } else if (response.status === 500 || response.status === 502) {
        errorMessage += '\n\n⚠️ Edge Function error. Check:';
        errorMessage += '\n   1. OPENAI_API_KEY is set in Supabase Dashboard';
        errorMessage += '\n   2. Edge Function logs in Supabase Dashboard';
      } else if (response.status === 401) {
        errorMessage += '\n\n⚠️ Authentication failed. Try refreshing the page.';
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Edge Function success result:', {
      success: result.success,
      hasAudioUrl: !!result.audioUrl,
      hasAudioContent: !!result.audioContent,
    });

    // Handle different response formats
    if (result.audioUrl) {
      return result;
    } else if (result.audioContent) {
      // If we get base64 data URL, return it
      return { audioUrl: result.audioUrl || result.audioContent };
    } else {
      throw new Error('Edge Function returned invalid response format. Expected audioUrl or audioContent.');
    }
  } catch (error: any) {
    console.error('Failed to synthesize audio:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to Edge Function. Please check:\n1. Your internet connection\n2. Supabase project is active\n3. Edge Function is deployed');
    }
    
    if (error.message) {
      throw error; // Re-throw with the detailed message we created
    }
    
    throw new Error('Failed to generate audio. Please check the browser console for details.');
  }
}

// Database operations
export async function createMemory(memory: Omit<Memory, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('memories')
    .insert(memory)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get all public memories (for displaying on map)
export async function getAllPublicMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('privacy', 'public')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all memories:', error);
    return [];
  }

  return (data || []) as Memory[];
}

// Get nearby memories using RPC function (optimized PostGIS query)
export async function getNearbyMemories(lat: number, lng: number, radiusM: number = 20) {
  const { data, error } = await supabase.rpc('nearby_memories', {
    user_lat: lat,
    user_lng: lng,
    radius_meters: radiusM,
  });

  if (error) {
    console.error('Error fetching nearby memories:', error);
    throw error;
  }

  return (data || []) as Memory[];
}

// Optimized: Use PostGIS spatial queries for fast radius searches
export async function getMemoriesInRadius(lat: number, lng: number, radiusM: number = 100) {
  try {
    // Use PostGIS ST_DWithin for efficient spatial queries (if location column exists)
    // Fallback to bounding box for now until PostGIS is fully set up
    const { data, error } = await supabase.rpc('get_memories_in_radius', {
      center_lat: lat,
      center_lng: lng,
      radius_meters: radiusM,
    }).select('*');

    // Fallback to bounding box if RPC doesn't exist yet
    if (error && (error.code === '42883' || error.code === 'P0001')) {
      console.warn('RPC function not found, using bounding box fallback:', error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('memories')
        .select('*')
        .gte('lat', lat - (radiusM / 111000))
        .lte('lat', lat + (radiusM / 111000))
        .gte('lng', lng - (radiusM / (111000 * Math.cos(lat * Math.PI / 180))))
        .lte('lng', lng + (radiusM / (111000 * Math.cos(lat * Math.PI / 180))));
      
      if (fallbackError) {
        console.error('Error fetching memories:', fallbackError);
        return []; // Return empty array instead of throwing
      }
      return (fallbackData as Memory[]) || [];
    }

    if (error) {
      console.error('Error fetching memories:', error);
      return []; // Return empty array instead of throwing
    }
    return (data as Memory[]) || [];
  } catch (error) {
    console.error('Failed to get memories in radius:', error);
    return []; // Return empty array on any error to prevent crashes
  }
}

export async function getMemoryById(id: string) {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Memory;
}

export async function createMemoryLink(link: Omit<MemoryLink, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('memory_links')
    .insert(link)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordPlay(play: Omit<Play, 'id' | 'heard_at'>) {
  const { data, error } = await supabase
    .from('plays')
    .insert(play)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPlaysByMemory(memoryId: string) {
  const { data, error } = await supabase
    .from('plays')
    .select('*')
    .eq('memory_id', memoryId)
    .order('heard_at', { ascending: false });

  if (error) throw error;
  return data as Play[];
}

export async function getPlaysByUser(userId: string) {
  const { data, error } = await supabase
    .from('plays')
    .select('*')
    .eq('user_id', userId)
    .order('heard_at', { ascending: false });

  if (error) throw error;
  return data as Play[];
}

export async function createPlace(place: Omit<Place, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('places')
    .insert(place)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPlaceByName(name: string) {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('name', name)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data as Place | null;
}

// Enrich an existing memory with extracted entities and update places table
// This function is called after a memory is created to ensure all databases are updated
export async function enrichMemoryWithEntities(memoryId: string, text: string) {
  try {
    if (!text || !text.trim()) {
      console.log('No text to process for memory enrichment');
      return;
    }

    // Step 1: Extract entities
    const { entities } = await extractEntities(text);
    
    // Step 2: Geocode extracted places and cache them in the places table
    const geocodedPlaces: ExtractedPlace[] = [];
    if (entities.places && entities.places.length > 0) {
      for (const place of entities.places) {
        try {
          const { result } = await geocodePlace(place.name, place.hint);
          geocodedPlaces.push({
            name: place.name,
            hint: place.hint,
            lat: result.lat,
            lng: result.lng,
            confidence: result.confidence,
            place_type: result.place_type,
          });
          
          // Cache the place in the database (this updates the places table)
          try {
            // Check if place already exists
            const existingPlace = await getPlaceByName(place.name);
            if (!existingPlace) {
              await createPlace({
                name: place.name,
                lat: result.lat,
                lng: result.lng,
                confidence: result.confidence,
                place_type: result.place_type,
              });
            }
          } catch (error) {
            console.warn(`Failed to cache place in database: ${place.name}`, error);
          }
        } catch (error) {
          console.warn(`Failed to geocode place: ${place.name}`, error);
          geocodedPlaces.push(place);
        }
      }
    }

    // Step 3: Update the memory record with extracted entities
    const updateData: any = {};
    
    // Only update extracted_places if we found any
    if (geocodedPlaces.length > 0) {
      updateData.extracted_places = geocodedPlaces;
    }
    
    // Update extracted_times if available
    if (entities.times && entities.times.length > 0) {
      updateData.extracted_times = entities.times;
    }
    
    // Update extracted_people if available (merge with existing if any)
    if (entities.people && entities.people.length > 0) {
      // Get current memory to merge people
      const currentMemory = await getMemoryById(memoryId);
      const existingPeople = currentMemory.extracted_people || [];
      const mergedPeople = Array.from(new Set([...existingPeople, ...entities.people]));
      updateData.extracted_people = mergedPeople;
    }
    
    // Update summary if we have a better one from entities
    if (entities.summary && entities.summary.trim()) {
      updateData.summary = entities.summary;
    }

    // Only update if we have data to update
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('memories')
        .update(updateData)
        .eq('id', memoryId);

      if (error) {
        console.error('Failed to update memory with extracted entities:', error);
      } else {
        console.log('Memory enriched with extracted entities:', memoryId);
      }
    }
  } catch (error) {
    // Don't throw - enrichment is non-critical, just log the error
    console.error('Failed to enrich memory with entities:', error);
  }
}

// Memory processing pipeline
export async function processMemoryText(
  text: string,
  lat: number,
  lng: number,
  authorId: string,
  privacy: 'private' | 'friends' | 'public' = 'public'
) {
  try {
    // Step 1: Extract entities
    const { entities } = await extractEntities(text);
    
    // Step 2: Geocode extracted places
    const geocodedPlaces: ExtractedPlace[] = [];
    if (entities.places && entities.places.length > 0) {
      for (const place of entities.places) {
        try {
          const { result } = await geocodePlace(place.name, place.hint);
          geocodedPlaces.push({
            name: place.name,
            hint: place.hint,
            lat: result.lat,
            lng: result.lng,
            confidence: result.confidence,
            place_type: result.place_type,
          });
          
          // Cache the place in the database
          await createPlace({
            name: place.name,
            lat: result.lat,
            lng: result.lng,
            confidence: result.confidence,
            place_type: result.place_type,
          });
        } catch (error) {
          console.warn(`Failed to geocode place: ${place.name}`, error);
          geocodedPlaces.push(place);
        }
      }
    }

    // Step 3: Create memory record
    const memory = await createMemory({
      author_id: authorId,
      text,
      lat,
      lng,
      radius_m: 30, // Default radius
      privacy,
      source: 'user',
      summary: entities.summary,
      extracted_places: geocodedPlaces,
      extracted_times: entities.times,
      extracted_people: entities.people,
    });

    // Step 4: Generate audio
    try {
      const { audioUrl } = await synthesizeAudio(entities.summary || text, memory.id);
      
      // Update memory with audio URL
      const { data, error } = await supabase
        .from('memories')
        .update({ audio_url: audioUrl })
        .eq('id', memory.id)
        .select()
        .single();

      if (error) throw error;
      return data as Memory;
    } catch (error) {
      console.warn('Failed to generate audio:', error);
      return memory;
    }
  } catch (error) {
    console.error('Failed to process memory:', error);
    throw error;
  }
}
