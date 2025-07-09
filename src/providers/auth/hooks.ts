import { useCallback } from 'react';
import { defaultApiClient } from '../../lib/api-client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { authenticationFailed, authenticationStarted, removeSession } from './reducer';
import { useSaaSWorkspaces } from '../workspace/hooks';

export function useSaaSAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const os = useAppSelector(state => state.os);
  const { serverUrl, orgId, auth: authConfig } = os;
  const { resetCurrentWorkspace } = useSaaSWorkspaces();

  const signIn = useCallback(async () => {
    dispatch(authenticationStarted());
    try {
      const response = await defaultApiClient.post(`${serverUrl}/api/v1/auth/request`, {
        orgId: orgId,
        clientId: authConfig?.clientId,
        redirect: {
          success: authConfig?.redirectUrl || window.location.href,
          error: authConfig?.redirectUrl || window.location.href,
        },
      });

      if (response.data.success) {
        window.location.href = response.data.data.redirectUrl;
      } else {
        dispatch(authenticationFailed());
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (error) {
      dispatch(authenticationFailed());
      console.error('Sign in error:', error);
      throw error;
    }
  }, [serverUrl, orgId, authConfig, dispatch]);

  const signOut = useCallback(async () => {
    try {
      dispatch(removeSession());
      resetCurrentWorkspace();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [dispatch]);

  // Computed values

  return {
    // State
    user: auth.user,
    session: auth.session,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    isRedirecting: auth.isRedirecting,
    status: auth.status,

    // Actions
    signIn,
    signOut,
  };
}
