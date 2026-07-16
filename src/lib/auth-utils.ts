/**
 * Framework-agnostic auth utilities.
 * Session management (localStorage) and auth header building.
 * Used by BaseApi for client-side auth. No React dependency.
 */

import { handleError } from './error-handler';
import { getStorageItem, removeStorageItem, setStorageItem } from './storage';

const AUTH_SESSION_ID_KEY = 'saas-session-id';
const AUTH_DEVICE_ID_KEY = 'saas-device-id';
const AUTH_TOKEN_PARAM = 'code';
const AUTH_STATE_PARAM = 'state';

// ─── Session Management ────────────────────────────────────────────────────────

export function setSessionId(sessionId: string): void {
  setStorageItem(AUTH_SESSION_ID_KEY, sessionId);
}

export function removeSession(): void {
  removeStorageItem(AUTH_SESSION_ID_KEY);
}

export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return getStorageItem(AUTH_SESSION_ID_KEY);
  } catch (error) {
    handleError(error, {
      component: 'auth-utils',
      action: 'getSessionId',
      metadata: { key: AUTH_SESSION_ID_KEY },
    });
    return null;
  }
}

export function getAccessToken(): string | null {
  return getSessionId();
}

// ─── Device Identity ───────────────────────────────────────────────────────────

/** Generate a device id that satisfies the server's `^[A-Za-z0-9._-]{8,128}$`. */
function generateDeviceId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback for older runtimes without crypto.randomUUID.
  return `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Stable per-browser device id, persisted in localStorage. Sent as `x-device-id`
 * so the server can tie sessions to a device (new-device alerts, the "current"
 * flag in the device list, per-device sign-out). Created on first use.
 * Returns null on the server (no localStorage) — device binding is client-only.
 */
export function getOrCreateDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let deviceId = getStorageItem(AUTH_DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      setStorageItem(AUTH_DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    handleError(error, {
      component: 'auth-utils',
      action: 'getOrCreateDeviceId',
      metadata: { key: AUTH_DEVICE_ID_KEY },
    });
    return null;
  }
}

// ─── Auth Headers ──────────────────────────────────────────────────────────────

export function getAuthHeaders(): Record<string, string> {
  const sessionId = getAccessToken();
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }
  const deviceId = getOrCreateDeviceId();
  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }
  return headers;
}

// ─── URL Token ─────────────────────────────────────────────────────────────────

export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(AUTH_TOKEN_PARAM);
  } catch (e) {
    handleError(e, {
      component: 'auth-utils',
      action: 'getTokenFromUrl',
      metadata: { param: AUTH_TOKEN_PARAM },
    });
    return null;
  }
}

export function getStateFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(AUTH_STATE_PARAM);
  } catch (e) {
    handleError(e, {
      component: 'auth-utils',
      action: 'getStateFromUrl',
      metadata: { param: AUTH_STATE_PARAM },
    });
    return null;
  }
}

export function removeTokenFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete(AUTH_TOKEN_PARAM);
    newUrl.searchParams.delete(AUTH_STATE_PARAM);
    window.history.replaceState({}, '', newUrl.toString());
  } catch (e) {
    handleError(e, {
      component: 'auth-utils',
      action: 'removeTokenFromUrl',
      metadata: { param: AUTH_TOKEN_PARAM },
    });
  }
}

// Re-export constants for backward compat
export { AUTH_DEVICE_ID_KEY, AUTH_SESSION_ID_KEY, AUTH_STATE_PARAM, AUTH_TOKEN_PARAM };
