const CACHE = 'playstudy-shell-v10';
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const scoped = (path = '/') => `${SCOPE_PATH}${path}`;
const APP_SHELL = [
  scoped('/'),
  scoped('/manifest.webmanifest'),
  scoped('/playstudy/styles.css'),
  scoped('/playstudy/app.js'),
  scoped('/playstudy/icons/icon-192.png'),
  scoped('/playstudy/icons/icon-512.png'),
  scoped('/playstudy/icons/icon-maskable-512.png'),
  scoped('/playstudy/icons/apple-touch-icon.png')
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(APP_SHELL.map(async (url) => {
      const response = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin' }));
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('playstudy_v2', 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['videos', 'shared', 'handles']) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSharedFiles(request) {
  const form = await request.formData();
  const files = form.getAll('videos').filter((file) => file instanceof File && file.type.startsWith('video/'));
  if (!files.length) return;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('shared', 'readwrite');
    const store = transaction.objectStore('shared');
    files.forEach((file, index) => store.put({ file, receivedAt: Date.now() }, `${Date.now()}-${index}-${file.name}`));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === scoped('/share-target')) {
    event.respondWith((async () => {
      try {
        await saveSharedFiles(event.request.clone());
        return Response.redirect(scoped('/'), 303);
      } catch {
        return new Response('共有動画の保存に失敗しました', { status: 500 });
      }
    })());
    return;
  }

  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(scoped('/'), response.clone());
        return response;
      } catch {
        const cached = await cache.match(scoped('/'));
        return cached || new Response(
          '<!doctype html><meta charset="utf-8"><title>PlayStudy</title><p>オフラインです。通信が戻ったら再読み込みしてください。</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  const isCoreAsset = APP_SHELL.includes(url.pathname);

  if (isCoreAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(new Request(event.request, { cache: 'no-cache' }));
        if (response.ok) await cache.put(url.pathname, response.clone());
        return response;
      } catch {
        return (await cache.match(url.pathname)) || new Response('', { status: 504 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(event.request)) || new Response('', { status: 504 });
    }
  })());
});
