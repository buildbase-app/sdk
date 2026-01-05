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

/**
 * Type guard to check if a value is a workspace owner ID
 */
function isWorkspaceOwnerId(createdBy: string | { _id: string } | null | undefined): string | null {
  if (!createdBy) return null;
  if (typeof createdBy === 'string') return createdBy;
  if (typeof createdBy === 'object' && createdBy !== null && '_id' in createdBy) {
    return typeof createdBy._id === 'string' ? createdBy._id : null;
  }
  return null;
}

/**
 * Check if a user is the owner of a workspace
 * @param workspace - The workspace to check
 * @param userId - The user ID to check
 * @returns true if the user is the workspace owner, false otherwise
 */
export function isWorkspaceOwner(
  workspace: IWorkspace,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  const ownerId = isWorkspaceOwnerId(workspace.createdBy);
  return ownerId !== null && ownerId === userId;
}

/**
 * Get the workspace owner ID safely
 * @param workspace - The workspace
 * @returns The owner ID as a string, or null if not available
 */
export function getWorkspaceOwnerId(workspace: IWorkspace): string | null {
  return isWorkspaceOwnerId(workspace.createdBy);
}

/**
 * Type guard to safely get user role from workspace users array
 * @param workspace - The workspace
 * @param userId - The user ID to find
 * @returns The user's role as a string, or null if not found
 */
export function getWorkspaceUserRole(
  workspace: IWorkspace,
  userId: string | null | undefined
): string | null {
  if (!userId || !workspace.users || !Array.isArray(workspace.users)) {
    return null;
  }

  const workspaceUser = workspace.users.find(user => {
    if (typeof user === 'string') {
      return user === userId;
    }
    if (typeof user === 'object' && user !== null && '_id' in user) {
      const userObj = user as { _id: string };
      return userObj._id === userId;
    }
    return false;
  });

  if (!workspaceUser || typeof workspaceUser !== 'object') {
    return null;
  }

  // Workspace users array contains IUser objects, which have a role property
  if ('role' in workspaceUser && typeof workspaceUser.role === 'string') {
    return workspaceUser.role;
  }

  return null;
}
