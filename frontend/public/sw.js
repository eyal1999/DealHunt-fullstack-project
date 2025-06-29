// Service Worker for DealHunt PWA
const CACHE_NAME = 'dealhunt-v1';
const STATIC_CACHE = 'dealhunt-static-v1';
const DYNAMIC_CACHE = 'dealhunt-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
  '/api/enhanced-wishlist/',
  '/api/user-activity/recently-viewed',
  '/api/price-tracking/alerts'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.log('[SW] Error caching static files:', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests and chrome-extension requests
  if (!url.origin === location.origin || url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    handleFetch(request)
  );
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Cache First for static files
    if (isStaticFile(url.pathname)) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: Network First for API calls
    if (isAPICall(url.pathname)) {
      return await networkFirst(request);
    }
    
    // Strategy 3: Stale While Revalidate for other resources
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.log('[SW] Fetch error:', error);
    
    // Return offline fallback if available
    if (request.destination === 'document') {
      return await getOfflineFallback();
    }
    
    throw error;
  }
}

// Cache First Strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, networkResponse.clone());
  
  return networkResponse;
}

// Network First Strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses
    if (networkResponse.ok && shouldCacheAPI(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Return cached version if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || await fetchPromise;
}

// Helper functions
function isStaticFile(pathname) {
  return pathname.includes('/static/') || 
         pathname.includes('/icons/') || 
         pathname === '/manifest.json' ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.ico');
}

function isAPICall(pathname) {
  return pathname.startsWith('/api/');
}

function shouldCacheAPI(url) {
  return CACHEABLE_APIS.some(api => url.includes(api));
}

async function getOfflineFallback() {
  const cache = await caches.open(STATIC_CACHE);
  return await cache.match('/') || new Response(
    `
    <html>
      <head>
        <title>DealHunt - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
          }
          .offline-icon { font-size: 80px; margin-bottom: 20px; }
          h1 { margin-bottom: 10px; }
          p { margin-bottom: 30px; opacity: 0.9; }
          button { 
            background: white; 
            color: #667eea; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          }
          button:hover { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="offline-icon">📱</div>
        <h1>You're Offline</h1>
        <p>DealHunt is available offline with limited functionality.<br>
        Check your connection and try again.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </body>
    </html>
    `,
    {
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'wishlist-sync') {
    event.waitUntil(syncWishlistChanges());
  }
  
  if (event.tag === 'price-alert-sync') {
    event.waitUntil(syncPriceAlerts());
  }
});

async function syncWishlistChanges() {
  try {
    // Get pending wishlist changes from IndexedDB
    const pendingChanges = await getPendingWishlistChanges();
    
    for (const change of pendingChanges) {
      try {
        await fetch(change.url, {
          method: change.method,
          headers: change.headers,
          body: change.body
        });
        
        // Remove from pending changes if successful
        await removePendingChange(change.id);
        
      } catch (error) {
        console.log('[SW] Failed to sync wishlist change:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Error in wishlist sync:', error);
  }
}

async function syncPriceAlerts() {
  try {
    // Sync price alert changes
    const pendingAlerts = await getPendingPriceAlerts();
    
    for (const alert of pendingAlerts) {
      try {
        await fetch('/api/price-tracking/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${alert.token}`
          },
          body: JSON.stringify(alert.data)
        });
        
        await removePendingAlert(alert.id);
        
      } catch (error) {
        console.log('[SW] Failed to sync price alert:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Error in price alert sync:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View Deal',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ],
    requireInteraction: data.urgent || false,
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    const url = event.notification.data.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Placeholder functions for IndexedDB operations
async function getPendingWishlistChanges() {
  // TODO: Implement IndexedDB operations
  return [];
}

async function removePendingChange(id) {
  // TODO: Implement IndexedDB operations
}

async function getPendingPriceAlerts() {
  // TODO: Implement IndexedDB operations
  return [];
}

async function removePendingAlert(id) {
  // TODO: Implement IndexedDB operations
}