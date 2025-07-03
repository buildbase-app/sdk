export interface AuthConfig {
  auth: {
    server_url: string;
    org_id: string;
    client_id: string;
  };
  api_url: string;
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
