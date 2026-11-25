// صياد القرش — كاش بسيط عشان الأبلكيشن يفتح بسرعة (والبيانات نفسها مبتتخزنش هنا)
const CACHE = 'sayad-v27';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // طلبات البيانات (POST) بتروح للنت على طول
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (url.origin === location.origin && url.pathname.includes('/demo/')) return;   // نسخة العرض ملهاش دعوة بالكاش
  if (req.mode === 'navigate') {                           // الصفحة: من الموبايل على طول (سريع)، والنسخة الجديدة بتتجاب في الخلفية للفتحة الجاية
    const net = fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); } return r; });
    e.respondWith(caches.match('./index.html').then(hit => hit || net).catch(() => net));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (url.origin === location.origin || /cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.hostname))) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
    return r;
  })));
});

/* التنبيهات: أبل بتبعت تنبيه فاضي، وإحنا بنجيب نصه من الأبلكيشن */
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('sayad', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function idbGet(k) { return idb().then(db => new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); })); }
function idbSet(k, v) { return idb().then(db => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => res(); })); }
async function showPushes() {
  let notes = [];
  try {
    const cfg = await idbGet('cfg');
    if (cfg && cfg.api && cfg.key) {
      const r = await fetch(cfg.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: cfg.key, action: 'pushInbox', args: [cfg.last || 0] }) });
      const j = await r.json();
      if (j.ok && Array.isArray(j.data)) notes = j.data;
      const top = notes.reduce((m, n) => Math.max(m, n.id || 0), cfg.last || 0);
      if (top > (cfg.last || 0)) await idbSet('cfg', Object.assign({}, cfg, { last: top }));
    }
  } catch (e) {}
  if (!notes.length) notes = [{ title: 'صياد القرش', body: 'فيه حاجة جديدة، افتح الأبلكيشن' }];
  // الآيفون بيكتب «from صياد القرش» لوحده، فالعنوان ميبقاش اسم الأبلكيشن تاني
  notes = notes.map(n => /^\s*صياد القرش/.test(n.title || '') || !n.title ? { ...n, title: n.body || 'فيه حاجة جديدة', body: '' } : n);
  await Promise.all(notes.map(n => self.registration.showNotification(n.title, {
    body: n.body || '', tag: n.tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'ar', dir: 'rtl', data: { url: './' } })));
}
self.addEventListener('push', e => e.waitUntil(showPushes()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ('focus' in w) return w.focus();
    return clients.openWindow('./');
  }));
});
