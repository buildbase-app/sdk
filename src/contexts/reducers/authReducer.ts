import type { AuthSession, IAuthState } from '../../providers/auth/types';
import { AuthStatus } from '../../providers/auth/types';
import type { AuthAction } from '../types';
import { getStorageJSON, removeStorageItem, setStorageJSON } from '../utils/storage';

export const AUTH_TOKEN_KEY = 'saas_os_auth_token';

function loadSession(): AuthSession | null {
  const session = getStorageJSON<AuthSession>(AUTH_TOKEN_KEY);
  if (!session) return null;

  // Check if session is expired
  if (new Date(session.expires) > new Date()) {
    return session;
  }

  // Session expired, clear storage
  removeStorageItem(AUTH_TOKEN_KEY);
  return null;
}

function saveSession(session: AuthSession) {
  setStorageJSON(AUTH_TOKEN_KEY, session);
}

function removeSession() {
  removeStorageItem(AUTH_TOKEN_KEY);
}

/**
 * Initial state for auth context
 * Loads session from localStorage if available
 */
export const getInitialAuthState = (): IAuthState => {
  const session = loadSession();
  return {
    user: session?.user || null,
    session: session || null,
    isLoading: false,
    isAuthenticated: !!session,
    isRedirecting: false,
    status: session ? AuthStatus.authenticated : AuthStatus.unauthenticated,
  };
};

/**
 * Auth reducer for Context API
 * Handles all auth state updates with proper immutability
 */
export const authReducer = (state: IAuthState, action: AuthAction): IAuthState => {
  switch (action.type) {
    case 'AUTHENTICATION_STARTED':
      return {
        ...state,
        isLoading: true,
        isAuthenticated: false,
        isRedirecting: true,
        status: AuthStatus.authenticating,
      };

    case 'AUTHENTICATION_FAILED':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        isRedirecting: false,
        status: AuthStatus.unauthenticated,
      };

    case 'SET_SESSION': {
      const session = action.payload;
      saveSession(session);
      return {
        ...state,
        session,
        user: session.user,
        isAuthenticated: true,
        isRedirecting: false,
        isLoading: false,
        status: AuthStatus.authenticated,
      };
    }

    case 'REMOVE_SESSION':
      removeSession();
      return {
        ...state,
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        isRedirecting: false,
        status: AuthStatus.unauthenticated,
      };

    default:
      return state;
  }
};
