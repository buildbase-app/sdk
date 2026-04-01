import type { Dispatch } from 'react';
import type { IWorkspace, IWorkspaceFeature } from '../../providers/workspace/types';

export type WorkspaceAction =
  | { type: 'SET_WORKSPACES'; payload: IWorkspace[] }
  | { type: 'ADD_WORKSPACE'; payload: IWorkspace }
  | { type: 'UPDATE_WORKSPACE'; payload: IWorkspace }
  | { type: 'REMOVE_WORKSPACE'; payload: string }
  | { type: 'SET_ALL_FEATURES'; payload: IWorkspaceFeature[] }
  | { type: 'SET_CURRENT_WORKSPACE'; payload: IWorkspace }
  | { type: 'RESET_CURRENT_WORKSPACE' }
  | { type: 'SET_IS_INITIALIZED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_SWITCHING_TO_ID'; payload: string | null };

export interface WorkspaceState {
  workspaces: IWorkspace[];
  loading: boolean;
  error: string | null;
  currentWorkspace: IWorkspace | null;
  refreshing: boolean;
  switchingToId: string | null;
  isInitialized: boolean;
  allFeatures: IWorkspaceFeature[];
}

export interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
}
