/**
 * Action creators for Context API
 * These functions create actions for use with Context API reducers
 */

import type { AuthSession } from '../providers/auth/types';
import type { IOsState } from '../providers/os/types';
import type { IWorkspace, IWorkspaceFeature } from '../providers/workspace/types';
import type { AuthAction, OSAction, WorkspaceAction } from './types';

// ============================================================================
// Auth Actions
// ============================================================================

export const authActions = {
  authenticationStarted: (): AuthAction => ({
    type: 'AUTHENTICATION_STARTED',
  }),

  authenticationFailed: (): AuthAction => ({
    type: 'AUTHENTICATION_FAILED',
  }),

  setSession: (session: AuthSession): AuthAction => ({
    type: 'SET_SESSION',
    payload: session,
  }),

  removeSession: (): AuthAction => ({
    type: 'REMOVE_SESSION',
  }),
};

// ============================================================================
// Workspace Actions
// ============================================================================

export const workspaceActions = {
  setWorkspaces: (workspaces: IWorkspace[]): WorkspaceAction => ({
    type: 'SET_WORKSPACES',
    payload: workspaces,
  }),

  setAllFeatures: (features: IWorkspaceFeature[]): WorkspaceAction => ({
    type: 'SET_ALL_FEATURES',
    payload: features,
  }),

  setCurrentWorkspace: (workspace: IWorkspace): WorkspaceAction => ({
    type: 'SET_CURRENT_WORKSPACE',
    payload: workspace,
  }),

  resetCurrentWorkspace: (): WorkspaceAction => ({
    type: 'RESET_CURRENT_WORKSPACE',
  }),

  setIsInitialized: (isInitialized: boolean): WorkspaceAction => ({
    type: 'SET_IS_INITIALIZED',
    payload: isInitialized,
  }),

  setLoading: (loading: boolean): WorkspaceAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),

  setError: (error: string | null): WorkspaceAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),

  setRefreshing: (refreshing: boolean): WorkspaceAction => ({
    type: 'SET_REFRESHING',
    payload: refreshing,
  }),

  setSwitching: (switching: boolean): WorkspaceAction => ({
    type: 'SET_SWITCHING',
    payload: switching,
  }),
};

// ============================================================================
// OS Actions
// ============================================================================

export const osActions = {
  setSaaSOSConfig: (config: IOsState): OSAction => ({
    type: 'SET_SAAS_OS_CONFIG',
    payload: config,
  }),

  removeSaaSOSConfig: (): OSAction => ({
    type: 'REMOVE_SAAS_OS_CONFIG',
  }),
};
