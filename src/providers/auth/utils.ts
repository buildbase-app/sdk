import { IUser } from '../../api/types';
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '../../contexts/shared/utils/storage';
import { handleError } from '../../lib/error-handler';
import { AUTH_SESSION_ID_KEY, AUTH_TOKEN_PARAM } from '../constants';
import type { AuthSession, AuthUser } from './types';

/**
 * Map IUser from API to AuthUser for session
 * @throws Error if user data is missing required ID or email fields
 */
export function mapIUserToAuthUser(userData: IUser, orgId: string, clientId: string): AuthUser {
  const userId = userData._id || userData.id;
  if (!userId || typeof userId !== 'string') {
    throw new Error('User data missing required ID field');
  }
  if (!userData.email || typeof userData.email !== 'string') {
    throw new Error('User data missing required email field');
  }
  return {
    id: userId,
    name: userData.name || '',
    org: orgId,
    email: userData.email,
    emailVerified: true,
    clientId,
    role: userData.role || '',
    image: userData.image,
  };
}

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
    handleError(error, {
      component: 'auth/utils',
      action: 'getSessionId',
      metadata: { key: AUTH_SESSION_ID_KEY },
    });
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
    handleError(e, {
      component: 'auth/utils',
      action: 'getTokenFromUrl',
      metadata: { param: AUTH_TOKEN_PARAM },
    });
    return null;
  }
}

export function removeTokenFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete(AUTH_TOKEN_PARAM);
    window.history.replaceState({}, '', newUrl.toString());
  } catch (e) {
    handleError(e, {
      component: 'auth/utils',
      action: 'removeTokenFromUrl',
      metadata: { param: AUTH_TOKEN_PARAM },
    });
  }
}

export function createSession(user: AuthUser, sessionId: string): AuthSession {
  return {
    user,
    sessionId,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  };
}
