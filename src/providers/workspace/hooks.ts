import React, { useCallback, useEffect } from 'react';
import { resolveMaxUsers, validateInvite } from '../../api/billing/pricing-variant-utils';
import { IUser } from '../../api/types';
import { useAppDispatch, useAppSelector, workspaceActions } from '../../contexts';
import { invalidateSubscription } from '../../contexts/SubscriptionContext/subscriptionInvalidation';
import { handleError } from '../../lib/error-handler';
import { eventEmitter } from '../events';
import { useSaaSSettings } from '../os/hooks';
import { workspaceSettingsManager } from './settings-manager';
import { IWorkspace, IWorkspaceUser } from './types';
import { SettingsScreen } from './ui/SettingsDialog';
import { useWorkspaceApiWithOs } from './use-workspace-api';
import { getWorkspaceUserRole, isWorkspaceOwner, workspaceStorage } from './utils';

/**
 * Main workspace management hook for the SDK.
 * Provides workspace state, CRUD operations, and user management.
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

// Re-export for backward compat
export { useWorkspaceApi, useWorkspaceApiWithOs } from './use-workspace-api';

export const useSaaSWorkspaces = () => {
  const dispatch = useAppDispatch();
  const { os, api } = useWorkspaceApiWithOs();
  const { settings } = useSaaSSettings();

  // Select all workspace state at once - only re-renders when any selected field changes
  const workspace = useAppSelector(state => state.workspaces);
  const currentUser = useAppSelector(state => state.auth.session?.user);

  const setCurrentWorkspaceWithStorage = useCallback(
    (ws: IWorkspace, options?: { forceEmit?: boolean }) => {
      const isSameWorkspace = ws._id === workspace.currentWorkspace?._id;
      // Skip if same workspace (unless forceEmit - e.g. restore from storage so app can generate token)
      if (isSameWorkspace && !options?.forceEmit) {
        return;
      }
      if (ws) {
        const previousWorkspace = workspace.currentWorkspace;
        workspaceStorage.saveCurrentWorkspace(ws);
        dispatch.workspaces(workspaceActions.setCurrentWorkspace(ws));
        // Trigger workspace changed event (always when forceEmit, so app can generate token etc.)
        eventEmitter.emitWorkspaceChanged(ws, previousWorkspace).catch(error => {
          handleError(error, {
            component: 'useSaaSWorkspaces',
            action: 'emitWorkspaceChanged',
            metadata: { workspaceId: ws._id },
          });
        });
      }
    },
    [workspace.currentWorkspace, dispatch]
  );

  /**
   * Centralized workspace switch: calls onWorkspaceChange (auth callback) first, then sets workspace.
   * Used for "Switch to" click, restore from storage, and first-load selection.
   * Uses version ref to ignore stale completions when multiple switches are triggered concurrently.
   */
  const switchToWorkspace = useCallback(
    async (ws: IWorkspace, options?: { forceEmit?: boolean }): Promise<void> => {
      const version = ++switchVersionRef.current;
      dispatch.workspaces(workspaceActions.setSwitchingToId(ws._id));
      try {
        const onWorkspaceChange = os.auth?.callbacks?.onWorkspaceChange;
        if (onWorkspaceChange) {
          const role = getWorkspaceUserRole(ws, currentUser?.id);
          try {
            await onWorkspaceChange({
              workspace: ws,
              user: currentUser ?? null,
              role,
            });
          } catch (error) {
            handleError(error, {
              component: 'useSaaSWorkspaces',
              action: 'onWorkspaceChange',
              metadata: { workspaceId: ws._id },
            });
            throw error;
          }
          if (version !== switchVersionRef.current) return; // Superseded by newer switch
        }
        setCurrentWorkspaceWithStorage(ws, options);
      } finally {
        if (version === switchVersionRef.current) {
          dispatch.workspaces(workspaceActions.setSwitchingToId(null));
        }
      }
    },
    [dispatch, os.auth?.callbacks?.onWorkspaceChange, setCurrentWorkspaceWithStorage, currentUser]
  );

  // Load saved workspace ID on initialization (e.g. Redux persist rehydration)
  useEffect(() => {
    if (!workspace.isInitialized) {
      const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();
      dispatch.workspaces(workspaceActions.setIsInitialized(true));
      if (savedWorkspaceId) {
        const savedWorkspace = workspace.workspaces.find(ws => ws._id === savedWorkspaceId);
        if (savedWorkspace) {
          switchToWorkspace(savedWorkspace, { forceEmit: true }).catch(() => {
            // onWorkspaceChange rejected - don't set workspace
          });
        }
      }
    }
  }, [
    workspace.isInitialized,
    workspace.workspaces,
    workspace.currentWorkspace,
    dispatch,
    switchToWorkspace,
  ]);

  const resetCurrentWorkspaceWithStorage = useCallback(() => {
    workspaceStorage.clearCurrentWorkspace();
    dispatch.workspaces(workspaceActions.resetCurrentWorkspace());
  }, [dispatch]);

  // Request deduplication refs
  const fetchingRef = React.useRef(false);
  const fetchingFeaturesRef = React.useRef(false);
  const switchVersionRef = React.useRef(0);

  // Fetch and update workspaces (main fetch)
  const fetchWorkspaces = useCallback(async () => {
    // Prevent duplicate requests
    if (workspace.loading || fetchingRef.current) return;

    fetchingRef.current = true;
    dispatch.workspaces(workspaceActions.setLoading(true));
    dispatch.workspaces(workspaceActions.setError(null));
    try {
      const data = await api.getWorkspaces();
      dispatch.workspaces(workspaceActions.setWorkspaces(data));
      // Apply saved workspace or default to first available
      if (data.length > 0) {
        const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();

        if (savedWorkspaceId && workspaceStorage.isWorkspaceValid(savedWorkspaceId, data)) {
          const fullWorkspace = data.find(ws => ws._id === savedWorkspaceId);
          if (fullWorkspace) {
            try {
              await switchToWorkspace(fullWorkspace, { forceEmit: true });
            } catch {
              // onWorkspaceChange rejected - don't set workspace
            }
          }
        } else {
          const firstWorkspace = data[0];
          try {
            await switchToWorkspace(firstWorkspace, { forceEmit: true });
          } catch {
            // onWorkspaceChange rejected - don't set workspace
          }
        }
      }
    } catch (err) {
      dispatch.workspaces(
        workspaceActions.setError(err instanceof Error ? err.message : 'Failed to fetch workspaces')
      );
    } finally {
      dispatch.workspaces(workspaceActions.setLoading(false));
      fetchingRef.current = false;
    }
  }, [api, workspace.loading, dispatch, switchToWorkspace]);

  // Background refresh (does not block UI, updates memo/data)
  const refreshWorkspaces = useCallback(async () => {
    // Prevent duplicate requests
    if (workspace.refreshing || fetchingRef.current) return;

    fetchingRef.current = true;
    dispatch.workspaces(workspaceActions.setRefreshing(true));
    try {
      const data = await api.getWorkspaces();
      dispatch.workspaces(workspaceActions.setWorkspaces(data));
    } catch (err) {
      // Optionally set error, but don't block UI
    } finally {
      dispatch.workspaces(workspaceActions.setRefreshing(false));
      fetchingRef.current = false;
    }
  }, [api, workspace.refreshing, dispatch]);

  const createWorkspace = useCallback(
    async (name: string, image?: string) => {
      const data = await api.createWorkspace({ name, image });
      dispatch.workspaces(workspaceActions.addWorkspace(data));
      // Switch to the newly created workspace before opening plan picker
      await switchToWorkspace(data);
      // Trigger workspace created event
      eventEmitter.emitWorkspaceCreated(data).catch(error => {
        handleError(error, {
          component: 'useSaaSWorkspaces',
          action: 'emitWorkspaceCreated',
          metadata: { workspaceId: data._id },
        });
      });
      // Auto-open plan picker after workspace switch
      setTimeout(() => {
        workspaceSettingsManager.openWorkspaceSettings(SettingsScreen.Subscription);
      }, 300);
    },
    [api, dispatch, switchToWorkspace]
  );

  const updateWorkspace = useCallback(
    async (ws: IWorkspace, _data: Partial<IWorkspace>) => {
      const data = await api.updateWorkspace(ws._id, _data);
      dispatch.workspaces(workspaceActions.updateWorkspace(data));
      // Trigger workspace updated event
      eventEmitter.emitWorkspaceUpdated(data).catch(error => {
        handleError(error, {
          component: 'useSaaSWorkspaces',
          action: 'emitWorkspaceUpdated',
          metadata: { workspaceId: data._id },
        });
      });
    },
    [api, dispatch]
  );

  const getFeatures = useCallback(async () => {
    // Prevent duplicate requests - check if features already exist or request in progress
    if (fetchingFeaturesRef.current) {
      // If request is in progress, return existing features or null
      return workspace.allFeatures.length > 0 ? workspace.allFeatures : null;
    }

    // If features already loaded, return them immediately without making a request
    if (workspace.allFeatures.length > 0) {
      return workspace.allFeatures;
    }

    fetchingFeaturesRef.current = true;
    try {
      const data = await api.getFeatures();
      dispatch.workspaces(workspaceActions.setAllFeatures(data));
      return data;
    } catch (err) {
      handleError(err, {
        component: 'useSaaSWorkspaces',
        action: 'getFeatures',
      });
      return null;
    } finally {
      fetchingFeaturesRef.current = false;
    }
  }, [api, dispatch, workspace.allFeatures]);

  const updateFeature = useCallback(
    async (workspaceId: string, key: string, value: boolean) => {
      const data = await api.updateFeature(workspaceId, key, value);
      return data;
    },
    [api]
  );

  const updateWorkspaceSettings = useCallback(
    async (data: { permissions: Record<string, string[]> }) => {
      return api.updateSettings(data);
    },
    [api]
  );

  const updateWorkspacePermissions = useCallback(
    async (workspaceId: string, permissions: Record<string, string[]>) => {
      const result = await api.updateWorkspacePermissions(workspaceId, permissions);
      await refreshWorkspaces();
      return result;
    },
    [api, refreshWorkspaces]
  );

  // Sync current workspace when workspaces array is updated
  // This ensures the currentWorkspace reference stays in sync with the workspaces array
  useEffect(() => {
    // Only sync if we have a current workspace and workspaces are loaded
    if (!workspace.currentWorkspace?._id || workspace.workspaces.length === 0) {
      return;
    }

    const currentId = workspace.currentWorkspace._id;
    const updatedWorkspace = workspace.workspaces.find(w => w._id === currentId);

    // If current workspace is not in the list, fallback to first available
    if (!updatedWorkspace) {
      if (workspace.workspaces.length > 0) {
        const firstWorkspace = workspace.workspaces[0];
        if (firstWorkspace._id !== currentId) {
          switchToWorkspace(firstWorkspace).catch(() => {
            // onWorkspaceChange rejected - don't set workspace
          });
        }
      }
      return;
    }

    // Only update if the workspace object reference changed (data was updated)
    // Dispatch directly so we update state/storage with fresh data without emitting workspace:changed
    if (updatedWorkspace !== workspace.currentWorkspace) {
      workspaceStorage.saveCurrentWorkspace(updatedWorkspace);
      dispatch.workspaces(workspaceActions.setCurrentWorkspace(updatedWorkspace));
    }
  }, [workspace.workspaces, workspace.currentWorkspace, dispatch, switchToWorkspace]);

  const getUsers = useCallback(
    async (workspaceId: string) => {
      const data = await api.getWorkspaceUsers(workspaceId);
      return data;
    },
    [api]
  );

  const addUser = useCallback(
    async (workspaceId: string, email: string, role: string) => {
      // Pre-invite validation: check settings-based user limits before calling API.
      // Note: seat-pricing plan limits are enforced by the UI layer (useSeatStatus)
      // and the server. This hook doesn't have access to SubscriptionContext.
      const targetWorkspace = workspace.workspaces.find(w => w._id === workspaceId);
      if (targetWorkspace) {
        const maxUsersConfig = resolveMaxUsers({
          settingsMaxUsers: settings?.workspace?.maxWorkspaceUsers,
        });
        const memberCount = targetWorkspace.users?.length ?? 0;
        const validation = validateInvite({ memberCount, maxUsersConfig });
        if (!validation.canInvite) {
          throw new Error(validation.blockMessageKey || 'users.memberLimitReached');
        }
      }

      const data = await api.addUser(workspaceId, { email, role });
      // Find the workspace to trigger events
      if (targetWorkspace) {
        // Trigger workspace user added event
        eventEmitter.emitWorkspaceUserAdded(data.userId, targetWorkspace, role).catch(error => {
          handleError(error, {
            component: 'useSaaSWorkspaces',
            action: 'emitWorkspaceUserAdded',
            metadata: { workspaceId, userId: data.userId, role },
          });
        });
      }
      // Refresh workspace data so users array + seat counts update
      refreshWorkspaces().catch(() => {});
      invalidateSubscription();
      return data;
    },
    [api, workspace.workspaces, refreshWorkspaces, settings]
  );

  const removeUser = useCallback(
    async (workspaceId: string, userId: string) => {
      // Find the workspace and user before removal to trigger events
      const targetWorkspace = workspace.workspaces.find(w => w._id === workspaceId);

      // Check if user is the workspace owner - prevent removing owner
      if (targetWorkspace && isWorkspaceOwner(targetWorkspace, userId)) {
        throw new Error('Cannot remove the workspace owner');
      }

      // Get workspace users to find the role
      const workspaceUsers = await api.getWorkspaceUsers(workspaceId).catch(() => []);
      const workspaceUser = workspaceUsers.find((wu: IWorkspaceUser) => {
        const wuUserId = typeof wu.user === 'string' ? wu.user : wu.user._id;
        return wuUserId === userId;
      });
      const data = await api.removeUser(workspaceId, userId);
      if (targetWorkspace && workspaceUser) {
        // Extract role from workspace user
        const role = workspaceUser.role;
        // Trigger workspace user removed event
        eventEmitter.emitWorkspaceUserRemoved(data.userId, targetWorkspace, role).catch(error => {
          handleError(error, {
            component: 'useSaaSWorkspaces',
            action: 'emitWorkspaceUserRemoved',
            metadata: { workspaceId, userId: data.userId, role },
          });
        });
      }
      // Refresh workspace data so users array + seat counts update
      refreshWorkspaces().catch(() => {});
      invalidateSubscription();
      return data;
    },
    [api, workspace.workspaces, refreshWorkspaces]
  );

  const updateUser = useCallback(
    async (workspaceId: string, userId: string, config: Partial<IWorkspaceUser>) => {
      // Check if user is the workspace owner - prevent changing owner's role
      if (config.role) {
        const targetWorkspace = workspace.workspaces.find(w => w._id === workspaceId);
        if (targetWorkspace && isWorkspaceOwner(targetWorkspace, userId)) {
          throw new Error('Cannot change the role of the workspace owner');
        }
      }

      // Get previous role if role is being updated
      let previousRole: string | undefined;
      if (config.role) {
        const workspaceUsers = await api.getWorkspaceUsers(workspaceId).catch(() => []);
        const workspaceUser = workspaceUsers.find((wu: IWorkspaceUser) => {
          const wuUserId = typeof wu.user === 'string' ? wu.user : wu.user._id;
          return wuUserId === userId;
        });
        previousRole = workspaceUser?.role;
      }

      const data = await api.updateUser(workspaceId, userId, config);

      // Trigger role changed event if role was updated
      if (config.role && previousRole && previousRole !== config.role) {
        eventEmitter
          .emitWorkspaceUserRoleChanged(data.userId, data.workspace, previousRole, config.role)
          .catch(error => {
            handleError(error, {
              component: 'useSaaSWorkspaces',
              action: 'emitWorkspaceUserRoleChanged',
              metadata: { workspaceId, userId, previousRole, newRole: config.role },
            });
          });
      }

      return data;
    },
    [api, workspace.workspaces]
  );

  const updateUserProfile = useCallback(
    async (config: Partial<IUser>) => {
      // Get current user profile before update
      const currentUser = await api.getProfile().catch(() => null);
      const data = await api.updateUserProfile(config);
      // Trigger user updated event
      eventEmitter.emitUserUpdated(data, currentUser || undefined).catch(error => {
        handleError(error, {
          component: 'useSaaSWorkspaces',
          action: 'emitUserUpdated',
          metadata: { userId: data._id },
        });
      });
      return data;
    },
    [api]
  );

  const getProfile = useCallback(async () => {
    const data = await api.getProfile();
    return data;
  }, [api]);

  const getWorkspace = useCallback(
    async (workspaceId: string) => {
      const data = await api.getWorkspace(workspaceId);
      return data;
    },
    [api]
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      // Check if user is authenticated
      if (!currentUser) {
        throw new Error('User must be authenticated to delete a workspace');
      }

      // Find the workspace before deletion to check permissions and trigger event
      const targetWorkspace = workspace.workspaces.find(w => w._id === workspaceId);
      if (!targetWorkspace) {
        throw new Error('Workspace not found');
      }

      // Check if current user is the creator of the workspace
      if (!isWorkspaceOwner(targetWorkspace, currentUser.id)) {
        throw new Error('Only the workspace creator can delete the workspace');
      }

      const data = await api.deleteWorkspace(workspaceId);
      // Remove workspace from state
      dispatch.workspaces(workspaceActions.removeWorkspace(workspaceId));
      // If deleted workspace was current, reset current workspace
      if (workspace.currentWorkspace?._id === workspaceId) {
        workspaceStorage.clearCurrentWorkspace();
        dispatch.workspaces(workspaceActions.resetCurrentWorkspace());
      }
      // Trigger workspace deleted event
      if (targetWorkspace) {
        eventEmitter.emitWorkspaceDeleted(targetWorkspace).catch(error => {
          handleError(error, {
            component: 'useSaaSWorkspaces',
            action: 'emitWorkspaceDeleted',
            metadata: { workspaceId },
          });
        });
      }
      return data;
    },
    [api, workspace.workspaces, workspace.currentWorkspace, dispatch, currentUser]
  );

  return {
    workspaces: workspace.workspaces,
    loading: workspace.loading,
    error: workspace.error,
    fetchWorkspaces,
    refreshWorkspaces,
    refreshing: workspace.refreshing,
    currentWorkspace: workspace.currentWorkspace,
    setCurrentWorkspace: setCurrentWorkspaceWithStorage,
    switchToWorkspace,
    resetCurrentWorkspace: resetCurrentWorkspaceWithStorage,
    createWorkspace,
    allFeatures: workspace.allFeatures,
    getFeatures,
    updateFeature,
    updateWorkspaceSettings,
    updateWorkspacePermissions,
    getWorkspace,
    updateWorkspace,
    getUsers,
    addUser,
    removeUser,
    updateUser,
    getProfile,
    updateUserProfile,
    deleteWorkspace,
    switching: workspace.switchingToId !== null,
    switchingToId: workspace.switchingToId,
  };
};
