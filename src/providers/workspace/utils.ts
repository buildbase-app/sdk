import { IWorkspace } from './types';

const WORKSPACE_STORAGE_KEY = 'saas-workspace-current';

export const workspaceStorage = {
  saveCurrentWorkspace: (workspace: IWorkspace | null): void => {
    if (typeof window === 'undefined') return;
    try {
      if (workspace) {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace._id);
      } else {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save workspace to localStorage:', error);
    }
  },

  loadCurrentWorkspace: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (stored) {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to load workspace from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
    return null;
  },

  clearCurrentWorkspace: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear workspace from localStorage:', error);
    }
  },

  isWorkspaceValid: (workspaceId: string | null, availableWorkspaces: IWorkspace[]): boolean => {
    if (!workspaceId) return false;
    return availableWorkspaces.some(ws => ws._id === workspaceId);
  },

  getStorageKey: (): string => WORKSPACE_STORAGE_KEY,
};
