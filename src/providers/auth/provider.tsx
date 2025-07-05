import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { defaultApiClient } from '../../lib/api-client';
import { AuthConfig, AuthSession, AuthUser } from './types';
import { createSession, loadUserFromCookies, removeCredentials, saveCredentials } from './utils';

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRedirecting: boolean;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  handleAuthRedirect: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  config: AuthConfig;
  onAuthStateChange?: (user: AuthUser | null) => void;
}

export function AuthProvider({ children, config, onAuthStateChange }: AuthProviderProps) {
  const [state, setState] = useState({
    user: null as AuthUser | null,
    session: null as any,
    isLoading: true,
    isAuthenticated: false,
    isRedirecting: false,
  });

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
        onAuthStateChange?.(user);
      } else {
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
        onAuthStateChange?.(null);
      }
    };

    loadUser();
  }, [isBrowser, onAuthStateChange]);

  const saveUser = useCallback(
    (user: AuthUser, session: AuthSession) => {
      if (!isBrowser) return;
      saveCredentials(user, session);
      onAuthStateChange?.(user);
    },
    [isBrowser, onAuthStateChange]
  );

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
  }, [isBrowser, onAuthStateChange]);

  const signIn = useCallback(async () => {
    setState(prev => ({ ...prev, isRedirecting: true }));
    try {
      const response = await defaultApiClient.post(`${config.apiUrl}/api/v1/auth/request`, {
        orgId: config.auth.orgId,
        clientId: config.auth.clientId,
        redirect: {
          success: config.auth.redirectUrl || window.location.href,
          error: config.auth.redirectUrl || window.location.href,
        },
      });

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
  }, [config]);

  const signOut = useCallback(async () => {
    try {
      if (state.session?.accessToken) {
        await defaultApiClient.post(`${config.apiUrl}/api/v1/auth/logout`, {
          token: state.session.accessToken,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearUser();
    }
  }, [state.session, config.apiUrl, clearUser]);

  const handleAuthRedirect = useCallback(
    async (token: string) => {
      try {
        const response = await defaultApiClient.get(`${config.apiUrl}/api/v1/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

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
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
        throw error;
      }
    },
    [config.apiUrl, saveUser]
  );

  const authValue: AuthContextType = {
    ...state,
    status: state.isLoading
      ? 'loading'
      : state.isAuthenticated
        ? 'authenticated'
        : 'unauthenticated',
    signIn,
    signOut,
    handleAuthRedirect,
  };

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
