'use client';

import { jwtDecode } from 'jwt-decode';
import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../contexts';
import { authActions, AUTH_TOKEN_KEY } from '../../contexts';
import { getStorageJSON } from '../../contexts/shared/utils/storage';
import type { AuthSession } from './types';
import { AuthUser, IAuthCallbacks } from './types';
import { createSession, getTokenFromUrl, removeTokenFromUrl } from './utils';

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
  const serverUrl = useAppSelector(state => state.os.serverUrl);

  // Memoize callbacks to prevent unnecessary re-renders
  const memoizedCallbacks = useMemo(() => callbacks, [callbacks]);

  const handleAuthRedirect = useCallback(
    async (token: string) => {
      try {
        // TODO handle the auth code here so when we make it more secure and authenticate use code with token and server identity
        // const response = await defaultApiClient.get(`${serverUrl}/api/v1/auth/verify`, {
        //   headers: { Authorization: `Bearer ${token}` },
        // });
        // const user = response.data.user;
        const user = jwtDecode(token) as AuthUser;
        const session = createSession(user, token, 24);
        dispatch.auth(authActions.setSession(session));
        if (memoizedCallbacks?.verifyToken) {
          const isValid = await memoizedCallbacks.verifyToken(token);
          if (!isValid) {
            dispatch.auth(authActions.authenticationFailed());
            return;
          }
          if (memoizedCallbacks?.handleAuthentication) {
            await memoizedCallbacks.handleAuthentication(token);
          }
        }
        removeTokenFromUrl();
      } catch (error) {
        console.error('Auth redirect error:', error);
        dispatch.auth(authActions.authenticationFailed());
        throw error;
      }
    },
    [serverUrl, dispatch, memoizedCallbacks]
  );

  // Hydrate session from localStorage on client side (prevents SSR hydration mismatch)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if we already have a session in state (from URL token)
    if (authState.isAuthenticated) return;

    // Try to load session from localStorage
    try {
      const session = getStorageJSON<AuthSession>(AUTH_TOKEN_KEY);
      if (session) {
        // Check if session is expired
        if (new Date(session.expires) > new Date()) {
          dispatch.auth(authActions.setSession(session));
        }
      }
    } catch (error) {
      console.error('Failed to hydrate session from localStorage:', error);
    }
  }, []); // Only run once on mount

  // Handle token from URL
  useEffect(() => {
    const token = getTokenFromUrl();
    if (!token) {
      return;
    }
    handleAuthRedirect(token).catch(error => {
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
