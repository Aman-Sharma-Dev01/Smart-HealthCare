const CACHE_NAME = 'medicare-plus-v1';
const STATIC_CACHE = 'medicare-static-v1';
const DYNAMIC_CACHE = 'medicare-dynamic-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/circle.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.log('[SW] Cache failed:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    // Network first strategy
    fetch(request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return cached index.html for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Medicare+ Notification';
  
  // Notification type-based styling
  const notificationTypes = {
    'your-turn': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'your-turn',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        { action: 'open', title: 'View Queue' }
      ]
    },
    'appointment-completed': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'appointment-completed',
      requireInteraction: true,
      vibrate: [100, 50, 100],
      actions: [
        { action: 'feedback', title: 'Give Feedback' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    },
    'appointment-missed': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'appointment-missed',
      vibrate: [100, 50, 100],
      actions: [
        { action: 'reschedule', title: 'Reschedule' }
      ]
    },
    'appointment-cancelled': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'appointment-cancelled',
      vibrate: [100, 50, 100]
    },
    'queue-update': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'queue-update',
      vibrate: [50, 25, 50]
    },
    'default': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100]
    }
  };

  const typeConfig = notificationTypes[data.type] || notificationTypes['default'];
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: typeConfig.icon,
    badge: typeConfig.badge,
    vibrate: typeConfig.vibrate,
    tag: typeConfig.tag || 'medicare-notification',
    requireInteraction: typeConfig.requireInteraction || false,
    actions: typeConfig.actions || [],
    data: {
      url: data.url || '/',
      type: data.type,
      appointmentId: data.appointmentId
    },
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let url = data.url || '/';
  
  // Handle action clicks
  if (event.action === 'feedback') {
    url = '/pwa?action=feedback&appointmentId=' + (data.appointmentId || '');
  } else if (event.action === 'reschedule') {
    url = '/pwa?action=reschedule';
  } else if (event.action === 'open') {
    url = '/pwa';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes('/pwa') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
