// Service worker minimal : rend l'appli installable.
// Pas de mise en cache pendant la bêta, pour toujours avoir la dernière version.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
