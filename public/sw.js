// Service worker de Housekeeping Infinit.
// - Fichiers de l'appli (_next/static) : gardés en cache, ils ne changent jamais.
// - Pages : réseau d'abord (toujours la dernière version), cache si pas de réseau.
// - Données Firebase et version.json : jamais mises en cache ici.
const VERSION = new URL(self.location).searchParams.get("v") || "0";
const CACHE = "planiroom-" + VERSION;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith("planiroom-") && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) return;

  if (url.pathname.includes("/_next/static/") || /\.(png|svg|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        if (res.ok) { const copie = res.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copie = res.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match(new URL("./", self.registration.scope).href)))
  );
});

// Notification envoyée par le service de notifications (appli fermée).
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { titre: "Housekeeping Infinit", corps: e.data ? e.data.text() : "" }; }
  const base = new URL("./", self.registration.scope).pathname.replace(/\/$/, "");
  e.waitUntil(
    self.registration.showNotification(d.titre || "Nouveau message", {
      body: d.corps || "",
      icon: base + "/icon-192.png",
      badge: base + "/icon-192.png",
      tag: d.tag || "message",
      data: { url: d.url || base + "/messages/" },
    })
  );
});

// Toucher la notification : ouvre (ou ramène) l'appli sur la bonne conversation.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const cible = new URL((e.notification.data && e.notification.data.url) || "./", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if (f.url.startsWith(self.registration.scope) && "focus" in f) {
          return f.focus().then(() => ("navigate" in f ? f.navigate(cible) : undefined));
        }
      }
      return self.clients.openWindow(cible);
    })
  );
});
