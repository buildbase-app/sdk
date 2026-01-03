import { useCallback, useMemo } from 'react';
import { authActions, useAppDispatch, useAppSelector } from '../../contexts';
import { defaultApiClient } from '../../lib/api-client';
import { handleError } from '../../lib/error-handler';
import { useSaaSWorkspaces } from '../workspace/hooks';
import { removeSession } from './utils';

export function useSaaSAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const os = useAppSelector(state => state.os);
  const { serverUrl, orgId, auth: authConfig } = os;
  const { resetCurrentWorkspace } = useSaaSWorkspaces();

  const signIn = useCallback(async () => {
    dispatch.auth(authActions.authenticationStarted());
    try {
      const response = await defaultApiClient.post<{
        success: boolean;
        data: {
          redirectUrl: string;
        };
        message: string;
      }>(`${serverUrl}/api/v1/auth/request`, {
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
      handleError(error, {
        component: 'useSaaSAuth',
        action: 'signIn',
      });
      throw error;
    }
  }, [serverUrl, orgId, authConfig, dispatch]);

  const signOut = useCallback(async () => {
    try {
      // Call onSignOut callback if provided (before removing session)
      // This allows users to clean up their own tokens/storage
      if (
        authConfig?.callbacks?.onSignOut &&
        typeof authConfig.callbacks.onSignOut === 'function'
      ) {
        await authConfig.callbacks.onSignOut();
      }

      // Remove session from state and localStorage using centralized functions
      dispatch.auth(authActions.removeSession());
      resetCurrentWorkspace();

      // Explicit cleanup: ensure session is removed even if dispatch fails
      // Using centralized removeSession function
      removeSession();
    } catch (error) {
      handleError(error, {
        component: 'useSaaSAuth',
        action: 'signOut',
      });
      // Ensure cleanup even on error using centralized function
      removeSession();
    }
  }, [dispatch, resetCurrentWorkspace, authConfig?.callbacks?.onSignOut]);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      // State
      user: auth.session?.user,
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
