export enum AuthStatus {
  loading = 'loading',
  authenticated = 'authenticated',
  unauthenticated = 'unauthenticated',
  authenticating = 'authenticating',
}

export interface AuthUser {
  id: string;
  name: string;
  org: string;
  email: string;
  emailVerified: boolean;
  clientId: string;
  role: string;
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
