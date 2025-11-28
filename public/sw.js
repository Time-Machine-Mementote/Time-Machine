// Service Worker for Berkeley Memory Map
// Enables background audio playback support

const CACHE_NAME = 'berkeley-memory-map-v1';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip service worker for:
  // 1. Supabase API requests (auth, database, storage, etc.)
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('supabase.io')) {
    return; // Let browser handle Supabase requests normally
  }
  
  // 2. Audio files
  if (event.request.url.includes('.webm') || 
      event.request.url.includes('.mp3') || 
      event.request.url.includes('.ogg') ||
      event.request.url.includes('audio-memories')) {
    return; // Let browser handle audio requests normally
  }
  
  // 3. API requests (non-Supabase)
  if (event.request.url.includes('/api/') ||
      event.request.method !== 'GET') {
    return; // Let browser handle API requests normally
  }
  
  // Only cache GET requests for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Background sync for audio playback (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-audio') {
      // Keep audio playing in background
      event.waitUntil(Promise.resolve());
    }
  });
}


