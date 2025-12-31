import type { IAuthState } from '../../providers/auth/types';
import { AuthStatus } from '../../providers/auth/types';
import {
  removeSession as removeSessionStorage,
  setSessionId as setSessionIdStorage,
} from '../../providers/auth/utils';
import type { AuthAction } from './types';

/**
 * Initial state for auth context
 * Always returns unauthenticated state to prevent SSR hydration mismatches.
 * Session will be hydrated from localStorage on the client side via useEffect.
 */
export const getInitialAuthState = (): IAuthState => {
  // Always return unauthenticated state for SSR safety
  // Session will be loaded on client side in AuthProviderWrapper
  return {
    session: null,
    isLoading: false,
    isAuthenticated: false,
    isRedirecting: false,
    status: AuthStatus.unauthenticated,
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
      // Only store sessionId in localStorage, keep user data in context only
      setSessionIdStorage(session.sessionId);
      return {
        ...state,
        session,
        isAuthenticated: true,
        isRedirecting: false,
        isLoading: false,
        status: AuthStatus.authenticated,
      };
    }

    case 'REMOVE_SESSION':
      // Use centralized session removal function
      removeSessionStorage();
      return {
        ...state,
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
