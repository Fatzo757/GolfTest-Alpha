self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Golf Card Game', body: 'New notification!' };
  
  const titleLower = (data.title || '').toLowerCase();
  const tagLower = (data.tag || '').toLowerCase();
  
  const isTurn = titleLower.includes('turn') || tagLower.startsWith('your_turn');
  const isInvite = titleLower.includes('join') || titleLower.includes('start') || titleLower.includes('rematch') || tagLower.startsWith('game_invite');

  const actions = [];
  if (isTurn) {
    actions.push({ action: 'play', title: 'Play Turn' });
  } else if (isInvite) {
    actions.push({ action: 'play', title: 'Open Game' });
  } else {
    actions.push({ action: 'play', title: 'View Game' });
  }
  actions.push({ action: 'dismiss', title: 'Dismiss' });

  const options = {
    body: data.body,
    icon: data.icon || '/notification_icon.png',
    badge: '/notification_icon.png',
    data: {
      url: data.url || '/'
    },
    tag: data.tag || 'golf-notification',
    renotify: true,
    vibrate: [100, 50, 100],
    actions: actions
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

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
