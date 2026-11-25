const CACHE_NAME = 'pig-stock-cache-v2'; // เปลี่ยนเลขเวอร์ชันทุกครั้งที่มีการอัปเดตใหญ่
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];

// ติดตั้งและข้ามการรอคอยทันที
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// ลบ Cache เวอร์ชันเก่าทิ้งทั้งหมดเมื่อตัวใหม่ทำงาน
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// แบบ Network-First: มีเน็ตให้ดึงตัวใหม่ล่าสุดและอัปเดต Cache / ไม่มีเน็ตค่อยใช้ Cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // ไม่ต้องแคชคำขอที่ยิงไป Google Apps Script
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
