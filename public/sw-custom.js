// sw-custom.js
// Import Firebase Messaging service worker
importScripts('/firebase-messaging-sw.js');

// Import the generated/minified sw.js to keep original precache behavior,
// then add a fetch handler that returns a fallback image when network/cache
// can't provide the requested image. This prevents Workbox "no-response" errors
// for missing screenshots or icons.

// Versión del caché para control de actualizaciones
const CACHE_VERSION = 'v2';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-cache-${CACHE_VERSION}`;

// Recursos críticos que deben estar disponibles offline
const APP_SHELL_RESOURCES = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.css',
  '/src/index.css',
  '/manifest.json',
  '/logo/logo.png',
  '/logo/logo192.png',
  '/logo/logo512.png'
];

try {
  importScripts('/sw.js');
} catch (e) {
  // If import fails, log but continue to register our fetch handler
  console.error('Could not import /sw.js:', e);
}

// Ensure the custom SW can take control immediately when updated/installed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    console.log('Service Worker: Skip waiting y activando inmediatamente');
  }
});

self.addEventListener('install', (event) => {
  // Activate worker immediately.
  console.log('Service Worker: Instalando versión', CACHE_VERSION);
  
  // Pre-cache critical app shell resources
  event.waitUntil((async () => {
    try {
      await self.skipWaiting();
      const cache = await caches.open(APP_SHELL_CACHE);
      // Cache the main HTML files and critical assets
      const cachePromises = APP_SHELL_RESOURCES.map(url => {
        return fetch(url)
          .then(response => {
            if (!response || !response.ok) {
              throw new Error(`Error al cachear ${url}: ${response.status} ${response.statusText}`);
            }
            return cache.put(url, response);
          })
          .catch(err => {
            console.warn(`No se pudo cachear ${url}:`, err);
            // Intentar cachear directamente sin validar respuesta
            return cache.add(url).catch(addErr => {
              console.error(`Fallo al cachear ${url}:`, addErr);
            });
          });
      });
      
      await Promise.all(cachePromises);
      console.log('App shell cacheado exitosamente');
    } catch (err) {
      console.warn('sw-custom install: could not pre-cache app shell resources', err);
    }
  })());
});

self.addEventListener('activate', (event) => {
  // Claim clients so that the SW starts controlling the pages without reload
  console.log('Service Worker: Activando versión', CACHE_VERSION);
  
  event.waitUntil((async () => {
    await self.clients.claim();

    // Try to cache the app shell (index.html) so navigations work offline.
    // This runs at activate time; it will succeed only if online during activation.
    try {
      const cache = await caches.open(APP_SHELL_CACHE);
      const resp = await fetch('/index.html');
      if (resp && resp.ok) {
        await cache.put('/index.html', resp.clone());
      }
    } catch (err) {
      // ignore failures (likely offline at activate time)
      console.warn('sw-custom: could not prefetch index.html on activate', err);
    }
    
    // Cleanup old caches that are not current version or workbox generated
    try {
      const keep = [APP_SHELL_CACHE, ASSETS_CACHE];
      const keys = await caches.keys();
      await Promise.all(keys.map(async (k) => {
        if (keep.includes(k) || k.startsWith('workbox')) return;
        console.log('Eliminando caché antigua:', k);
        try { await caches.delete(k); } catch (e) { /* ignore */ }
      }));
    } catch (cleanupErr) {
      console.warn('sw-custom: error cleaning caches', cleanupErr);
    }
  })());
});

// Función para cachear recursos dinámicos (CSS, JS, etc.)
async function cacheAssets() {
  try {
    const cache = await caches.open(ASSETS_CACHE);
    
    // Obtener todos los recursos CSS y JS de la página actual
    const mainPage = await fetch('/');
    const html = await mainPage.text();
    
    // Extraer URLs de CSS y JS
    const cssUrls = html.match(/href="(\/assets\/.*?\.css)"/g) || [];
    const jsUrls = html.match(/src="(\/assets\/.*?\.js)"/g) || [];
    
    // Limpiar y formatear URLs
    const cssLinks = cssUrls.map(url => url.replace('href="', '').replace('"', ''));
    const jsLinks = jsUrls.map(url => url.replace('src="', '').replace('"', ''));
    
    // Añadir recursos importantes que siempre deben estar en caché
    const criticalResources = [
      '/',
      '/index.html',
      '/src/main.tsx',
      '/manifest.json',
      '/logo/icon-192.png',
      '/logo/icon-512.png',
      '/logo/icon-144.png',
      '/@vite/client',
      '/@react-refresh',
      '/node_modules/vite/dist/client/env.mjs'
    ];
    
    // Combinar todos los recursos
    const allAssets = [...cssLinks, ...jsLinks, ...criticalResources];
    
    console.log('Cacheando recursos dinámicos:', allAssets);
    
    // Cachear cada recurso
    for (const url of allAssets) {
      try {
        const response = await fetch(url);
        if (response && response.ok) {
          await cache.put(url, response);
          console.log('Recurso cacheado:', url);
        }
      } catch (err) {
        console.warn('Error al cachear recurso:', url, err);
      }
    }
  } catch (err) {
    console.error('Error al cachear assets:', err);
  }
}

// Llamar a la función de cacheo durante la instalación
self.addEventListener('install', (event) => {
  event.waitUntil(cacheAssets());
});

self.addEventListener('fetch', function(event) {
  try {
    const req = event.request;
    if (!req || req.method !== 'GET') return;
    
    // Manejar recursos críticos (iconos, manifest, etc.)
    if (req.url.includes('/logo/') || req.url.includes('/manifest.json')) {
      event.respondWith((async () => {
        // Estrategia: Cache primero, luego red
        try {
          const cacheResponse = await caches.match(req);
          if (cacheResponse) {
            console.log('Sirviendo recurso crítico desde caché:', req.url);
            return cacheResponse;
          }
        } catch (err) {
          console.warn('Error al buscar recurso crítico en caché:', err);
        }
        
        // Si no está en caché, intentar red
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.ok) {
            // Guardar en caché para uso futuro
            const cache = await caches.open(ASSETS_CACHE);
            cache.put(req, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          console.warn('Error de red para recurso crítico:', err);
        }
        
        // Si es un icono y no se puede cargar, devolver un icono genérico
        if (req.url.includes('/logo/')) {
          // Devolver un icono de fallback desde el caché si existe
          try {
            const fallbackIcon = await caches.match('/logo/icon-144.png');
            if (fallbackIcon) return fallbackIcon;
          } catch (e) {
            console.warn('No se pudo cargar icono de fallback');
          }
        }
        
        // Fallback para manifest.json
        if (req.url.includes('/manifest.json')) {
          return new Response(JSON.stringify({
            name: "PWA JBCS",
            short_name: "PWA JBCS",
            start_url: "/",
            display: "standalone",
            background_color: "#0b1220",
            theme_color: "#0b1220",
            icons: []
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Fallback genérico
        return new Response('Not found', { status: 404 });
      })());
      return;
    }
    
    // Interceptar solicitudes de assets (CSS, JS)
    if (req.url.includes('/assets/') || req.url.endsWith('.css') || req.url.endsWith('.js') || req.url.includes('/@vite/') || req.url.includes('/@react-refresh')) {
      event.respondWith((async () => {
        // Estrategia: Cache primero, luego red
        try {
          const cacheResponse = await caches.match(req);
          if (cacheResponse) {
            console.log('Sirviendo desde caché:', req.url);
            return cacheResponse;
          }
        } catch (err) {
          console.warn('Error al buscar en caché:', err);
        }
        
        // Si no está en caché, intentar red
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.ok) {
            // Guardar en caché para uso futuro
            const cache = await caches.open(ASSETS_CACHE);
            cache.put(req, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          console.warn('Error de red para asset:', err);
        }
        
        // Si todo falla, devolver una respuesta vacía para CSS
        if (req.url.endsWith('.css')) {
          return new Response('/* CSS fallback */', {
            headers: { 'Content-Type': 'text/css' }
          });
        }
        
        // Fallback para JS
        return new Response('console.log("JS fallback");', {
          headers: { 'Content-Type': 'application/javascript' }
        });
      })());
      return;
    }

    // Ignorar solicitudes de WebSocket
    if (req.url.includes('/ws') || req.url.includes('/__vite_ping') || req.url.includes('hmr')) {
      return; // No interceptar WebSockets
    }
    
    // Responder a todas las solicitudes de navegación con una estrategia de caché
    if (req.mode === 'navigate') {
      event.respondWith((async () => {
        console.log('Interceptando solicitud de navegación:', req.url);
        
        try {
          // Intentar red primero
          console.log('Intentando obtener desde la red...');
          const networkResponse = await fetch(req.clone());
          if (networkResponse && networkResponse.ok) {
            console.log('Respuesta de red exitosa');
            
            // Guardar en caché para uso futuro offline
            try {
              const cache = await caches.open(APP_SHELL_CACHE);
              cache.put(req, networkResponse.clone());
              console.log('Página guardada en caché para uso offline');
            } catch (cacheErr) {
              console.warn('Error al guardar en caché:', cacheErr);
            }
            
            return networkResponse;
          }
        } catch (err) {
          console.log('Error de red, intentando caché:', err);
        }
        
        // Si la red falla, intentar caché
        try {
          console.log('Buscando en caché...');
          
          // Buscar coincidencia exacta
          const cacheMatch = await caches.match(req);
          if (cacheMatch) {
            console.log('Encontrada coincidencia exacta en caché');
            return cacheMatch;
          }
          
          // Buscar index.html en cualquier caché
          const indexMatch = await caches.match('/index.html');
          if (indexMatch) {
            console.log('Sirviendo index.html desde caché');
            return indexMatch;
          }
          
          // Buscar en todas las cachés
          const cacheKeys = await caches.keys();
          for (const key of cacheKeys) {
            const cache = await caches.open(key);
            const match = await cache.match('/index.html');
            if (match) {
              console.log('Encontrado index.html en caché:', key);
              return match;
            }
          }
        } catch (cacheErr) {
          console.warn('Error al buscar en caché:', cacheErr);
        }
        
        // Respuesta offline de emergencia
        console.log('Generando página offline de emergencia');
        return new Response(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>AutomatizaPro - Offline</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0b1220; color: white; 
                     display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .offline-message { text-align: center; padding: 2rem; max-width: 500px; }
              h1 { font-size: 1.5rem; margin-bottom: 1rem; }
              p { margin-bottom: 1.5rem; opacity: 0.8; }
              .status { display: inline-block; background: #374151; color: white; 
                        padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="offline-message">
              <h1>AutomatizaPro - Sin conexión</h1>
              <p>No se puede acceder a la aplicación en este momento porque no hay conexión a internet.</p>
              <div class="status">Offline</div>
            </div>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      })());
      return;
    }

    // Manejar solicitudes de imágenes
    const isImage = req.destination === 'image' || /\.(png|jpg|jpeg|svg|webp|gif)$/.test(req.url);
    if (isImage) {
      event.respondWith((async () => {
        // Intentar red primero
        try {
          const netResp = await fetch(req.clone());
          if (netResp && netResp.ok) return netResp;
        } catch (err) {
          // Error de red, continuar con caché
        }

        // Intentar caché
        const cachedResponse = await caches.match(req);
        if (cachedResponse) return cachedResponse;

        // Imagen de respaldo
        try {
          const logoMatch = await caches.match('/logo/logo.png');
          if (logoMatch) return logoMatch;
        } catch (e) {
          // Ignorar errores
        }

        // Imagen transparente como último recurso
        const emptyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const binary = atob(emptyBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Response(bytes, { headers: { 'Content-Type': 'image/png' }, status: 200 });
      })());
      return;
    }

    // Para otros recursos (JS, CSS, etc.)
    event.respondWith((async () => {
      // Intentar caché primero para rendimiento
      const cachedResponse = await caches.match(req);
      if (cachedResponse) {
        console.log('Recurso encontrado en caché:', req.url);
        return cachedResponse;
      }
      
      // Comprobar si es un recurso con hash (assets/index-[hash].js o assets/index-[hash].css)
      const isAssetWithHash = req.url.includes('/assets/') && 
                             (req.url.includes('.js') || req.url.includes('.css'));
      
      // Si no está en caché, intentar red
      try {
        console.log('Intentando obtener recurso desde la red:', req.url);
        const networkResponse = await fetch(req.clone());
        if (networkResponse && networkResponse.ok) {
          console.log('Recurso obtenido de la red correctamente:', req.url);
          
          // Guardar en caché para uso futuro
          const cache = await caches.open(ASSETS_CACHE);
          await cache.put(req, networkResponse.clone());
          
          // Si es un recurso con hash, también guardarlo con un nombre genérico para fallback
          if (isAssetWithHash) {
            const genericUrl = req.url.replace(/\/assets\/index-[^.]+\.(js|css)/, '/assets/index.$1');
            console.log('Guardando también como recurso genérico:', genericUrl);
            await cache.put(new Request(genericUrl), networkResponse.clone());
          }
          
          return networkResponse;
        }
      } catch (err) {
        console.log('Error al obtener recurso:', req.url, err);
        
        // Para recursos con hash, intentar buscar versiones genéricas en caché
        if (isAssetWithHash) {
          try {
            const fileExt = req.url.endsWith('.js') ? '.js' : '.css';
            const genericPattern = `/assets/index${fileExt}`;
            
            console.log('Buscando versión genérica en caché:', genericPattern);
            
            // Buscar en todas las cachés
            const cacheKeys = await caches.keys();
            for (const key of cacheKeys) {
              const cache = await caches.open(key);
              const matches = await cache.keys();
              
              // Buscar cualquier archivo que coincida con el patrón
              for (const match of matches) {
                if (match.url.includes(genericPattern) || 
                    (fileExt === '.js' && match.url.includes('.js')) || 
                    (fileExt === '.css' && match.url.includes('.css'))) {
                  const response = await cache.match(match);
                  if (response) {
                    console.log('Encontrado recurso alternativo en caché:', match.url);
                    return response;
                  }
                }
              }
            }
          } catch (fallbackErr) {
            console.warn('Error al buscar recurso alternativo:', fallbackErr);
          }
        }
      }
      
      // Si es un recurso JavaScript o CSS y todo falla, proporcionar un recurso vacío
      // para evitar errores en la consola
      if (req.url.endsWith('.js')) {
        console.log('Proporcionando JavaScript vacío para:', req.url);
        return new Response('// Archivo JavaScript no disponible offline', 
                           { headers: { 'Content-Type': 'application/javascript' }, status: 200 });
      } else if (req.url.endsWith('.css')) {
        console.log('Proporcionando CSS vacío para:', req.url);
        return new Response('/* Archivo CSS no disponible offline */', 
                           { headers: { 'Content-Type': 'text/css' }, status: 200 });
      }
      
      // Para otros recursos, devolver error 404
      return new Response('Recurso no disponible offline', { status: 404 });
    })());
  } catch (e) {
    console.error('Error en el manejador fetch del Service Worker:', e);
  }
});

// --- Background Sync ---

// ===== Background Sync: enviar entradas guardadas en IndexedDB =====
const DB_NAME_SYNC = 'pwa-jbcs-db';
const STORE_NAME_SYNC = 'entries';
const DB_VERSION_SYNC = 1;

function openDBSync() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME_SYNC, DB_VERSION_SYNC);
    // NOTE: onupgradeneeded is not needed here as the main app should create the store
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllEntriesSync() {
  return openDBSync().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME_SYNC, 'readonly');
      const store = tx.objectStore(STORE_NAME_SYNC);
      const req = store.getAll();
      req.onsuccess = () => {
        console.log('SW[idb] getAllEntriesSync count=', (req.result || []).length);
        resolve(req.result);
      };
      req.onerror = () => {
        console.error('SW[idb] getAllEntriesSync error', req.error);
        reject(req.error);
      };
    });
  });
}

function deleteEntrySync(id) {
  return openDBSync().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME_SYNC, 'readwrite');
      const store = tx.objectStore(STORE_NAME_SYNC);
      const req = store.delete(id);
      req.onsuccess = () => {
        console.log('SW[idb] deleteEntrySync success id=', id);
        resolve();
      };
      req.onerror = () => {
        console.error('SW[idb] deleteEntrySync error id=', id, req.error);
        reject(req.error);
      };
    });
  });
}

async function syncEntries() {
  console.log('Service Worker: Sincronizando entradas...');
  try {
    const entries = await getAllEntriesSync();
    if (!entries || entries.length === 0) {
      console.log('Service Worker: No hay entradas para sincronizar.');
      return;
    }

    const endpoint = '/api/entries';
    const syncPromises = entries.map(entry => {
      console.log('Service Worker: intentando enviar entrada id=', entry.id, 'title=', entry.title);
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: entry.title, notes: entry.notes, created: entry.created }),
      })
      .then(response => {
        console.log('Service Worker: respuesta fetch para id=', entry.id, 'status=', response.status);
        if (response.ok) {
          console.log('Service Worker: Entrada sincronizada, eliminando de IndexedDB', entry.id);
          if (entry.id !== undefined) {
            return deleteEntrySync(entry.id).then(()=>{
              console.log('Service Worker: eliminado local entry id=', entry.id);
            });
          }
          return Promise.resolve();
        } else {
          console.error('Service Worker: Error del servidor para entry id=', entry.id, response.statusText);
          return Promise.reject(new Error(response.statusText));
        }
      })
      .catch(err => {
        console.error('Service Worker: fetch error network para id=', entry.id, err);
        return Promise.reject(err);
      });
    });

    await Promise.all(syncPromises);
    console.log('Service Worker: Sincronización completada.');
  } catch (error) {
    console.error('Service Worker: Error durante la sincronización de entradas.', error);
    throw error; // Lanza el error para que el navegador reintente la sincronización
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entries') {
    console.log('Service Worker: Recibido tag "sync-entries".');
    event.waitUntil(syncEntries());
  }
});


// --- Push Notifications ---

// The 'push' event is handled by firebase-messaging-sw.js when the app is in the background.
// However, we can add a listener here as a fallback or for foreground messages.
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  const title = 'Push Notification';
  const options = {
    body: event.data.text(),
    icon: 'logo/logo.png',
    badge: 'logo/logo.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  event.waitUntil(
    clients.openWindow('https://pwa-jbc.firebaseapp.com')
  );
});
