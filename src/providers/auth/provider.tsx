'use client';

import React, { ReactNode, useCallback, useEffect } from 'react';
import { authActions, useAppDispatch } from '../../contexts';
import { consumeAuthIntent, saveAuthIntent } from '../../lib/auth-intent';
import { handleError } from '../../lib/error-handler';
import { safeRedirect } from '../../lib/security';
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

/**
 * AuthProvider — next-auth style session management.
 *
 * The `getSession` callback (e.g. reading httpOnly cookie via server endpoint) is the
 * source of truth for hydration. The returned sessionId is stored in localStorage for
 * subsequent API calls (x-session-id header). Session user data lives in React context.
 */
export const AuthProviderWrapper = React.memo(({ children, callbacks }: IProps) => {
  const dispatch = useAppDispatch();
  const authState = useAuthState();
  const osState = useSaaSOs();
  const isAuthenticated = getAuthFlags(authState.status).isAuthenticated;

  const processingAuthRedirectRef = React.useRef(false);
  const processedCodeRef = React.useRef<string | null>(null);

  // Component-scoped hydration guards — avoids stale state across
  // unmount/remount cycles (e.g. Next.js navigation, StrictMode).
  const hydrationDoneRef = React.useRef(false);
  const hydrationInFlightRef = React.useRef<Promise<void> | null>(null);

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

          // Redirect to the URL the user was on before login (if saved)
          const returnUrl = consumeAuthIntent();
          if (returnUrl && returnUrl !== window.location.href) {
            safeRedirect(returnUrl);
          }
        }
      } catch (error) {
        // Clear stale auth intent so next login doesn't redirect to wrong page
        consumeAuthIntent();
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
   * 3. If valid → store sessionId in localStorage (for API auth headers) and set session in context.
   *    If invalid → unauthenticated, call onSessionExpired.
   */
  // Session hydration — runs once on mount when OS config is ready.
  // Does NOT use useAsyncEffect's signal because the hydration must survive
  // StrictMode unmount/remount cycles (signal would be aborted).
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthenticated) return;
    if (hydrationDoneRef.current) return;
    if (hydrationInFlightRef.current) return;
    if (!isOsConfigReady(osState)) return;

    const code = getTokenFromUrl();
    if (code) return;

    if (!callbacks?.getSession) {
      hydrationDoneRef.current = true;
      dispatch.auth(authActions.authenticationFailed());
      return;
    }

    const getSessionFn = callbacks.getSession;
    const { serverUrl, version, orgId } = osState;
    const clientId = osState.auth?.clientId || '';

    hydrationInFlightRef.current = (async () => {
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
        hydrationDoneRef.current = true;
        dispatch.auth(authActions.authenticationFailed());
        // Save current URL so user returns here after re-login
        if (typeof window !== 'undefined') saveAuthIntent(window.location.href);
        callbacks?.onSessionExpired?.('missing');
        return;
      }

      try {
        const authApi = new AuthApi({ serverUrl, version });
        const userData = await authApi.getProfile(sessionId);
        const authUser = mapIUserToAuthUser(userData, orgId, clientId);
        const session = createSession(authUser, sessionId);

        setSessionId(session.sessionId);
        hydrationDoneRef.current = true;
        dispatch.auth(authActions.setSession(session));

        // Redirect to the URL the user was on before login (if saved)
        const returnUrl = consumeAuthIntent();
        if (returnUrl && returnUrl !== window.location.href) {
          safeRedirect(returnUrl);
        }
      } catch (error) {
        handleError(error, {
          component: 'AuthProviderWrapper',
          action: 'fetchUserProfile',
        });
        hydrationDoneRef.current = true;
        dispatch.auth(authActions.authenticationFailed());
        // Session exists but profile fetch failed — session is invalid/expired
        // Save current URL so user returns here after re-login
        if (typeof window !== 'undefined') saveAuthIntent(window.location.href);
        callbacks?.onSessionExpired?.('expired');
      } finally {
        hydrationInFlightRef.current = null;
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
