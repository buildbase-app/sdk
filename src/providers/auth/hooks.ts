import { useCallback, useMemo } from 'react';
import { authActions, useAppDispatch, useAppSelector } from '../../contexts';
import { defaultApiClient } from '../../lib/api-client';
import { handleError } from '../../lib/error-handler';
import { useSaaSWorkspaces } from '../workspace/hooks';
import { workspaceSettingsManager } from '../workspace/settings-manager';
import { getAuthFlags } from './types';
import { removeSession } from './utils';
import { WorkspaceSettingsSection } from '../workspace/ui/SettingsDialog';

/**
 * Main authentication hook for the SDK.
 * Provides authentication state, user session, and auth actions.
 *
 * @returns An object containing:
 * - `user`: Current authenticated user object (null if not authenticated)
 * - `session`: Full session object with user and token (null if not authenticated)
 * - `status`: Current authentication status (loading, redirecting, authenticating, authenticated, unauthenticated)
 * - `isLoading`: Boolean indicating if auth state is being determined
 * - `isAuthenticated`: Boolean indicating if user is authenticated
 * - `isRedirecting`: Boolean indicating if redirecting to OAuth provider
 * - `signIn()`: Function to initiate OAuth sign-in flow
 * - `signOut()`: Function to sign out the current user
 * - `openWorkspaceSettings(section?)`: Function to open workspace settings dialog
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signIn, signOut } = useSaaSAuth();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={signIn}>Sign In</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.name}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Handle loading state
 * function App() {
 *   const { status, isLoading } = useSaaSAuth();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return <MainContent />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Open workspace settings
 * function SettingsButton() {
 *   const { openWorkspaceSettings } = useSaaSAuth();
 *
 *   return (
 *     <button onClick={() => openWorkspaceSettings('general')}>
 *       Open Settings
 *     </button>
 *   );
 * }
 * ```
 */
export function useSaaSAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const os = useAppSelector(state => state.os);
  const { serverUrl, orgId, auth: authConfig } = os;
  const { resetCurrentWorkspace, currentWorkspace } = useSaaSWorkspaces();

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

  const openWorkspaceSettings = useCallback(
    (section?: WorkspaceSettingsSection) => {
      if (!currentWorkspace) {
        handleError(new Error('Cannot open settings: No current workspace'), {
          component: 'useSaaSAuth',
          action: 'openWorkspaceSettings',
        });
        return;
      }
      workspaceSettingsManager.openWorkspaceSettings(section);
    },
    [currentWorkspace]
  );

  const flags = useMemo(() => getAuthFlags(auth.status), [auth.status]);

  return useMemo(
    () => ({
      user: auth.session?.user,
      session: auth.session,
      status: auth.status,
      ...flags,
      signIn,
      signOut,
      openWorkspaceSettings,
    }),
    [auth.session, auth.status, flags, signIn, signOut, openWorkspaceSettings]
  );
}
