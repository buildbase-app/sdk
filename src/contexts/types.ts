import type { Dispatch } from 'react';
import type { AuthSession, IAuthState } from '../providers/auth/types';
import type { IOsState } from '../providers/os/types';
import type { IWorkspace, IWorkspaceFeature } from '../providers/workspace/types';

// ============================================================================
// Auth Context Types
// ============================================================================

export type AuthAction =
  | { type: 'AUTHENTICATION_STARTED' }
  | { type: 'AUTHENTICATION_FAILED' }
  | { type: 'SET_SESSION'; payload: AuthSession }
  | { type: 'REMOVE_SESSION' };

export interface AuthContextValue {
  state: IAuthState;
  dispatch: Dispatch<AuthAction>;
}

// ============================================================================
// Workspace Context Types
// ============================================================================

export type WorkspaceAction =
  | { type: 'SET_WORKSPACES'; payload: IWorkspace[] }
  | { type: 'SET_ALL_FEATURES'; payload: IWorkspaceFeature[] }
  | { type: 'SET_CURRENT_WORKSPACE'; payload: IWorkspace }
  | { type: 'RESET_CURRENT_WORKSPACE' }
  | { type: 'SET_IS_INITIALIZED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_SWITCHING'; payload: boolean };

export interface WorkspaceState {
  workspaces: IWorkspace[];
  loading: boolean;
  error: string | null;
  currentWorkspace: IWorkspace | null;
  refreshing: boolean;
  switching: boolean;
  isInitialized: boolean;
  allFeatures: IWorkspaceFeature[];
}

export interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
}

// ============================================================================
// OS Context Types
// ============================================================================

export type OSAction =
  | { type: 'SET_SAAS_OS_CONFIG'; payload: IOsState }
  | { type: 'REMOVE_SAAS_OS_CONFIG' };

export interface OSContextValue {
  state: IOsState;
  dispatch: Dispatch<OSAction>;
}

// ============================================================================
// Combined Context Types
// ============================================================================

export interface SDKContextValue {
  auth: AuthContextValue;
  workspace: WorkspaceContextValue;
  os: OSContextValue;
}
