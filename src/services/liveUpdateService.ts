import { LiveUpdate } from '@capawesome/capacitor-live-update';
import { Capacitor } from '@capacitor/core';
import { getApiUrl, getApiBaseUrl } from '../lib/api';

export interface LiveUpdateCheckResult {
  updateAvailable: boolean;
  bundleId?: string;
  error?: string;
}

/**
 * Call on app startup. Informs Capawesome Live Update that the current bundle booted successfully.
 * If a new update causes a crash on boot, Capawesome automatically rolls back to the built-in fallback bundle.
 */
export async function notifyAppReady(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LiveUpdate.ready();
    console.log('[LiveUpdate] App reported ready to Capawesome Live Update');
  } catch (err) {
    console.warn('[LiveUpdate] Error calling ready():', err);
  }
}

/**
 * Returns current live update bundle ID or version string.
 */
export async function getCurrentVersion(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const current = await LiveUpdate.getCurrentBundle();
      return current?.bundleId || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Checks backend for a new web bundle version and downloads it if available.
 */
export async function checkForLiveUpdate(): Promise<LiveUpdateCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    return { updateAvailable: false };
  }

  try {
    // 1. Get current active bundle
    const currentBundle = await LiveUpdate.getCurrentBundle();
    const currentBundleId = currentBundle?.bundleId;
    console.log('[LiveUpdate] Current bundle ID:', currentBundleId);

    // 2. Resolve server manifest URL
    const baseUrl = getApiBaseUrl();
    const manifestUrl = getApiUrl('/api/live-update/manifest');

    console.log('[LiveUpdate] Fetching manifest from:', manifestUrl);
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      if (response.status === 404) {
        console.log('[LiveUpdate] No manifest available on server');
        return { updateAvailable: false };
      }
      throw new Error(`Manifest server returned HTTP ${response.status}`);
    }

    const manifest = await response.json();
    if (!manifest.bundleId || !manifest.url) {
      console.warn('[LiveUpdate] Invalid manifest format:', manifest);
      return { updateAvailable: false };
    }

    // 3. Check if server bundle is newer
    if (manifest.bundleId === currentBundleId) {
      console.log('[LiveUpdate] App is up to date (bundle:', currentBundleId, ')');
      return { updateAvailable: false };
    }

    console.log(`[LiveUpdate] New bundle available: ${manifest.bundleId} (current: ${currentBundleId})`);

    // Resolve full zip download URL
    const downloadUrl = manifest.url.startsWith('http')
      ? manifest.url
      : `${baseUrl.replace(/\/$/, '')}${manifest.url.startsWith('/') ? '' : '/'}${manifest.url}`;

    // 4. Download new bundle
    console.log(`[LiveUpdate] Downloading bundle from: ${downloadUrl}...`);
    await LiveUpdate.downloadBundle({
      bundleId: manifest.bundleId,
      url: downloadUrl,
    });

    // 5. Set next bundle for next reload/app restart
    await LiveUpdate.setNextBundle({
      bundleId: manifest.bundleId,
    });

    console.log(`[LiveUpdate] Bundle ${manifest.bundleId} downloaded and set active successfully.`);
    return {
      updateAvailable: true,
      bundleId: manifest.bundleId,
    };
  } catch (err: any) {
    console.error('[LiveUpdate] Live update check failed:', err);
    return {
      updateAvailable: false,
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Reloads the WebView immediately to switch to the newly downloaded bundle.
 */
export async function applyLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LiveUpdate.reload();
  } catch (err) {
    console.error('[LiveUpdate] Failed to reload app:', err);
  }
}

/**
 * Resets Capawesome Live Update to the default APK bundle, clears storage, and reloads.
 */
export async function resetLiveUpdateBundle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LiveUpdate.reset();
    } catch (err) {
      console.error('[LiveUpdate] Reset error:', err);
    }
  }
  try {
    localStorage.clear();
  } catch (e) {}
  window.location.reload();
}
