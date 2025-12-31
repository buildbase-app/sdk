'use client';

import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { IUser } from '../../api/types';
import { authActions, useAppDispatch, useAppSelector } from '../../contexts';
import type { AuthUser } from './types';
import { IAuthCallbacks } from './types';
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
  // Only select what we need to minimize re-renders
  const authState = useAppSelector(state => state.auth);
  const osState = useAppSelector(state => state.os);

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

          // Map IUser to AuthUser
          const authUser: AuthUser = {
            id: userData._id || userData.id,
            name: userData.name || '',
            org: orgId,
            email: userData.email || '',
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
        console.error('Auth redirect error:', error);
        dispatch.auth(authActions.authenticationFailed());
        throw error;
      }
    },
    [dispatch, memoizedCallbacks, osState]
  );

  // Hydrate session from localStorage on client side (prevents SSR hydration mismatch)
  // Only sessionId is stored, so we fetch fresh user data on page load
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if we already have a session in state (from URL token or already loaded)
    if (authState.isAuthenticated) return;

    // Get sessionId from localStorage
    const sessionId = getSessionId();
    if (!sessionId) {
      return;
    }

    // Fetch fresh user data using the sessionId
    const fetchUserProfile = async () => {
      try {
        const { serverUrl, version, orgId } = osState;
        if (!serverUrl || !version || !orgId) {
          console.warn('OS configuration not available, cannot fetch user profile');
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
          console.warn('Session invalid, removing from localStorage');
          removeSession();
          return;
        }

        let userData: IUser;
        try {
          userData = await profileResponse.json();
        } catch (parseError) {
          console.error('Failed to parse user profile response:', parseError);
          removeSession();
          return;
        }

        // Map IUser to AuthUser
        const authUser: AuthUser = {
          id: userData._id || userData.id,
          name: userData.name || '',
          org: orgId,
          email: userData.email || '',
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
        console.error('Failed to fetch user profile on page load:', error);
        // Remove invalid session
        removeSession();
      }
    };

    fetchUserProfile();
  }, [authState.isAuthenticated, dispatch, osState]); // Include dependencies

  // Handle code from URL
  useEffect(() => {
    const code = getTokenFromUrl();
    if (!code) {
      return;
    }
    handleAuthRedirect(code).catch(error => {
      // Error is already handled in handleAuthRedirect
      console.error('Failed to handle auth redirect:', error);
    });
  }, [handleAuthRedirect]);

  // WorkspaceProvider is already in SDKContextProvider, so we don't need to wrap here
  // Just return children - the context providers handle the state management
  return <>{children}</>;
});

AuthProviderWrapper.displayName = 'AuthProviderWrapper';

// Export AuthProvider for backward compatibility
export const AuthProvider = AuthProviderWrapper;
