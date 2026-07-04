/**
 * Framework-agnostic auth utilities.
 * Session management (localStorage) and auth header building.
 * Used by BaseApi for client-side auth. No React dependency.
 */

import { handleError } from './error-handler';
import { getStorageItem, removeStorageItem, setStorageItem } from './storage';

const AUTH_SESSION_ID_KEY = 'saas-session-id';
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

// ─── Auth Headers ──────────────────────────────────────────────────────────────

export function getAuthHeaders(): Record<string, string> {
  const sessionId = getAccessToken();
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['x-session-id'] = sessionId;
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
export { AUTH_SESSION_ID_KEY, AUTH_STATE_PARAM, AUTH_TOKEN_PARAM };
