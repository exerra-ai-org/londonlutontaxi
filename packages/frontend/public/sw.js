const CACHE_NAME = "taxi-concierge-v2";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Pass through API calls — always network
  if (event.request.url.includes("/api/")) return;
  // Pass through non-GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Taxi Concierge", body: "You have an update.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Malformed payload — use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      tag: data.tag || "taxi-update",
      data: { url: data.url || "/" },
      vibrate: [150, 75, 150],
      requireInteraction: false,
    }),
  );
});

// ── Notification click → open / focus the app at the correct URL ──────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
  );
});
