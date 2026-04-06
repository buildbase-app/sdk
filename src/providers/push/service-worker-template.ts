/**
 * Push notification service worker source code.
 * Export this string and write it to a file in your app's `public/` directory.
 *
 * @example
 * ```ts
 * // scripts/generate-sw.ts
 * import { PUSH_SERVICE_WORKER_SCRIPT } from '@buildbase/sdk';
 * import fs from 'fs';
 * fs.writeFileSync('public/push-sw.js', PUSH_SERVICE_WORKER_SCRIPT);
 * ```
 *
 * Or manually create `public/push-sw.js` with this content.
 */
export const PUSH_SERVICE_WORKER_SCRIPT = `
// BuildBase Push Notification Service Worker
// Place this file in your app's public directory (e.g. public/push-sw.js)

self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    var payload = event.data.json();
    var title = payload.title || 'Notification';
    var options = {
      body: payload.body || '',
      icon: payload.icon || undefined,
      badge: payload.icon || undefined,
      data: { url: payload.url, ...(payload.data || {}) },
      tag: 'buildbase-push-' + Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error('[PushSW] Failed to show notification:', e);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var url = event.notification.data && event.notification.data.url;
  if (url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});
`;
