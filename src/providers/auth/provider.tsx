import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { defaultApiClient } from '../../lib/api-client';
import { AuthConfig, AuthSession, AuthUser } from './types';
import { createSession, loadUserFromCookies, removeCredentials, saveCredentials } from './utils';
import { WorkspaceProvider } from '../workspace/provider';
import { workspaceStorage } from '../workspace/utils';

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
}

export function AuthProvider({ children, config }: AuthProviderProps) {
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
      const { session } = loadUserFromCookies();
      if (session) {
        setState({
          user: session.user,
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
    (session: AuthSession) => {
      if (!isBrowser) return;
      saveCredentials(session);
    },
    [isBrowser]
  );

  const clearUser = useCallback(() => {
    if (!isBrowser) return;
    removeCredentials();
    workspaceStorage.clearCurrentWorkspace();
    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      isRedirecting: false,
    });
  }, [isBrowser]);

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
      clearUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [clearUser]);

  const handleAuthRedirect = useCallback(
    async (token: string) => {
      try {
        const response = await defaultApiClient.get(`${config.apiUrl}/api/v1/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = response.data.user;
        const session = createSession(user, token, 24);

        saveUser(session);
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

  return (
    <AuthContext.Provider value={authValue}>
      {authValue.isAuthenticated && <WorkspaceProvider>{children}</WorkspaceProvider>}
      {!authValue.isAuthenticated && children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
