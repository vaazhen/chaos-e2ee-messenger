self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Chaos Messenger', body: 'New encrypted message' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    try {
      data.body = event.data.text();
    } catch (e2) {}
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: data.tag || 'chaos-message',
    renotify: true,
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const chatId = event.notification.data?.chatId;
  const url = chatId ? `/?chatId=${chatId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'OPEN_CHAT', chatId });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
