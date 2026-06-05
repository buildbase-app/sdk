import { useCallback, useMemo } from 'react';
import { AuthApi } from '../../api/services/auth-api';
import { authActions, useAppDispatch, useAppSelector } from '../../contexts';
import { useFullScreenLoader } from '../../contexts/FullScreenLoaderContext';
import { useTranslation } from '../../i18n';
import { saveAuthIntent } from '../../lib/auth-intent';
import { handleError } from '../../lib/error-handler';
import { safeRedirect } from '../../lib/security';
import { BBAction } from '../../lib/url-params';
import { useSaaSOs } from '../os/hooks';
import { useSaaSWorkspaces } from '../workspace/hooks';
import { workspaceSettingsManager } from '../workspace/settings-manager';
import { SettingsScreen, WorkspaceSettingsSection } from '../workspace/ui/SettingsDialog';
import { getAuthFlags } from './types';
import { removeSession } from './utils';

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

/** Internal: select auth slice. Used by AuthProviderWrapper and useSaaSAuth. */
export function useAuthState() {
  return useAppSelector(state => state.auth);
}

export function useSaaSAuth() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const auth = useAuthState();
  const os = useSaaSOs();
  const { serverUrl, orgId, auth: authConfig } = os;
  const { resetCurrentWorkspace, currentWorkspace } = useSaaSWorkspaces();
  const loader = useFullScreenLoader();

  const authApi = useMemo(
    () => new AuthApi({ serverUrl, version: os.version }),
    [serverUrl, os.version]
  );

  const signIn = useCallback(
    async (returnUrl?: string) => {
      saveAuthIntent(returnUrl || window.location.href);
      dispatch.auth(authActions.authenticationStarted());
      loader.show(t('loading.redirecting'));
      try {
        const response = await authApi.requestAuth({
          orgId,
          clientId: authConfig?.clientId ?? '',
          redirect: {
            success: authConfig?.redirectUrl || window.location.href,
            error: authConfig?.redirectUrl || window.location.href,
          },
        });

        if (response.success) {
          safeRedirect(response.data.redirectUrl);
          // Keep loader visible — user is navigating away
        } else {
          loader.hide();
          dispatch.auth(authActions.authenticationFailed());
          throw new Error(response.message || t('errors.generic'));
        }
      } catch (error) {
        loader.hide();
        dispatch.auth(authActions.authenticationFailed());
        handleError(error, {
          component: 'useSaaSAuth',
          action: 'signIn',
        });
        throw error;
      }
    },
    [authApi, orgId, authConfig, dispatch, loader, t]
  );

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
    } catch (error) {
      handleError(error, {
        component: 'useSaaSAuth',
        action: 'signOut',
      });
    } finally {
      // Always clean up state and localStorage, even if onSignOut callback throws
      removeSession();
      dispatch.auth(authActions.removeSession());
      resetCurrentWorkspace();
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

  const openCreditStore = useCallback(() => {
    if (!currentWorkspace) {
      handleError(new Error('Cannot open credit store: No current workspace'), {
        component: 'useSaaSAuth',
        action: 'openCreditStore',
      });
      return;
    }
    workspaceSettingsManager.openWorkspaceSettings(SettingsScreen.Credits, {
      action: BBAction.OpenCreditStore,
    });
  }, [currentWorkspace]);

  const openPlanPicker = useCallback(() => {
    if (!currentWorkspace) {
      handleError(new Error('Cannot open plan picker: No current workspace'), {
        component: 'useSaaSAuth',
        action: 'openPlanPicker',
      });
      return;
    }
    workspaceSettingsManager.openWorkspaceSettings(SettingsScreen.Subscription, {
      action: BBAction.SelectPlan,
    });
  }, [currentWorkspace]);

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
      openCreditStore,
      openPlanPicker,
    }),
    [
      auth.session,
      auth.status,
      flags,
      signIn,
      signOut,
      openWorkspaceSettings,
      openCreditStore,
      openPlanPicker,
    ]
  );
}
