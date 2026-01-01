import type { EventData, EventType } from '../events/types';

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
  sessionId: string;
  expires: string;
}

// Define a type for the slice state
export interface IAuthState {
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
  handleAuthentication: (code: string) => Promise<{
    sessionId: string;
  }>;
  onSignOut: () => Promise<void>;
  /**
   * Event handler for User and Workspace events
   * @param eventType - The type of event that occurred
   * @param data - The event data (type varies based on eventType)
   */
  handleEvent?: (eventType: EventType, data: EventData) => void | Promise<void>;
}
