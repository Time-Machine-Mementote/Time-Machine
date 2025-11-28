// Service Worker for Berkeley Memory Map
// Enables background audio playback support

const CACHE_NAME = 'berkeley-memory-map-v2'; // Updated version to force refresh

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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Force all clients to use the new service worker
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const requestUrl = event.request.url.toLowerCase();
  
  // Skip service worker for:
  // 1. Supabase API requests (auth, database, storage, etc.) - CRITICAL
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('supabase.io') ||
      requestUrl.includes('supabase') ||
      requestUrl.includes('/auth/v1/') ||
      requestUrl.includes('/rest/v1/') ||
      requestUrl.includes('/storage/v1/') ||
      requestUrl.includes('/functions/v1/')) {
    // DO NOT intercept - let browser handle directly
    return;
  }
  
  // 2. Audio files
  if (requestUrl.includes('.webm') || 
      requestUrl.includes('.mp3') || 
      requestUrl.includes('.ogg') ||
      requestUrl.includes('audio-memories')) {
    return; // Let browser handle audio requests normally
  }
  
  // 3. All non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return; // Let browser handle all non-GET requests normally
  }
  
  // 4. API requests
  if (requestUrl.includes('/api/')) {
    return; // Let browser handle API requests normally
  }
  
  // Only cache GET requests for static assets (HTML, CSS, JS, images)
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


