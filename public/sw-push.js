/* Drinkedin push notification service worker.
 * Handles incoming push events and notification clicks.
 * Kept tiny on purpose: NO app-shell caching, NO offline behavior.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "Drinkedin", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Drinkedin";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon-192.png",
    badge: payload.badge || "/favicon-192.png",
    tag: payload.tag || "drinkedin-push",
    renotify: true,
    data: { url: payload.url || "/profile" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/profile";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if one is already on the right URL
      for (const client of clients) {
        try {
          const u = new URL(client.url);
          if (u.pathname === targetUrl && "focus" in client) return client.focus();
        } catch (_) {}
      }
      // Otherwise open a new one
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
