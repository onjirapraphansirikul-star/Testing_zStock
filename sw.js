const CACHE_NAME = 'stock-counter-v1';

// ⚠️ สำคัญ: รายชื่อไฟล์ตรงนี้ต้องมีอยู่จริงในโปรเจกต์ของคุณทั้งหมด
// ถ้ามีไฟล์ CSS หรือ JS อื่นๆ ในโปรเจกต์ ให้เพิ่มต่อท้ายในรายการนี้ด้วยครับ
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './offline-sync.js',
  './icon-192.png',
  './icon-512.png'
];

// ติดตั้งและโหลดไฟล์เก็บลงเครื่อง
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// ลบไฟล์เวอร์ชันเก่าทิ้งเมื่ออัปเดตเวอร์ชันใหม่
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ดึงไฟล์จากเครื่องมาแสดงก่อน (ใช้งานได้แม้ไม่มีเน็ต)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
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
