'use client';

import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { authActions, useAppDispatch } from '../../contexts';
import { handleError, handleErrorUnlessAborted } from '../../lib/error-handler';
import { useAsyncEffect } from '../../lib/useAsyncEffect';
import { useSaaSOs } from '../os/hooks';
import { isOsConfigReady } from '../os/types';
import { AuthApi } from './api';
import { useAuthState } from './hooks';
import { getAuthFlags, IAuthCallbacks } from './types';
import {
  createSession,
  getTokenFromUrl,
  mapIUserToAuthUser,
  removeTokenFromUrl,
  setSessionId,
} from './utils';

interface IProps {
  children: ReactNode;
  callbacks?: IAuthCallbacks;
}

// Module-level guards — shared across all renders/remounts.
// Prevents duplicate session hydration and profile fetches.
let _sessionHydrationDone = false;
let _sessionHydrationInFlight: Promise<void> | null = null;

/**
 * AuthProvider — next-auth style session management.
 *
 * Session token lives in an httpOnly cookie (set by your server).
 * Session data lives in-memory (React context) only — no localStorage.
 * On page refresh, the `getSession` callback fetches the sessionId from your server.
 */
export const AuthProviderWrapper = React.memo(({ children, callbacks }: IProps) => {
  const dispatch = useAppDispatch();
  const authState = useAuthState();
  const osState = useSaaSOs();
  const isAuthenticated = getAuthFlags(authState.status).isAuthenticated;

  const processingAuthRedirectRef = React.useRef(false);
  const processedCodeRef = React.useRef<string | null>(null);

  const memoizedCallbacks = useMemo(() => callbacks, [callbacks]);

  const handleAuthRedirect = useCallback(
    async (code: string) => {
      try {
        if (memoizedCallbacks?.handleAuthentication) {
          const { sessionId } = await memoizedCallbacks.handleAuthentication(code);

          if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            throw new Error('Invalid sessionId received from authentication callback');
          }

          const currentOsState = osState;
          if (!isOsConfigReady(currentOsState)) {
            throw new Error('OS configuration is not available');
          }
          const { serverUrl, version, orgId } = currentOsState;

          const authApi = new AuthApi({ serverUrl, version });
          const userData = await authApi.getProfile(sessionId);
          const authUser = mapIUserToAuthUser(userData, orgId, currentOsState.auth?.clientId || '');
          const session = createSession(authUser, sessionId);

          // Store in localStorage for client-side API calls (x-session-id header)
          setSessionId(session.sessionId);
          dispatch.auth(authActions.setSession(session));
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
   * Session hydration on page refresh.
   *
   * Like next-auth's SessionProvider:
   * 1. Call `getSession()` callback to get sessionId (reads httpOnly cookie via server endpoint).
   * 2. Fetch user profile with that sessionId to verify + get user data.
   * 3. If valid → set session in context. If invalid → unauthenticated.
   *
   * No localStorage read. The httpOnly cookie is the single source of truth.
   */
  useAsyncEffect(
    async signal => {
      if (typeof window === 'undefined') return;
      if (isAuthenticated) return;
      if (_sessionHydrationDone) return;
      if (_sessionHydrationInFlight) return;
      if (!isOsConfigReady(osState)) return;

      const code = getTokenFromUrl();
      if (code) return;

      if (!memoizedCallbacks?.getSession) {
        _sessionHydrationDone = true;
        dispatch.auth(authActions.authenticationFailed());
        return;
      }

      // Single in-flight promise — prevents concurrent calls from StrictMode/remounts
      _sessionHydrationInFlight = (async () => {
        let sessionId: string | null = null;
        try {
          sessionId = await memoizedCallbacks.getSession();
        } catch (err) {
          handleError(err, {
            component: 'AuthProviderWrapper',
            action: 'getSession',
          });
        }

        if (!sessionId) {
          _sessionHydrationDone = true;
          dispatch.auth(authActions.authenticationFailed());
          return;
        }

        try {
          const { orgId } = osState;
          const authApi = new AuthApi({ serverUrl: osState.serverUrl, version: osState.version });
          const userData = await authApi.getProfile(sessionId, signal);
          const authUser = mapIUserToAuthUser(userData, orgId, osState.auth?.clientId || '');
          const session = createSession(authUser, sessionId);

          setSessionId(session.sessionId);
          _sessionHydrationDone = true;
          dispatch.auth(authActions.setSession(session));
        } catch (error) {
          if (
            !handleErrorUnlessAborted(error, {
              component: 'AuthProviderWrapper',
              action: 'fetchUserProfile',
            })
          )
            return;
          _sessionHydrationDone = true;
          dispatch.auth(authActions.authenticationFailed());
        } finally {
          _sessionHydrationInFlight = null;
        }
      })();
    },
    [dispatch, osState]
  );

  /**
   * Handle OAuth redirect: user returns with ?code=... in URL.
   */
  useEffect(() => {
    const code = getTokenFromUrl();
    if (!code) return;

    if (processingAuthRedirectRef.current || processedCodeRef.current === code) return;
    if (!isOsConfigReady(osState)) return;

    processingAuthRedirectRef.current = true;
    processedCodeRef.current = code;

    let cancelled = false;

    dispatch.auth(authActions.authenticationProcessing());

    handleAuthRedirect(code)
      .then(() => {
        if (cancelled) return;
        processedCodeRef.current = null;
      })
      .catch(error => {
        if (cancelled) return;
        handleError(error, {
          component: 'AuthProviderWrapper',
          action: 'handleAuthRedirectEffect',
          metadata: { hasCode: true },
        });
        processedCodeRef.current = null;
      })
      .finally(() => {
        processingAuthRedirectRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [handleAuthRedirect, osState.serverUrl, osState.version, osState.orgId]);

  return <>{children}</>;
});

AuthProviderWrapper.displayName = 'AuthProviderWrapper';
export const AuthProvider = AuthProviderWrapper;
