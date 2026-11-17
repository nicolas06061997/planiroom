// Service worker de Housekeeping Infinit : l'appli fonctionne même sans internet.
//
// - À l'installation, TOUTE l'appli est téléchargée sur le téléphone (liste precache.json,
//   faite à chaque publication) : tous les écrans s'ouvrent ensuite hors connexion.
// - Fichiers de l'appli (_next/static, icônes, polices) : pris sur le téléphone (ils ne changent jamais).
// - Pages : réseau d'abord mais 2,5 s maximum, sinon la version du téléphone
//   (ouverture rapide même avec un wifi faible).
// - Données (Firebase), version.json : jamais gardés ici (l'appli gère ses données elle-même).
const VERSION = new URL(self.location).searchParams.get("v") || "0";
const CACHE = "planiroom-" + VERSION;
const scope = () => new URL("./", self.registration.scope).href;

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const liste = await (await fetch(scope() + "precache.json", { cache: "no-store" })).json();
        // Par petits paquets : un fichier en échec n'empêche pas les autres.
        for (let i = 0; i < liste.length; i += 8) {
          await Promise.all(
            liste.slice(i, i + 8).map((u) =>
              fetch(new URL(u, scope()).href, { cache: "no-store" })
                .then((r) => (r.ok ? cache.put(new URL(u, scope()).href, r) : null))
                .catch(() => null)
            )
          );
        }
      } catch (err) {
        /* pas de liste (développement) : on gardera les pages au fil des visites */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith("planiroom-") && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

const garder = (req, res) => {
  if (res && res.ok && res.type === "basic") {
    const copie = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copie));
  }
  return res;
};

// Cherche dans le téléphone en ignorant « ?id=… », « ?date=… » (même page, autre paramètre).
// `accueilSiAbsent` : sans aucun réseau, une page jamais gardée ouvre l'accueil (jamais en cas de simple lenteur).
const depuisTelephone = (req, accueilSiAbsent = false) =>
  caches
    .match(req, { ignoreSearch: true })
    .then((r) => r || (accueilSiAbsent && req.mode === "navigate" ? caches.match(scope(), { ignoreSearch: true }) : undefined));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/precache.json")) return;

  // Fichiers qui ne changent jamais : téléphone d'abord.
  if (url.pathname.includes("/_next/static/") || /\.(png|svg|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(depuisTelephone(req).then((r) => r || fetch(req).then((res) => garder(req, res))));
    return;
  }

  // Pages et données de navigation : réseau rapide, sinon téléphone.
  e.respondWith(
    new Promise((resolve) => {
      let fini = false;
      const secours = (accueilSiAbsent) =>
        depuisTelephone(req, accueilSiAbsent).then((r) => {
          if (r && !fini) {
            fini = true;
            resolve(r);
          }
          return r;
        });
      // Réseau lent : la même page gardée sur le téléphone, si elle y est (sinon on attend le réseau).
      const minuteur = setTimeout(() => secours(false), 2500);
      fetch(req)
        .then((res) => {
          clearTimeout(minuteur);
          garder(req, res.clone());
          if (!fini) {
            fini = true;
            resolve(res);
          }
        })
        .catch(() => {
          clearTimeout(minuteur);
          secours(true).then((r) => {
            if (!r && !fini) {
              fini = true;
              resolve(new Response("Hors connexion", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
            }
          });
        });
    })
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
