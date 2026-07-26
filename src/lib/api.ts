import { Capacitor } from '@capacitor/core';

export const DEFAULT_SERVER_URL = 'https://golfcardgame.serveratthehouse.com';

/**
 * Resolves the active backend API base URL.
 */
export function getApiBaseUrl(): string {
  // 1. Check custom user-configured server URL in localStorage
  try {
    const customUrl = localStorage.getItem('golf_custom_api_url');
    if (customUrl && customUrl.trim() !== '') {
      return customUrl.trim().replace(/\/$/, '');
    }
  } catch (e) {}

  // 2. Check environment variable set during build
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 3. Web browser environment (served directly from web host if not running in native Capacitor)
  if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
    return window.location.origin.replace(/\/$/, '');
  }

  // 4. Default fallback endpoint
  return DEFAULT_SERVER_URL;
}

/**
 * Saves a custom backend server URL for native Capacitor or custom server connections.
 */
export function setCustomApiBaseUrl(url: string): void {
  try {
    if (!url || url.trim() === '' || url.trim().replace(/\/$/, '') === DEFAULT_SERVER_URL) {
      localStorage.removeItem('golf_custom_api_url');
    } else {
      let formatted = url.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `https://${formatted}`;
      }
      localStorage.setItem('golf_custom_api_url', formatted.replace(/\/$/, ''));
    }
  } catch (e) {}
}

/**
 * Constructs a full API endpoint URL.
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
