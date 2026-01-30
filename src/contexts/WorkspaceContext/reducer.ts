import { workspaceStorage } from '../../providers/workspace/utils';
import type { WorkspaceAction, WorkspaceState } from './types';

/**
 * Initial state for workspace context
 */
export const getInitialWorkspaceState = (): WorkspaceState => {
  return {
    workspaces: [],
    loading: false,
    error: null,
    currentWorkspace: null,
    refreshing: false,
    switchingToId: null,
    isInitialized: false,
    allFeatures: [],
  };
};

/**
 * Workspace reducer for Context API
 * Handles all workspace state updates with proper immutability
 */
export const workspaceReducer = (
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState => {
  switch (action.type) {
    case 'SET_WORKSPACES':
      return { ...state, workspaces: action.payload };

    case 'SET_ALL_FEATURES':
      return { ...state, allFeatures: action.payload };

    case 'SET_CURRENT_WORKSPACE': {
      workspaceStorage.saveCurrentWorkspace(action.payload);
      return { ...state, currentWorkspace: action.payload };
    }

    case 'RESET_CURRENT_WORKSPACE':
      workspaceStorage.clearCurrentWorkspace();
      return { ...state, currentWorkspace: null };

    case 'SET_IS_INITIALIZED':
      return { ...state, isInitialized: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };

    case 'SET_SWITCHING_TO_ID':
      return { ...state, switchingToId: action.payload };

    default:
      return state;
  }
};
