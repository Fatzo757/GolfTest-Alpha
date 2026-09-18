import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Badge } from '@capawesome/capacitor-badge';
import { getApiUrl } from './api';

const PENDING_NAV_KEY = 'golf_pending_push_nav';
const SYNCED_TOKEN_KEY = 'golf_synced_push_token';
const SYNCED_USER_KEY = 'golf_synced_user_token';

/**
 * Retrieves and clears any pending push notification navigation URL
 * buffered during an app cold-start before listeners were attached.
 */
export function getAndClearPendingPushUrl(): string | null {
  try {
    const url = sessionStorage.getItem(PENDING_NAV_KEY);
    if (url) {
      sessionStorage.removeItem(PENDING_NAV_KEY);
      return url;
    }
  } catch {}
  return null;
}

export async function clearAppBadge() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Badge.clear();
    } catch (e) {
      console.error('Failed to clear badge:', e);
    }
  }
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered with scope:', registration.scope);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) return;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
             window.dispatchEvent(new CustomEvent('sw-update'));
          }
        };
      };

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Robust fetch with exponential backoff for network and 5xx/429 errors.
 * Fails fast on 4xx client errors (e.g. 401 Unauthorized, 400 Bad Request).
 */
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;

      // Fail fast on non-retryable client errors (400, 401, 403, 404, etc.) except 429 rate limits
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(`Client error HTTP ${res.status}`);
      }

      // If server error or 429, wait with exponential backoff if retries remain
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Client error')) throw err;
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Failed after retries");
};

// In-flight promise guard to deduplicate concurrent subscription calls
let activeSubscriptionPromise: Promise<void> | null = null;

export async function subscribeUserToPush(token: string): Promise<void> {
  if (activeSubscriptionPromise) {
    return activeSubscriptionPromise;
  }

  activeSubscriptionPromise = (async () => {
    try {
      await doSubscribeUserToPush(token);
    } finally {
      activeSubscriptionPromise = null;
    }
  })();

  return activeSubscriptionPromise;
}

async function doSubscribeUserToPush(token: string) {
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

      // Ensure notification channel is safely created/configured on Android O+
      try {
        await PushNotifications.createChannel({
          id: 'fcm_default_channel',
          name: 'Game Updates',
          description: 'Notifications for turns, invites, and messages',
          importance: 5, // High/Max importance for immediate heads-up and sound
          visibility: 1,
          vibration: true,
          lights: true,
        });
      } catch (channelErr) {
        console.warn('Native notification channel configuration skipped:', channelErr);
      }

      PushNotifications.addListener('registration', async (tokenObj) => {
        try {
          // Token caching: check if we already synced this identical token for this user
          const cachedToken = localStorage.getItem(SYNCED_TOKEN_KEY);
          const cachedUser = localStorage.getItem(SYNCED_USER_KEY);
          if (cachedToken === tokenObj.value && cachedUser === token) {
            console.log('Native push token already synced with backend');
            return;
          }

          await fetchWithRetry(getApiUrl('/api/push/subscribe'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription: { platform: 'android', token: tokenObj.value } })
          });

          try {
            localStorage.setItem(SYNCED_TOKEN_KEY, tokenObj.value);
            localStorage.setItem(SYNCED_USER_KEY, token);
          } catch {}

          console.log('Successfully registered native push token');
        } catch (e) {
          console.error('Failed to send native push token to backend', e);
        }
      });
      
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on native registration:', error);
      });
      
      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('Push notification received: ', notification);
        window.dispatchEvent(new CustomEvent('push-received', { detail: notification }));
        try {
          const res = await Badge.get();
          await Badge.set({ count: (res.count || 0) + 1 });
        } catch (e) {}
      });
      
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push notification action performed', action);
        clearAppBadge();
        const data = action.notification.data;
        if (data && data.url) {
          try {
            sessionStorage.setItem(PENDING_NAV_KEY, data.url);
          } catch {}
          window.dispatchEvent(new CustomEvent('push-navigate', { detail: data.url }));
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
    
    const keyRes = await fetch(getApiUrl('/api/push/public-key'), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { publicKey } = await keyRes.json();
    if (!publicKey) return;

    try {
      // Reuse existing subscription if already active
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      const subStr = JSON.stringify(subscription);
      const cachedToken = localStorage.getItem(SYNCED_TOKEN_KEY);
      const cachedUser = localStorage.getItem(SYNCED_USER_KEY);
      if (cachedToken === subStr && cachedUser === token) {
        console.log('Web push subscription already synced');
        return;
      }

      await fetchWithRetry(getApiUrl('/api/push/subscribe'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription: { platform: 'web', details: subscription } })
      });

      try {
        localStorage.setItem(SYNCED_TOKEN_KEY, subStr);
        localStorage.setItem(SYNCED_USER_KEY, token);
      } catch {}

      console.log('User is subscribed to web push notifications');
    } catch (subError: any) {
      console.error('Failed to subscribe web user:', subError);
    }
  } catch (error) {
    console.error('Failed to prepare push subscription:', error);
  }
}

/**
 * Fast, modern Base64 to Uint8Array conversion using Uint8Array.from
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, c => c.charCodeAt(0));
}

export async function resetPushSubscription(token: string) {
  try {
    try {
      localStorage.removeItem(SYNCED_TOKEN_KEY);
      localStorage.removeItem(SYNCED_USER_KEY);
    } catch {}

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
    const res = await fetch(getApiUrl('/api/push/test'), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send test notification:', err);
    return false;
  }
}

export async function unsubscribeFromPush(token: string) {
  try {
    try {
      localStorage.removeItem(SYNCED_TOKEN_KEY);
      localStorage.removeItem(SYNCED_USER_KEY);
    } catch {}

    if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    } else if (Capacitor.isNativePlatform()) {
      await PushNotifications.removeAllListeners();
    }
    
    await fetch(getApiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Successfully unsubscribed from push notifications.');
    return true;
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err);
    return false;
  }
}
