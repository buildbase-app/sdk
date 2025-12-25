import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '../../contexts/shared/utils/storage';
import { IWorkspace } from './types';

const WORKSPACE_STORAGE_KEY = 'saas-workspace-current';

export const workspaceStorage = {
  saveCurrentWorkspace: (workspace: IWorkspace | null): void => {
    if (workspace) {
      setStorageItem(WORKSPACE_STORAGE_KEY, workspace._id);
    } else {
      removeStorageItem(WORKSPACE_STORAGE_KEY);
    }
  },

  loadCurrentWorkspace: (): string | null => {
    return getStorageItem(WORKSPACE_STORAGE_KEY);
  },

  clearCurrentWorkspace: (): void => {
    removeStorageItem(WORKSPACE_STORAGE_KEY);
  },

  isWorkspaceValid: (workspaceId: string | null, availableWorkspaces: IWorkspace[]): boolean => {
    if (!workspaceId) return false;
    return availableWorkspaces.some(ws => ws._id === workspaceId);
  },

  getStorageKey: (): string => WORKSPACE_STORAGE_KEY,
};
