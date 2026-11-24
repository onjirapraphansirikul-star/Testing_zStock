const CACHE_NAME = 'pig-stock-pwa-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];
const OPTIONAL_ASSETS = [
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      // แคชไอคอนแบบไม่ให้พังแม้ยังไม่ได้อัปโหลดรูปไอคอน
      await Promise.allSettled(OPTIONAL_ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // คำขอไปยัง Google Apps Script (ส่งข้อมูล / เช็กสถานะ) ให้วิ่งตรงผ่านเน็ต ไม่ต้องแคช
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (event.request.url.startsWith('http') && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
