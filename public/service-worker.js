const CACHE_NAME = 'bulk-volume-calculator-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/styles.css',
  '/sample_data.csv'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache opened');
      return cache.addAll(urlsToCache).catch(error => {
        console.log('Cache addAll error:', error);
        // Partial cache is ok - some files might not exist
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for CSS/JS, cache first for others
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isCSSOrJS = url.pathname.endsWith('.css') || url.pathname.endsWith('.js');

  // Network-first strategy for CSS and JS files to ensure updates are fetched
  if (isCSSOrJS) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          console.log('Serving CSS/JS from network:', event.request.url);
          return response;
        })
        .catch(error => {
          console.log('Network fetch failed, serving from cache:', event.request.url);
          return caches.match(event.request).then(response => {
            return response || new Response('Offline - Resource unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
        })
    );
  } else {
    // Cache-first strategy for other resources
    event.respondWith(
      caches.match(event.request).then(response => {
        // Return cached response if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the new response
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(error => {
          console.log('Fetch failed:', error);
          // Optionally return a fallback page here
          return new Response('Offline - Application cache unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
    );
  }
});
