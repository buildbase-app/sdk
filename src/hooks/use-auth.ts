import { useState, useEffect, useCallback, useMemo } from 'react';
import { defaultApiClient } from '../lib/api-client';
import { jwtDecode } from 'jwt-decode';
import {
  AuthConfig,
  AuthUser,
  AuthSession,
  AuthState,
  AuthStatus,
  AuthResponse,
} from '../components/auth/types';
import { useSaaSOS } from '../providers/ContextProvider';

const TOKEN_PARAM = 'token';

const AUTH_USER_KEY = 'saas_os_auth_user';
const AUTH_SESSION_KEY = 'saas_os_auth_session';
const AUTH_TOKEN_KEY = 'saas_os_auth_token';

export interface UseAuthOptions {
  config: AuthConfig;
  onAuthStateChange?: (user: AuthUser | null) => void;
}

function saveCredentials(user: AuthUser, session: AuthSession) {
  // make it secure
  document.cookie = `${AUTH_USER_KEY}=${JSON.stringify(user)}; path=/; secure;`;
  document.cookie = `${AUTH_SESSION_KEY}=${JSON.stringify(session)}; path=/; secure;`;
  document.cookie = `${AUTH_TOKEN_KEY}=${session.accessToken}; path=/; secure;`;
}

function removeCredentials() {
  document.cookie = `${AUTH_USER_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
  document.cookie = `${AUTH_SESSION_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
  document.cookie = `${AUTH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
}

export function useAuth() {
  const { context } = useSaaSOS();

  const serverUrl = context?.getServerUrl();
  const auth = context?.getAuth();
  const orgId = context?.getOrgId();
  const clientId = auth?.clientId;
  const redirectUrl = auth?.redirectUrl;

  const onAuthStateChange = auth?.onAuthStateChange;

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
      try {
        const cookies = document.cookie.split(';').map(cookie => cookie.trim());
        const userStr = cookies.find(cookie => cookie.includes(AUTH_USER_KEY));
        const sessionStr = cookies.find(cookie => cookie.includes(AUTH_SESSION_KEY));
        const tokenStr = cookies.find(cookie => cookie.includes(AUTH_TOKEN_KEY));
        if (userStr && sessionStr && tokenStr) {
          const user: AuthUser = JSON.parse(userStr.split('=')[1]);
          const session: AuthSession = JSON.parse(sessionStr.split('=')[1]);
          // Check if session is expired
          if (new Date(session.expires) > new Date()) {
            setState({
              user,
              session,
              isLoading: false,
              isAuthenticated: true,
              isRedirecting: false,
            });
            onAuthStateChange?.(user);
            return;
          } else {
            // Session expired, clear storage
            removeCredentials();
            onAuthStateChange?.(null);
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        // Clear corrupted data
        removeCredentials();
        onAuthStateChange?.(null);
      }
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
    };

    loadUser();
  }, [isBrowser, onAuthStateChange]);

  const saveUser = useCallback(
    (user: AuthUser, session: AuthSession) => {
      if (!isBrowser) return;
      saveCredentials(user, session);
      onAuthStateChange?.(user);
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

    onAuthStateChange?.(null);
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
  }, [state.session, serverUrl, clearUser, onAuthStateChange]);

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
        const session: AuthSession = {
          user,
          accessToken: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };

        saveUser(user, session);
        setState({
          user,
          session,
          isLoading: false,
          isAuthenticated: true,
          isRedirecting: false,
        });
        onAuthStateChange?.(user);
      } catch (error) {
        console.error('Auth redirect error:', error);
        clearUser();
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    },
    [serverUrl, saveUser, clearUser, onAuthStateChange]
  );

  useEffect(() => {
    const href = window.location.href;
    let url = null;
    try {
      url = new URL(href);
      const token = url.searchParams.get(TOKEN_PARAM);
      if (token) {
        const user = jwtDecode<AuthUser>(token);
        if (user) {
          const session: AuthSession = {
            user,
            accessToken: token,
            expires: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
          };
          saveUser(user, session);
          setState({
            user,
            session,
            isLoading: false,
            isAuthenticated: true,
            isRedirecting: false,
          });
          // REMOVE THE TOKEN FROM THE URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete(TOKEN_PARAM);
          window.history.replaceState({}, '', newUrl.toString());
        }
      }
    } catch (e) {}
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
