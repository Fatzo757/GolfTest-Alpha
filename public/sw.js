self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Golf Card Game', body: 'New notification!' };
  
  const options = {
    body: data.body,
    icon: '/logo192.png', // Fallback if no icon
    badge: '/logo192.png',
    data: {
      url: data.url || '/'
    },
    tag: data.tag || 'golf-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE_TO_GAME', url: urlToOpen });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
