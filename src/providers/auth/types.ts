export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'authenticating';

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

// Define a type for the slice state
export interface IAuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRedirecting: boolean;
  status: AuthStatus;
}

export interface IAuthConfig {
  clientId: string;
  redirectUrl: string;
  callbacks?: IAuthCallbacks;
}

export interface IAuthCallbacks {
  handleAuthentication: (token: string) => Promise<void>;
  verifyToken: (token: string) => Promise<boolean>;
}
