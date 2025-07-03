import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/use-auth';
import { AuthConfig, AuthUser } from '../components/auth/types';

interface AuthContextType {
  user: AuthUser | null;
  session: any;
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
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
