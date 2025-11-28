// Berkeley Memory Map Types
export interface Memory {
  id: string;
  author_id: string;
  text: string;
  created_at: string;
  t_start?: string;
  t_end?: string;
  lat: number;
  lng: number;
  radius_m: number;
  place_name?: string;
  audio_url?: string;
  privacy: 'private' | 'friends' | 'public';
  tags?: string[];
  parent_memory_id?: string;
  source: string;
  model_version?: string;
  summary?: string;
  extracted_places?: ExtractedPlace[];
  extracted_times?: ExtractedTime[];
  extracted_people?: string[];
}

export interface ExtractedPlace {
  name: string;
  hint: string;
  lat?: number;
  lng?: number;
  confidence?: number;
  place_type?: string;
}

export interface ExtractedTime {
  start: string;
  end?: string;
}

export interface MemoryLink {
  id: string;
  from_id: string;
  to_id: string;
  relation: 'original' | 'recall' | 'retell' | 'inspired_by';
  created_at: string;
}

export interface Play {
  id: string;
  user_id: string;
  memory_id: string;
  heard_at: string;
  lat?: number;
  lng?: number;
  device_info?: Record<string, any>;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  confidence?: number;
  place_type?: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface AudioQueueItem {
  memory: Memory;
  priority: number;
  distance: number;
  queuedAt: number;
}

export interface GeofenceConfig {
  sampleInterval: number; // ms
  maxDistance: number; // meters
  cooldownMs: number; // ms
  defaultRadius: number; // meters
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  style: string;
}

// UC Berkeley campus coordinates
export const BERKELEY_CAMPUS_CENTER: [number, number] = [-122.2585, 37.8719];
export const BERKELEY_CAMPUS_ZOOM = 16;

// Default geofence configuration
export const DEFAULT_GEOFENCE_CONFIG: GeofenceConfig = {
  sampleInterval: 1000, // 1 second (faster detection)
  maxDistance: 100, // 100 meters
  cooldownMs: 15000, // 15 seconds (reduced from 90s for faster replay)
  defaultRadius: 30, // 30 meters
};

// Priority weights for audio queue
export const PRIORITY_WEIGHTS = {
  OWNER: 3,
  FRIEND: 2,
  PUBLIC: 1,
  DISTANCE: 0.1, // per meter
  FRESHNESS: 0.01, // per hour
} as const;
