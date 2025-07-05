import { AuthSession, AuthUser } from './types';

const TOKEN_PARAM = 'token';
const AUTH_USER_KEY = 'saas_os_auth_user';
const AUTH_SESSION_KEY = 'saas_os_auth_session';
const AUTH_TOKEN_KEY = 'saas_os_auth_token';

export function saveCredentials(user: AuthUser, session: AuthSession) {
  document.cookie = `${AUTH_USER_KEY}=${JSON.stringify(user)}; path=/; secure;`;
  document.cookie = `${AUTH_SESSION_KEY}=${JSON.stringify(session)}; path=/; secure;`;
  document.cookie = `${AUTH_TOKEN_KEY}=${session.accessToken}; path=/; secure;`;
}

export function removeCredentials() {
  document.cookie = `${AUTH_USER_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
  document.cookie = `${AUTH_SESSION_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
  document.cookie = `${AUTH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
}

export function loadUserFromCookies(): { user: AuthUser | null; session: AuthSession | null } {
  try {
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const userStr = cookies.find(cookie => cookie.includes(AUTH_USER_KEY));
    const sessionStr = cookies.find(cookie => cookie.includes(AUTH_SESSION_KEY));
    const tokenStr = cookies.find(cookie => cookie.includes(AUTH_TOKEN_KEY));

    if (userStr && sessionStr && tokenStr) {
      const user: AuthUser = JSON.parse(userStr.split('=')[1]);
      const session: AuthSession = JSON.parse(sessionStr.split('=')[1]);

      // Check if session is expired
      if (new Date(session.expires) > new Date()) {
        return { user, session };
      } else {
        // Session expired, clear storage
        removeCredentials();
      }
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
    // Clear corrupted data
    removeCredentials();
  }

  return { user: null, session: null };
}

export function getTokenFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(TOKEN_PARAM);
  } catch (e) {
    return null;
  }
}

export function removeTokenFromUrl() {
  try {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete(TOKEN_PARAM);
    window.history.replaceState({}, '', newUrl.toString());
  } catch (e) {
    console.error('Error removing token from URL:', e);
  }
}

export function createSession(user: AuthUser, token: string, hours: number = 24): AuthSession {
  return {
    user,
    accessToken: token,
    expires: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
  };
}

export const AUTH_CONSTANTS = {
  TOKEN_PARAM,
  AUTH_USER_KEY,
  AUTH_SESSION_KEY,
  AUTH_TOKEN_KEY,
};
