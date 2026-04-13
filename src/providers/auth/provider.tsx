'use client';

import React, { ReactNode, useCallback, useEffect } from 'react';
import { authActions, useAppDispatch } from '../../contexts';
import { handleError, handleErrorUnlessAborted } from '../../lib/error-handler';
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

  // Reset module-level hydration guard when the provider mounts fresh
  // (handles hot reload and navigation remounts)
  React.useEffect(() => {
    if (!isAuthenticated) {
      _sessionHydrationDone = false;
      _sessionHydrationInFlight = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const handleAuthRedirect = useCallback(
    async (code: string) => {
      try {
        if (callbacks?.handleAuthentication) {
          const { sessionId } = await callbacks.handleAuthentication(code);

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
    [dispatch, callbacks, osState]
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
  // Session hydration — runs once on mount when OS config is ready.
  // Does NOT use useAsyncEffect's signal because the hydration must survive
  // StrictMode unmount/remount cycles (signal would be aborted).
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthenticated) return;
    if (_sessionHydrationDone) return;
    if (_sessionHydrationInFlight) return;
    if (!isOsConfigReady(osState)) return;

    const code = getTokenFromUrl();
    if (code) return;

    if (!callbacks?.getSession) {
      _sessionHydrationDone = true;
      dispatch.auth(authActions.authenticationFailed());
      return;
    }

    const getSessionFn = callbacks.getSession;
    const { serverUrl, version, orgId } = osState;
    const clientId = osState.auth?.clientId || '';

    _sessionHydrationInFlight = (async () => {
      let sessionId: string | null = null;
      try {
        sessionId = await getSessionFn();
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
        const authApi = new AuthApi({ serverUrl, version });
        const userData = await authApi.getProfile(sessionId);
        const authUser = mapIUserToAuthUser(userData, orgId, clientId);
        const session = createSession(authUser, sessionId);

        setSessionId(session.sessionId);
        _sessionHydrationDone = true;
        dispatch.auth(authActions.setSession(session));
      } catch (error) {
        handleError(error, {
          component: 'AuthProviderWrapper',
          action: 'fetchUserProfile',
        });
        _sessionHydrationDone = true;
        dispatch.auth(authActions.authenticationFailed());
      } finally {
        _sessionHydrationInFlight = null;
      }
    })();
  }, [isAuthenticated, dispatch, osState, callbacks]); // eslint-disable-line react-hooks/exhaustive-deps

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
