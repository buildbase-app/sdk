/**
 * Workspace action creators
 */

import type { IWorkspace, IWorkspaceFeature } from '../../providers/workspace/types';
import type { WorkspaceAction } from './types';

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

