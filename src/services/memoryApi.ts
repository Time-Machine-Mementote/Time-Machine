// Berkeley Memory Map API Services
import { supabase } from '@/integrations/supabase/client';
import type { Memory, MemoryLink, Play, Place, ExtractedPlace, ExtractedTime } from '@/types/memory';

// Get Supabase URL from client config or env (with fallback)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://iwwvjecrvgrdyptxhnwj.supabase.co';

if (!SUPABASE_URL) {
  console.error('VITE_SUPABASE_URL is not set in environment variables');
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

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ text, memory_id: memoryId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Audio synthesis failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to synthesize audio:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
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
      privacy,
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
