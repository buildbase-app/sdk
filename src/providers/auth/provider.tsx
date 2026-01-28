'use client';

import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { IUser } from '../../api/types';
import { authActions, useAppDispatch, useAppSelector } from '../../contexts';
import { handleError } from '../../lib/error-handler';
import type { AuthUser } from './types';
import { getAuthFlags, IAuthCallbacks } from './types';
import {
  createSession,
  getSessionId,
  getTokenFromUrl,
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
          const profileResponse = await fetch(`${serverUrl}/api/${version}/public/profile`, {
            headers: {
              'x-session-id': sessionId,
              'Content-Type': 'application/json',
            },
          });

          if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
          }

          let userData: IUser;
          try {
            userData = await profileResponse.json();
          } catch (parseError) {
            throw new Error('Failed to parse user profile response');
          }

          // Validate required user data fields
          const userId = userData._id || userData.id;
          if (!userId || typeof userId !== 'string') {
            throw new Error('User data missing required ID field');
          }

          if (!userData.email || typeof userData.email !== 'string') {
            throw new Error('User data missing required email field');
          }

          // Map IUser to AuthUser with validated data
          const authUser: AuthUser = {
            id: userId,
            name: userData.name || '',
            org: orgId,
            email: userData.email,
            emailVerified: true, // Assuming verified if profile request succeeds
            clientId: currentOsState.auth?.clientId || '',
            role: userData.role || '',
            image: userData.image,
          };

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
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthenticated) return;

    // Skip hydration if there's a code in URL - let OAuth redirect flow handle it first
    const code = getTokenFromUrl();
    if (code) {
      return;
    }

    const sessionId = getSessionId();
    if (!sessionId) {
      dispatch.auth(authActions.authenticationFailed());
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const { serverUrl, version, orgId } = osState;
        if (!serverUrl || !version || !orgId) {
          // Stay in loading until OS config is set; effect will re-run when osState updates
          handleError(new Error('OS configuration not available, cannot fetch user profile'), {
            component: 'AuthProviderWrapper',
            action: 'fetchUserProfile',
          });
          return;
        }

        // Make profile request to get latest user data
        const profileResponse = await fetch(`${serverUrl}/api/${version}/public/profile`, {
          headers: {
            'x-session-id': sessionId,
            'Content-Type': 'application/json',
          },
        });

        if (!profileResponse.ok) {
          // Session invalid, remove it
          handleError(new Error('Session invalid, removing from localStorage'), {
            component: 'AuthProviderWrapper',
            action: 'fetchUserProfile',
            metadata: { status: profileResponse.status },
          });
          removeSession();
          dispatch.auth(authActions.authenticationFailed());
          return;
        }

        let userData: IUser;
        try {
          userData = await profileResponse.json();
        } catch (parseError) {
          handleError(parseError, {
            component: 'AuthProviderWrapper',
            action: 'fetchUserProfile',
            metadata: { step: 'parseResponse' },
          });
          removeSession();
          dispatch.auth(authActions.authenticationFailed());
          return;
        }

        // Validate required user data fields
        const userId = userData._id || userData.id;
        if (!userId || typeof userId !== 'string') {
          handleError(new Error('User data missing required ID field'), {
            component: 'AuthProviderWrapper',
            action: 'fetchUserProfile',
            metadata: { step: 'validateUserData' },
          });
          removeSession();
          dispatch.auth(authActions.authenticationFailed());
          return;
        }

        if (!userData.email || typeof userData.email !== 'string') {
          handleError(new Error('User data missing required email field'), {
            component: 'AuthProviderWrapper',
            action: 'fetchUserProfile',
            metadata: { step: 'validateUserData' },
          });
          removeSession();
          dispatch.auth(authActions.authenticationFailed());
          return;
        }

        // Map IUser to AuthUser with validated data
        const authUser: AuthUser = {
          id: userId,
          name: userData.name || '',
          org: orgId,
          email: userData.email,
          emailVerified: true,
          clientId: osState.auth?.clientId || '',
          role: userData.role || '',
          image: userData.image,
        };

        // Create session with fresh user data
        const session = createSession(authUser, sessionId);

        // Dispatch setSession to update state (sessionId already in localStorage)
        dispatch.auth(authActions.setSession(session));
      } catch (error) {
        handleError(error, {
          component: 'AuthProviderWrapper',
          action: 'fetchUserProfile',
          metadata: { step: 'pageLoad' },
        });
        // Remove invalid session
        removeSession();
        dispatch.auth(authActions.authenticationFailed());
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, dispatch, osState]);

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
