'use client';

import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { IUser } from '../../api/types';
import { authActions, useAppDispatch, useAppSelector } from '../../contexts';
import { handleApiResponse, safeFetch } from '../../lib/api-utils';
import { handleError, handleErrorUnlessAborted } from '../../lib/error-handler';
import { useAsyncEffect } from '../../lib/useAsyncEffect';
import { getAuthFlags, IAuthCallbacks } from './types';
import {
  createSession,
  getSessionId,
  getTokenFromUrl,
  mapIUserToAuthUser,
  removeSession,
  removeTokenFromUrl,
} from './utils';

interface IProps {
  children: ReactNode;
  callbacks?: IAuthCallbacks;
}

/**
 * AuthProvider wrapper that adds authentication logic
 * This wraps the AuthContextProvider and adds token handling, callbacks, etc.
 */
export const AuthProviderWrapper = React.memo(({ children, callbacks }: IProps) => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector(state => state.auth);
  const osState = useAppSelector(state => state.os);
  const isAuthenticated = getAuthFlags(authState.status).isAuthenticated;

  // Track if we're processing an auth redirect to prevent duplicate processing
  const processingAuthRedirectRef = React.useRef(false);
  const processedCodeRef = React.useRef<string | null>(null);
  // Track if profile fetch is in progress to prevent race conditions
  const fetchingProfileRef = React.useRef(false);

  // Memoize callbacks to prevent unnecessary re-renders
  const memoizedCallbacks = useMemo(() => callbacks, [callbacks]);

  const handleAuthRedirect = useCallback(
    async (code: string) => {
      try {
        // Pass the code to the user's callback
        // User will verify the code with their own API (using secret and code)
        // and get user data, then store credentials however they want
        if (memoizedCallbacks?.handleAuthentication) {
          const { sessionId } = await memoizedCallbacks.handleAuthentication(code);

          // Validate sessionId
          if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            throw new Error('Invalid sessionId received from authentication callback');
          }

          // Get OS config for API request (destructure inside to avoid stale values)
          const currentOsState = osState;
          const { serverUrl, version, orgId } = currentOsState;
          if (!serverUrl || !version || !orgId) {
            throw new Error('OS configuration is not available');
          }

          // Make profile request to validate token and get user data
          const profileResponse = await safeFetch(`${serverUrl}/api/${version}/public/profile`, {
            headers: {
              'x-session-id': sessionId,
              'Content-Type': 'application/json',
            },
          });
          const userData = await handleApiResponse<IUser>(
            profileResponse,
            'Failed to fetch user profile'
          );

          const authUser = mapIUserToAuthUser(
            userData,
            orgId,
            currentOsState.auth?.clientId || ''
          );

          // Create session with user and sessionId
          const session = createSession(authUser, sessionId);

          // Dispatch setSession action to update auth state
          // The reducer will save only sessionId to localStorage, user data stays in context
          dispatch.auth(authActions.setSession(session));

          // Remove token from URL
          removeTokenFromUrl();
        }
      } catch (error) {
        handleError(error, {
          component: 'AuthProviderWrapper',
          action: 'handleAuthRedirect',
          metadata: { hasCode: !!code },
        });
        dispatch.auth(authActions.authenticationFailed());
        throw error;
      }
    },
    [dispatch, memoizedCallbacks, osState]
  );

  /**
   * Session hydration: UX-friendly flow.
   * 1. Initial state: status loading → app can show a loader (useSaaSAuth returns isLoading from status).
   * 2. Check sessionId in localStorage.
   * 3. No sessionId → dispatch authenticationFailed() → status unauthenticated.
   * 4. Has sessionId → fetch profile (stay loading); then setSession (authenticated) or authenticationFailed() (unauthenticated).
   * 5. If OS config isn't ready yet, stay in loading; effect re-runs when config is set.
   * If there's a code in the URL (OAuth redirect), skip hydration and let code handling take priority.
   */
  useAsyncEffect(
    async signal => {
      if (typeof window === 'undefined') return;
      if (isAuthenticated) return;
      if (fetchingProfileRef.current) return;

      const code = getTokenFromUrl();
      if (code) return;

      const sessionId = getSessionId();
      if (!sessionId) {
        dispatch.auth(authActions.authenticationFailed());
        return;
      }

      fetchingProfileRef.current = true;
      try {
        const { serverUrl, version, orgId } = osState;
        if (!serverUrl || !version || !orgId) {
          fetchingProfileRef.current = false;
          handleError(new Error('OS configuration not available, cannot fetch user profile'), {
            component: 'AuthProviderWrapper',
            action: 'fetchUserProfile',
          });
          return;
        }

        let userData: IUser;
        try {
          const profileResponse = await safeFetch(`${serverUrl}/api/${version}/public/profile`, {
            headers: {
              'x-session-id': sessionId,
              'Content-Type': 'application/json',
            },
            signal,
          });
          userData = await handleApiResponse<IUser>(profileResponse, 'Failed to fetch user profile');
        } catch (error) {
          if (!handleErrorUnlessAborted(error, {
            component: 'AuthProviderWrapper',
            action: 'fetchUserProfile',
            metadata: { step: 'fetchProfile' },
          })) return;
          fetchingProfileRef.current = false;
          removeSession();
          dispatch.auth(authActions.authenticationFailed());
          return;
        }

        const authUser = mapIUserToAuthUser(
          userData,
          orgId,
          osState.auth?.clientId || ''
        );

        const session = createSession(authUser, sessionId);
        dispatch.auth(authActions.setSession(session));
      } catch (error) {
        const isValidationError =
          error instanceof Error &&
          (error.message === 'User data missing required ID field' ||
            error.message === 'User data missing required email field');
        if (!handleErrorUnlessAborted(error, {
          component: 'AuthProviderWrapper',
          action: 'fetchUserProfile',
          metadata: { step: isValidationError ? 'validateUserData' : 'pageLoad' },
        })) return;
        removeSession();
        dispatch.auth(authActions.authenticationFailed());
      } finally {
        fetchingProfileRef.current = false;
      }
    },
    [isAuthenticated, dispatch, osState]
  );

  /**
   * Handle OAuth redirect: when user returns with ?code=... in URL.
   * 
   * Flow:
   * 1. User clicks signIn() → redirects to OAuth provider.
   * 2. OAuth provider redirects back with ?code=... in URL.
   * 3. This effect detects the code and processes it:
   *    - Calls handleAuthentication(code) callback (user exchanges code for sessionId).
   *    - Fetches user profile with sessionId.
   *    - Creates session and dispatches setSession() → status: authenticated.
   *    - Removes code from URL.
   * 
   * Note: This takes priority over localStorage hydration (hydration effect skips when code exists).
   */
  useEffect(() => {
    const code = getTokenFromUrl();
    if (!code) {
      return;
    }

    // Prevent duplicate processing of the same code
    if (processingAuthRedirectRef.current || processedCodeRef.current === code) {
      return;
    }

    // Check if OS configuration is available
    const { serverUrl, version, orgId } = osState;
    if (!serverUrl || !version || !orgId) {
      // OS config not ready yet, wait for it to be available
      // This effect will re-run when osState changes
      return;
    }

    // Mark as processing and store the code
    processingAuthRedirectRef.current = true;
    processedCodeRef.current = code;

    // Set status to authenticating (without redirecting flag) to show we're processing the OAuth callback
    dispatch.auth(authActions.authenticationProcessing());

    // OS config is ready, process auth redirect
    handleAuthRedirect(code)
      .then(() => {
        // Success - code will be removed from URL in handleAuthRedirect
        processedCodeRef.current = null;
      })
      .catch(error => {
        // Error is already handled in handleAuthRedirect
        handleError(error, {
          component: 'AuthProviderWrapper',
          action: 'handleAuthRedirectEffect',
          metadata: { code: code.substring(0, 10) + '...' }, // Log partial code for debugging
        });
        // Reset on error so it can be retried if needed
        processedCodeRef.current = null;
      })
      .finally(() => {
        processingAuthRedirectRef.current = false;
      });
  }, [handleAuthRedirect, osState.serverUrl, osState.version, osState.orgId]);

  // WorkspaceProvider is already in SDKContextProvider, so we don't need to wrap here
  // Just return children - the context providers handle the state management
  return <>{children}</>;
});

AuthProviderWrapper.displayName = 'AuthProviderWrapper';

// Export AuthProvider for backward compatibility
export const AuthProvider = AuthProviderWrapper;
