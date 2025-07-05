import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultApiClient } from '../../lib/api-client';
import { AuthResponse, AuthSession, AuthState, AuthStatus, AuthUser } from './types';
import {
  createSession,
  getTokenFromUrl,
  loadUserFromCookies,
  removeCredentials,
  removeTokenFromUrl,
  saveCredentials,
} from './utils';
import { useSaaSOS } from '../contextProvider';

export function useSaaSAuth() {
  const { context } = useSaaSOS();
  const serverUrl = context.getServerUrl();
  const auth = context.getAuth();
  const orgId = context.getOrgId();
  const clientId = auth?.clientId;
  const redirectUrl = auth?.redirectUrl;

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isRedirecting: false,
  });

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  useEffect(() => {
    if (!isBrowser) {
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      return;
    }

    const loadUser = () => {
      const { user, session } = loadUserFromCookies();
      if (user && session) {
        setState({
          user,
          session,
          isLoading: false,
          isAuthenticated: true,
          isRedirecting: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    };

    loadUser();
  }, [isBrowser]);

  const saveUser = useCallback(
    (user: AuthUser, session: AuthSession) => {
      if (!isBrowser) return;
      saveCredentials(user, session);
    },
    [isBrowser]
  );

  // Clear user from localStorage
  const clearUser = useCallback(() => {
    if (!isBrowser) return;

    removeCredentials();

    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      isRedirecting: false,
    });
  }, [isBrowser]);

  // Login function
  const signIn = useCallback(async () => {
    setState(prev => ({ ...prev, isRedirecting: true }));

    try {
      const response = await defaultApiClient.post<AuthResponse>(
        `${serverUrl}/api/v1/auth/request`,
        {
          orgId: orgId,
          clientId: clientId,
          redirect: {
            success: redirectUrl,
            error: redirectUrl,
          },
        }
      );

      if (response.data.success) {
        window.location.href = response.data.data.redirectUrl;
      } else {
        setState(prev => ({ ...prev, isRedirecting: false, isAuthenticated: false }));
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (error) {
      setState(prev => ({ ...prev, isRedirecting: false }));
      console.error('Sign in error:', error);
      throw error;
    }
  }, [serverUrl, orgId, clientId, redirectUrl]);

  // Logout function
  const signOut = useCallback(async () => {
    try {
      // Call logout endpoint if available
      if (state.session?.accessToken) {
        await defaultApiClient.post(`${serverUrl}/api/v1/auth/logout`, {
          token: state.session.accessToken,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearUser();
    }
  }, [state.session, serverUrl, clearUser]);

  // Handle auth redirect (called after successful authentication)
  const handleAuthRedirect = useCallback(
    async (token: string) => {
      try {
        // Verify token and get user info
        const response = await defaultApiClient.get<{ user: AuthUser }>(
          `${serverUrl}/api/v1/auth/verify`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const user = response.data.user;
        const session = createSession(user, token, 24);

        saveUser(user, session);
        setState({
          user,
          session,
          isLoading: false,
          isAuthenticated: true,
          isRedirecting: false,
        });
      } catch (error) {
        console.error('Auth redirect error:', error);
        clearUser();
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    },
    [serverUrl, saveUser, clearUser]
  );

  useEffect(() => {
    const token = getTokenFromUrl();
    if (token) {
      try {
        const user = jwtDecode<AuthUser>(token);
        if (user) {
          const session = createSession(user, token, 72);
          saveUser(user, session);
          setState({
            user,
            session,
            isLoading: false,
            isAuthenticated: true,
            isRedirecting: false,
          });
          removeTokenFromUrl();
        }
      } catch (e) {
        console.error('Error processing token from URL:', e);
      }
    }
  }, []);

  // Computed values
  const status: AuthStatus = useMemo(() => {
    if (state.isLoading) return 'loading';
    return state.isAuthenticated ? 'authenticated' : 'unauthenticated';
  }, [state.isLoading, state.isAuthenticated]);

  return {
    // State
    user: state.user,
    session: state.session,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    isRedirecting: state.isRedirecting,
    status,

    // Actions
    signIn,
    signOut,
    handleAuthRedirect,
  };
}
