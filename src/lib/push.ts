export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

export async function subscribeUserToPush(token: string) {
  try {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'denied') {
      console.log('Push notifications permission denied.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Get public key from server
    const keyRes = await fetch('/api/push/public-key', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { publicKey } = await keyRes.json();
    
    if (!publicKey) return;

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      console.log('User is subscribed to push notifications');
    } catch (subError: any) {
      if (subError.message && subError.message.includes('permission denied')) {
        console.log('Push notifications permission denied.');
      } else {
        console.error('Failed to subscribe user:', subError);
      }
    }
  } catch (error) {
    console.error('Failed to prepare push subscription:', error);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function resetPushSubscription(token: string) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Successfully unsubscribed from old push notifications.');
    }
    // Now subscribe again
    await subscribeUserToPush(token);
    return true;
  } catch (err) {
    console.error('Failed to reset push subscription:', err);
    return false;
  }
}

export async function testPushNotification(token: string) {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send test notification:', err);
    return false;
  }
}
