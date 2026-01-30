import { updateField, updateFields } from '../shared/utils/reducerHelpers';
import type { IAuthState } from '../../providers/auth/types';
import { AuthStatus } from '../../providers/auth/types';
import {
  removeSession as removeSessionStorage,
  setSessionId as setSessionIdStorage,
} from '../../providers/auth/utils';
import type { AuthAction } from './types';

/**
 * Initial state for auth context.
 *
 * UX flow:
 * 1. App loads → status: loading (user sees loading state).
 * 2. AuthProviderWrapper checks session in localStorage.
 * 3. No session → status: unauthenticated (show login).
 * 4. Has session → fetch profile; success → authenticated, failure → unauthenticated.
 *
 * Flags (isLoading, isAuthenticated, isRedirecting) are derived from status via getAuthFlags().
 */
export const getInitialAuthState = (): IAuthState => {
  return {
    session: null,
    status: AuthStatus.loading,
  };
};

/**
 * Auth reducer for Context API
 * Handles all auth state updates with proper immutability
 */
export const authReducer = (state: IAuthState, action: AuthAction): IAuthState => {
  switch (action.type) {
    case 'AUTHENTICATION_STARTED':
      return updateField(state, 'status', AuthStatus.redirecting);

    case 'AUTHENTICATION_PROCESSING':
      return updateField(state, 'status', AuthStatus.authenticating);

    case 'AUTHENTICATION_FAILED':
      return updateFields(state, { session: null, status: AuthStatus.unauthenticated });

    case 'SET_SESSION': {
      const session = action.payload;
      setSessionIdStorage(session.sessionId);
      return updateFields(state, { session, status: AuthStatus.authenticated });
    }

    case 'REMOVE_SESSION':
      removeSessionStorage();
      return updateFields(state, { session: null, status: AuthStatus.unauthenticated });

    default:
      return state;
  }
};
