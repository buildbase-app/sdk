import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '../../contexts/shared/utils/storage';
import { AUTH_SESSION_ID_KEY, AUTH_TOKEN_PARAM } from '../constants';
import type { AuthSession } from './types';
import { AuthUser } from './types';

/**
 * Centralized Session Management
 * Only stores sessionId in localStorage - user data is kept in context only
 * This ensures we always fetch fresh user data on page refresh
 */

/**
 * Save sessionId to localStorage
 * Note: Only sessionId is stored, user data is kept in context state only
 * @param sessionId - The sessionId string to save
 */
export function setSessionId(sessionId: string): void {
  setStorageItem(AUTH_SESSION_ID_KEY, sessionId);
}

/**
 * Remove sessionId from localStorage
 */
export function removeSession(): void {
  removeStorageItem(AUTH_SESSION_ID_KEY);
}

/**
 * Get sessionId from localStorage
 * @returns The sessionId string or null if not found
 */
export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return getStorageItem(AUTH_SESSION_ID_KEY);
  } catch (error) {
    console.warn('Failed to get sessionId from localStorage:', error);
    return null;
  }
}

/**
 * Get sessionId (alias for getSessionId for backward compatibility)
 * @returns The sessionId string or null if not found
 */
export function getAccessToken(): string | null {
  return getSessionId();
}

/**
 * Get authentication headers with x-session-id
 * Centralized function for all API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const sessionId = getAccessToken();
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }
  return headers;
}

export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(AUTH_TOKEN_PARAM);
  } catch (e) {
    console.error('Error getting token from URL:', e);
    return null;
  }
}

export function removeTokenFromUrl() {
  try {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete(AUTH_TOKEN_PARAM);
    window.history.replaceState({}, '', newUrl.toString());
  } catch (e) {
    console.error('Error removing token from URL:', e);
  }
}

export function createSession(user: AuthUser, sessionId: string): AuthSession {
  return {
    user,
    sessionId,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  };
}
