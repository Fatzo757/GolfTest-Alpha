import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

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
    if (Capacitor.isNativePlatform()) {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        console.log('Native push permission denied');
        return;
      }
      
      await PushNotifications.removeAllListeners();

      await PushNotifications.createChannel({
        id: 'fcm_default_channel',
        name: 'Default',
        description: 'Default notification channel',
        importance: 4, // HIGH importance for heads-up
        visibility: 1,
        sound: 'beep.wav',
      });

      PushNotifications.addListener('registration', async (tokenObj) => {
        try {
          await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/push/subscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription: { platform: 'android', token: tokenObj.value } })
          });
          console.log('Successfully registered native push token');
        } catch (e) {
          console.error('Failed to send native push token to backend', e);
        }
      });
      
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on native registration:', error);
      });
      
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
      });
      
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push notification action performed', action);
        const data = action.notification.data;
        if (data && data.url) {
          window.location.href = data.url;
        }
      });
      
      await PushNotifications.register();
      return;
    }

    // --- Web Push Fallback ---
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') {
      console.log('Push notifications permission denied.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    
    const keyRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/push/public-key`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { publicKey } = await keyRes.json();
    if (!publicKey) return;

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription: { platform: 'web', details: subscription } })
      });
      console.log('User is subscribed to web push notifications');
    } catch (subError: any) {
      console.error('Failed to subscribe web user:', subError);
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
    if (!Capacitor.isNativePlatform()) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Successfully unsubscribed from old push notifications.');
      }
    } else {
      await PushNotifications.removeAllListeners();
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
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/push/test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send test notification:', err);
    return false;
  }
}
