// صياد القرش — كاش بسيط عشان الأبلكيشن يفتح بسرعة (والبيانات نفسها مبتتخزنش هنا)
const CACHE = 'sayad-v10';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // طلبات البيانات (POST) بتروح للنت على طول
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (url.origin === location.origin && url.pathname.includes('/demo/')) return;   // نسخة العرض ملهاش دعوة بالكاش
  if (req.mode === 'navigate') {                           // الصفحة: من الموبايل على طول (سريع)، والنسخة الجديدة بتتجاب في الخلفية للفتحة الجاية
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); } return r; });
    e.respondWith(caches.match('./index.html').then(hit => hit || net).catch(() => net));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (url.origin === location.origin || /cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.hostname))) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
    return r;
  })));
});
