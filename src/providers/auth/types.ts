import type { EventData, EventType } from '../events/types';
import type { IWorkspace } from '../workspace/types';

export enum AuthStatus {
  loading = 'loading',
  redirecting = 'redirecting',
  authenticated = 'authenticated',
  unauthenticated = 'unauthenticated',
  authenticating = 'authenticating',
}

/** Derive booleans from status (single source of truth) */
export function getAuthFlags(status: AuthStatus) {
  return {
    isAuthenticated: status === AuthStatus.authenticated,
    isLoading:
      status === AuthStatus.loading ||
      status === AuthStatus.redirecting ||
      status === AuthStatus.authenticating,
    isRedirecting: status === AuthStatus.redirecting,
  };
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

// Define a type for the slice state (status is the single source of truth; flags are derived)
export interface IAuthState {
  session: AuthSession | null;
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
  /**
   * Called before switching workspace (e.g. generate token, save state).
   * Used when user clicks "Switch to" and when restoring from storage on page refresh.
   * Switch proceeds only when this resolves; reject to abort.
   */
  onWorkspaceChange?: (params: OnWorkspaceChangeParams) => Promise<void>;
}

export interface OnWorkspaceChangeParams {
  workspace: IWorkspace;
  user: AuthUser | null;
  role: string | null;
}
