import { workspaceStorage } from '../../providers/workspace/utils';
import { updateField } from '../shared/utils/reducerHelpers';
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
      return updateField(state, 'workspaces', action.payload);

    case 'SET_ALL_FEATURES':
      return updateField(state, 'allFeatures', action.payload);

    case 'SET_CURRENT_WORKSPACE': {
      workspaceStorage.saveCurrentWorkspace(action.payload);
      return updateField(state, 'currentWorkspace', action.payload);
    }

    case 'RESET_CURRENT_WORKSPACE':
      workspaceStorage.clearCurrentWorkspace();
      return updateField(state, 'currentWorkspace', null);

    case 'SET_IS_INITIALIZED':
      return updateField(state, 'isInitialized', action.payload);

    case 'SET_LOADING':
      return updateField(state, 'loading', action.payload);

    case 'SET_ERROR':
      return updateField(state, 'error', action.payload);

    case 'SET_REFRESHING':
      return updateField(state, 'refreshing', action.payload);

    case 'SET_SWITCHING_TO_ID':
      return updateField(state, 'switchingToId', action.payload);

    default:
      return state;
  }
};
