import type { Dispatch } from 'react';
import type { AuthSession, IAuthState } from '../../providers/auth/types';

export type AuthAction =
  | { type: 'AUTHENTICATION_STARTED' }
  | { type: 'AUTHENTICATION_PROCESSING' }
  | { type: 'AUTHENTICATION_FAILED' }
  | { type: 'SET_SESSION'; payload: AuthSession }
  | { type: 'REMOVE_SESSION' };

export interface AuthContextValue {
  state: IAuthState;
  dispatch: Dispatch<AuthAction>;
}
