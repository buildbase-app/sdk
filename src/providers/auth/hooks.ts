import { useCallback, useMemo } from 'react';
import { useAuthDispatch, useAuthSelector, useOSSelector } from '../../contexts';
import { authActions } from '../../contexts/actionCreators';
import { defaultApiClient } from '../../lib/api-client';
import { useSaaSWorkspaces } from '../workspace/hooks';

export function useSaaSAuth() {
  const authDispatch = useAuthDispatch();
  const auth = useAuthSelector();
  const os = useOSSelector();
  const { serverUrl, orgId, auth: authConfig } = os;
  const { resetCurrentWorkspace } = useSaaSWorkspaces();

  const signIn = useCallback(async () => {
    authDispatch(authActions.authenticationStarted());
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
        authDispatch(authActions.authenticationFailed());
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (error) {
      authDispatch(authActions.authenticationFailed());
      console.error('Sign in error:', error);
      throw error;
    }
  }, [serverUrl, orgId, authConfig, authDispatch]);

  const signOut = useCallback(async () => {
    try {
      authDispatch(authActions.removeSession());
      resetCurrentWorkspace();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [authDispatch, resetCurrentWorkspace]);

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
