import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../contexts';
import { authActions } from '../../contexts/actionCreators';
import { defaultApiClient } from '../../lib/api-client';
import { useSaaSWorkspaces } from '../workspace/hooks';

export function useSaaSAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const os = useAppSelector(state => state.os);
  const { serverUrl, orgId, auth: authConfig } = os;
  const { resetCurrentWorkspace } = useSaaSWorkspaces();

  const signIn = useCallback(async () => {
    dispatch.auth(authActions.authenticationStarted());
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
        dispatch.auth(authActions.authenticationFailed());
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (error) {
      dispatch.auth(authActions.authenticationFailed());
      console.error('Sign in error:', error);
      throw error;
    }
  }, [serverUrl, orgId, authConfig, dispatch]);

  const signOut = useCallback(async () => {
    try {
      dispatch.auth(authActions.removeSession());
      resetCurrentWorkspace();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [dispatch, resetCurrentWorkspace]);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
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
    }),
    [auth, signIn, signOut]
  );
}
