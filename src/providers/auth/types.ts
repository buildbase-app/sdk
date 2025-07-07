export interface AuthConfig {
  auth: {
    serverUrl: string;
    orgId: string;
    clientId: string;
    redirectUrl?: string;
    handleAuthentication: (token: string) => Promise<void>;
    verifyToken: (token: string) => Promise<boolean>;
  };
  apiUrl: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expires: string;
}

export interface AuthRequestData {
  orgId: string;
  clientId: string;
  redirect: {
    success: string;
    error: string;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    redirectUrl: string;
  };
  message?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRedirecting: boolean;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
