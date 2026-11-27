self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'RailOne';
  const body =
    payload.body ||
    'Unreserved Ticket is booked. Please check My Bookings to get ticket details. This message does not provide authorisation to travel.IR-CRIS';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-badge-96x96.png',
      tag: payload.tag || 'railone-ticket-push',
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        url: (payload.data && payload.data.url) || '/',
        refId: payload.data && payload.data.refId,
      },
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SHOW_TICKET_NOTIFICATION') return;

  const title = data.title || 'RailOne';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-badge-96x96.png',
    tag: data.tag || 'railone-ticket-msg',
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    data: {
      url: '/',
      refId: data.refId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'RAILONE_OPEN_BOOKINGS',
            refId: event.notification.data && event.notification.data.refId,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
