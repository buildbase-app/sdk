import React, { useMemo } from 'react';
import { useAppSelector } from '../../contexts';
import { WorkspaceActionsContext } from './lifecycle';

/**
 * Main workspace management hook for the SDK.
 * Provides workspace state, CRUD operations, and user management.
 *
 * State selection is per-consumer; the lifecycle (fetch dedup, storage
 * restore, switch versioning, current-workspace sync) lives in the single
 * `WorkspaceProvider` instance mounted by `SaaSOSProvider`, so
 * `onWorkspaceChange` / `workspace:changed` fire exactly once per switch no
 * matter how many components use this hook.
 *
 * @returns An object containing:
 * - `workspaces`: Array of all workspaces the user has access to
 * - `currentWorkspace`: Currently selected workspace (null if none selected)
 * - `loading`: Boolean indicating if workspaces are being fetched
 * - `error`: Error message string (null if no error)
 * - `refreshing`: Boolean indicating if workspaces are being refreshed in background
 * - `switching`: Boolean - true when a workspace switch is in progress
 * - `fetchWorkspaces()`: Function to fetch all workspaces
 * - `refreshWorkspaces()`: Function to refresh workspaces in background (non-blocking)
 * - `setCurrentWorkspace(workspace)`: Function to set the current workspace (direct, no callback)
 * - `switchToWorkspace(workspace)`: Centralized switch - calls onWorkspaceChange first, then sets workspace
 * - `resetCurrentWorkspace()`: Function to clear the current workspace
 * - `createWorkspace(name, image?)`: Function to create a new workspace
 * - `updateWorkspace(workspace, data)`: Function to update a workspace
 * - `deleteWorkspace(workspaceId)`: Function to delete a workspace (owner only)
 * - `getWorkspace(workspaceId)`: Function to fetch a specific workspace
 * - `getUsers(workspaceId)`: Function to fetch users in a workspace
 * - `addUser(workspaceId, email, role)`: Function to add a user to a workspace
 * - `removeUser(workspaceId, userId)`: Function to remove a user from a workspace
 * - `updateUser(workspaceId, userId, config)`: Function to update a user in a workspace
 * - `getProfile()`: Function to fetch current user profile
 * - `updateUserProfile(config)`: Function to update current user profile
 * - `allFeatures`: Array of all available feature flags
 * - `getFeatures()`: Function to fetch all available features
 * - `updateFeature(workspaceId, key, value)`: Function to update a feature flag
 *
 * @example
 * ```tsx
 * function WorkspaceList() {
 *   const { workspaces, loading, fetchWorkspaces } = useSaaSWorkspaces();
 *
 *   useEffect(() => {
 *     fetchWorkspaces();
 *   }, [fetchWorkspaces]);
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <ul>
 *       {workspaces.map(ws => (
 *         <li key={ws._id}>{ws.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Create a new workspace
 * function CreateWorkspace() {
 *   const { createWorkspace } = useSaaSWorkspaces();
 *
 *   const handleCreate = async () => {
 *     try {
 *       await createWorkspace('My Workspace', 'https://example.com/logo.png');
 *     } catch (error) {
 *       console.error('Failed to create workspace:', error);
 *     }
 *   };
 *
 *   return <button onClick={handleCreate}>Create Workspace</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Delete workspace (owner only)
 * function DeleteWorkspaceButton({ workspaceId }) {
 *   const { deleteWorkspace } = useSaaSWorkspaces();
 *
 *   const handleDelete = async () => {
 *     if (!confirm('Are you sure?')) return;
 *     try {
 *       await deleteWorkspace(workspaceId);
 *     } catch (error) {
 *       // Error: "Only the workspace creator can delete the workspace"
 *       alert(error.message);
 *     }
 *   };
 *
 *   return <button onClick={handleDelete}>Delete</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Edge case: Workspace removed from user's access
 * function WorkspaceContent() {
 *   const { currentWorkspace, workspaces } = useSaaSWorkspaces();
 *
 *   // If current workspace is not in the list, it was removed
 *   // The hook automatically switches to first available workspace
 *   if (!currentWorkspace) {
 *     return <p>No workspace selected</p>;
 *   }
 *
 *   return <div>{currentWorkspace.name}</div>;
 * }
 * ```
 */
export const useSaaSWorkspaces = () => {
  const actions = React.useContext(WorkspaceActionsContext);
  if (!actions) {
    throw new Error(
      'useSaaSWorkspaces must be used within a WorkspaceProvider. ' +
        'Make sure SaaSOSProvider is wrapping your application.'
    );
  }

  // Select all workspace state at once - only re-renders when the slice changes
  const workspace = useAppSelector(state => state.workspaces);

  // Stable identity between renders: without the memo every render of every
  // consumer produced a fresh ~25-key object, defeating downstream memo/effect
  // dependencies. Values and behavior are unchanged.
  return useMemo(
    () => ({
      workspaces: workspace.workspaces,
      loading: workspace.loading,
      error: workspace.error,
      refreshing: workspace.refreshing,
      currentWorkspace: workspace.currentWorkspace,
      allFeatures: workspace.allFeatures,
      switching: workspace.switchingToId !== null,
      switchingToId: workspace.switchingToId,
      ...actions,
    }),
    [workspace, actions]
  );
};

// Re-export for backward compat
export { useWorkspaceApi, useWorkspaceApiWithOs } from './use-workspace-api';
