/* ============================================================================
   SPRINT — Service worker i ekranit të stafit.

   Bën një punë të vetme: pret njoftimin, e shfaq, dhe kur preket e hap faqen.
   Nuk ruan asgjë dhe nuk ndërhyn te kërkesat — një ekran pune duhet të tregojë
   gjithmonë gjendjen e vërtetë, kurrë një kopje të vjetër nga kujtesa.
   ========================================================================== */
/* global self, clients */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }

  const title = d.title || 'SPRINT';
  const opt = {
    body: d.body || '',
    tag: d.tag || 'sprint',          // njoftimi i ri zë vendin e të vjetrit
    renotify: true,
    requireInteraction: d.hold !== false,   // rri derisa të preket
    vibrate: [220, 90, 220, 90, 220],
    data: { url: d.url || '/staf/' },
    badge: d.badge || undefined,
    icon: d.icon || undefined,
  };
  e.waitUntil(self.registration.showNotification(title, opt));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/staf/';
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      // Nëse ekrani është tashmë hapur, sillet përpara — pa hapur skedë të dytë.
      if (c.url.indexOf('/staf') >= 0 && 'focus' in c) {
        try { c.postMessage({ sprint: 'refresh' }); } catch (err) {}
        return c.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
