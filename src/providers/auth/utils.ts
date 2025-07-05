import { AuthSession, AuthUser } from './types';

const TOKEN_PARAM = 'token';
export const AUTH_TOKEN_KEY = 'saas_os_auth_token';

export function saveCredentials(session: AuthSession) {
  console.log('saving credentials', session);
  localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(session));
}

export function removeCredentials() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAccessToken() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  try {
    if (!token) return null;
    const session: AuthSession = JSON.parse(token);
    return session.accessToken;
  } catch (e) {
    return null;
  }
}

export function loadUserFromCookies(): { session: AuthSession | null } {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      const session: AuthSession = JSON.parse(token);

      // Check if session is expired
      if (new Date(session.expires) > new Date()) {
        return { session };
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

  return { session: null };
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
  AUTH_TOKEN_KEY,
};
