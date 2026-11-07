/* Cho app chạy khi không có mạng.
   Mở app: lấy ngay bản đã lưu trong máy, đồng thời tải bản mới (nếu có mạng) cho lần mở sau.
   Khi sửa app hoặc thêm vibe: thêm file mới vào FILES và tăng số VERSION để máy xoá bộ nhớ cũ. */
const VERSION = 'sochitieu-v5';
const FILES = [
  './', 'index.html', 'app.js', 'vibes.js', 'manifest.webmanifest', 'icon-180.jpg', 'icon-512.jpg',
  'img/app.jpg', 'img/avatar.jpg', 'img/bag.jpg', 'img/brief.jpg', 'img/card.jpg', 'img/cash.jpg', 'img/coins.jpg', 'img/piggy.jpg', 'img/stack.jpg', 'img/wallet.jpg',
  'img/noel/candle.jpg', 'img/noel/gifts.jpg', 'img/noel/mug.jpg', 'img/noel/pudding.jpg', 'img/noel/santa.jpg', 'img/noel/stocking.jpg', 'img/noel/tree.jpg', 'img/noel/wreath.jpg',
  'fonts/fonts.css',
  'fonts/Baloo2-600-latin-ext.woff2', 'fonts/Baloo2-600-latin.woff2', 'fonts/Baloo2-600-vietnamese.woff2',
  'fonts/BeVietnamPro-400-latin-ext.woff2', 'fonts/BeVietnamPro-400-latin.woff2', 'fonts/BeVietnamPro-400-vietnamese.woff2',
  'fonts/BeVietnamPro-500-latin-ext.woff2', 'fonts/BeVietnamPro-500-latin.woff2', 'fonts/BeVietnamPro-500-vietnamese.woff2',
  'fonts/BeVietnamPro-600-latin-ext.woff2', 'fonts/BeVietnamPro-600-latin.woff2', 'fonts/BeVietnamPro-600-vietnamese.woff2',
  'fonts/BeVietnamPro-700-latin-ext.woff2', 'fonts/BeVietnamPro-700-latin.woff2', 'fonts/BeVietnamPro-700-vietnamese.woff2',
  'fonts/Pangolin-400-latin-ext.woff2', 'fonts/Pangolin-400-latin.woff2', 'fonts/Pangolin-400-vietnamese.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  }));
});
