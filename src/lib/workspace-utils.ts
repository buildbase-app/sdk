/**
 * Framework-agnostic workspace utilities.
 * Business logic for workspace ownership, roles, and storage.
 */

import { getStorageItem, removeStorageItem, setStorageItem } from './storage';

const WORKSPACE_STORAGE_KEY = 'saas-workspace-current';

// ─── Workspace types (inline to keep this file dependency-free from providers/) ─
/** Minimal workspace shape needed for ownership/role checks. Extended by `permissions.WorkspaceLike`. */
export interface WorkspaceLike {
  _id: string;
  createdBy: string | { _id: string } | null | undefined;
  users?: Array<string | { _id: string; role?: string }>;
}

// ─── Storage ───────────────────────────────────────────────────────────────────

export const workspaceStorage = {
  saveCurrentWorkspace: (workspace: { _id: string } | null): void => {
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

  isWorkspaceValid: (
    workspaceId: string | null,
    availableWorkspaces: { _id: string }[]
  ): boolean => {
    if (!workspaceId) return false;
    return availableWorkspaces.some(ws => ws._id === workspaceId);
  },

  getStorageKey: (): string => WORKSPACE_STORAGE_KEY,
};

// ─── Ownership ─────────────────────────────────────────────────────────────────

function resolveOwnerId(createdBy: string | { _id: string } | null | undefined): string | null {
  if (!createdBy) return null;
  if (typeof createdBy === 'string') return createdBy;
  if (typeof createdBy === 'object' && '_id' in createdBy) {
    return typeof createdBy._id === 'string' ? createdBy._id : null;
  }
  return null;
}

export function isWorkspaceOwner(
  workspace: WorkspaceLike,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  const ownerId = resolveOwnerId(workspace.createdBy);
  return ownerId !== null && ownerId === userId;
}

export function getWorkspaceOwnerId(workspace: WorkspaceLike): string | null {
  return resolveOwnerId(workspace.createdBy);
}

// ─── Roles ─────────────────────────────────────────────────────────────────────

export function getWorkspaceUserRole(
  workspace: WorkspaceLike,
  userId: string | null | undefined
): string | null {
  if (!userId || !workspace.users || !Array.isArray(workspace.users)) return null;

  const workspaceUser = workspace.users.find(user => {
    if (typeof user === 'string') return user === userId;
    if (typeof user === 'object' && user !== null && '_id' in user) return user._id === userId;
    return false;
  });

  if (!workspaceUser || typeof workspaceUser !== 'object') return null;
  if ('role' in workspaceUser && typeof workspaceUser.role === 'string') return workspaceUser.role;
  return null;
}

export { WORKSPACE_STORAGE_KEY };
