/**
 * Auth action creators
 */

import type { AuthSession } from '../../providers/auth/types';
import type { AuthAction } from './types';

export const authActions = {
  authenticationStarted: (): AuthAction => ({
    type: 'AUTHENTICATION_STARTED',
  }),

  authenticationProcessing: (): AuthAction => ({
    type: 'AUTHENTICATION_PROCESSING',
  }),

  authenticationFailed: (): AuthAction => ({
    type: 'AUTHENTICATION_FAILED',
  }),

  setSession: (session: AuthSession): AuthAction => ({
    type: 'SET_SESSION',
    payload: session,
  }),

  removeSession: (): AuthAction => ({
    type: 'REMOVE_SESSION',
  }),
};
