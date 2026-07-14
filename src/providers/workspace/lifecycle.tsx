'use client';

import React, { createContext, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { resolveMaxUsers, validateInvite } from '../../api/billing/pricing-variant-utils';
import { IUser } from '../../api/types';
import { useAppDispatch, useAppSelector, workspaceActions } from '../../contexts';
import { invalidateSubscription } from '../../contexts/SubscriptionContext/subscriptionInvalidation';
import { useTranslation } from '../../i18n';
import { getHookErrorMessage, handleError } from '../../lib/error-handler';
import { eventEmitter } from '../events';
import { useSaaSSettings } from '../os/hooks';
import { workspaceSettingsManager } from './settings-manager';
import { SettingsScreen } from './settings-screens';
import { IWorkspace, IWorkspaceFeature, IWorkspaceUser } from './types';
import { useWorkspaceApiWithOs } from './use-workspace-api';
import { getWorkspaceUserRole, isWorkspaceOwner, workspaceStorage } from './utils';

/**
 * The workspace actions owned by {@link WorkspaceProvider}. One instance per
 * app: request dedup, switch versioning, storage restore, and the
 * current-workspace sync/fallback all live here, so `onWorkspaceChange` /
 * `workspace:changed` fire exactly once per switch no matter how many
 * components call `useSaaSWorkspaces()`.
 */
export interface WorkspaceActions {
  fetchWorkspaces: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (ws: IWorkspace, options?: { forceEmit?: boolean }) => void;
  switchToWorkspace: (ws: IWorkspace, options?: { forceEmit?: boolean }) => Promise<void>;
  resetCurrentWorkspace: () => void;
  createWorkspace: (name: string, image?: string) => Promise<void>;
  updateWorkspace: (ws: IWorkspace, data: Partial<IWorkspace>) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<unknown>;
  getWorkspace: (workspaceId: string) => Promise<IWorkspace>;
  getUsers: (workspaceId: string) => Promise<IWorkspaceUser[]>;
  addUser: (workspaceId: string, email: string, role: string) => Promise<{ userId: string }>;
  removeUser: (workspaceId: string, userId: string) => Promise<{ userId: string }>;
  updateUser: (
    workspaceId: string,
    userId: string,
    config: Partial<IWorkspaceUser>
  ) => Promise<{ userId: string; workspace: IWorkspace; message: string }>;
  getProfile: () => Promise<IUser>;
  updateUserProfile: (config: Partial<IUser>) => Promise<IUser>;
  getFeatures: () => Promise<IWorkspaceFeature[] | null>;
  updateFeature: (workspaceId: string, key: string, value: boolean) => Promise<IWorkspace>;
  updateWorkspaceSettings: (data: { permissions: Record<string, string[]> }) => Promise<unknown>;
  updateWorkspacePermissions: (
    workspaceId: string,
    permissions: Record<string, string[]>
  ) => Promise<unknown>;
}

export const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);
WorkspaceActionsContext.displayName = 'WorkspaceActionsContext';

/** All workspace lifecycle + actions — mounted exactly once (see WorkspaceProvider). */
const WorkspaceProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { os, api } = useWorkspaceApiWithOs();
  const { settings } = useSaaSSettings();
  const { t } = useTranslation();

  // Latest `t` without putting it in callback deps: a locale switch must not
  // recreate `fetchWorkspaces` (which would trigger a refetch + loading flicker).
  const tRef = React.useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const workspace = useAppSelector(state => state.workspaces);
  const currentUser = useAppSelector(state => state.auth.session?.user);

  // Singleton coordination state — previously per hook instance, which caused
  // double fetches and multiple onWorkspaceChange fires per switch.
  const fetchingRef = React.useRef(false);
  const fetchingFeaturesRef = React.useRef(false);
  const switchVersionRef = React.useRef(0);

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
            component: 'WorkspaceProvider',
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
              component: 'WorkspaceProvider',
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

  // Keep a ref to switchToWorkspace so the init effect doesn't re-trigger
  // when currentWorkspace (and therefore switchToWorkspace) changes.
  const switchToWorkspaceRef = React.useRef(switchToWorkspace);
  switchToWorkspaceRef.current = switchToWorkspace;

  // Load saved workspace ID on initialization (e.g. Redux persist rehydration)
  useEffect(() => {
    if (!workspace.isInitialized) {
      const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();
      dispatch.workspaces(workspaceActions.setIsInitialized(true));
      if (savedWorkspaceId) {
        const savedWorkspace = workspace.workspaces.find(ws => ws._id === savedWorkspaceId);
        if (savedWorkspace) {
          switchToWorkspaceRef.current(savedWorkspace, { forceEmit: true }).catch(err => {
            // onWorkspaceChange callback rejected — don't set workspace, but log for debugging
            handleError(err, {
              component: 'WorkspaceProvider',
              action: 'initWorkspaceSwitch',
              metadata: { savedWorkspaceId },
            });
          });
        }
      }
    }
  }, [workspace.isInitialized, workspace.workspaces, dispatch]);

  const resetCurrentWorkspaceWithStorage = useCallback(() => {
    workspaceStorage.clearCurrentWorkspace();
    dispatch.workspaces(workspaceActions.resetCurrentWorkspace());
  }, [dispatch]);

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
        workspaceActions.setError(getHookErrorMessage(err, 'errors.fetchWorkspaces', tRef.current))
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

  // Pending plan-picker timer — cleared on unmount so the picker can't pop
  // open after the user has navigated away or signed out mid-delay.
  const planPickerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (planPickerTimerRef.current) clearTimeout(planPickerTimerRef.current);
    },
    []
  );

  const createWorkspace = useCallback(
    async (name: string, image?: string) => {
      const data = await api.createWorkspace({ name, image });
      dispatch.workspaces(workspaceActions.addWorkspace(data));
      // Switch to the newly created workspace before opening plan picker
      await switchToWorkspace(data);
      // Trigger workspace created event
      eventEmitter.emitWorkspaceCreated(data).catch(error => {
        handleError(error, {
          component: 'WorkspaceProvider',
          action: 'emitWorkspaceCreated',
          metadata: { workspaceId: data._id },
        });
      });
      // Auto-open plan picker after workspace switch
      if (planPickerTimerRef.current) clearTimeout(planPickerTimerRef.current);
      planPickerTimerRef.current = setTimeout(() => {
        planPickerTimerRef.current = null;
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
          component: 'WorkspaceProvider',
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
        component: 'WorkspaceProvider',
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
          switchToWorkspace(firstWorkspace).catch(err => {
            handleError(err, {
              component: 'WorkspaceProvider',
              action: 'fallbackWorkspaceSwitch',
              metadata: { workspaceId: firstWorkspace._id },
            });
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
            component: 'WorkspaceProvider',
            action: 'emitWorkspaceUserAdded',
            metadata: { workspaceId, userId: data.userId, role },
          });
        });
      }
      // Refresh workspace data so users array + seat counts update
      refreshWorkspaces().catch(err => {
        handleError(err, { component: 'WorkspaceProvider', action: 'refreshAfterAddUser' });
      });
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
            component: 'WorkspaceProvider',
            action: 'emitWorkspaceUserRemoved',
            metadata: { workspaceId, userId: data.userId, role },
          });
        });
      }
      // Refresh workspace data so users array + seat counts update
      refreshWorkspaces().catch(err => {
        handleError(err, { component: 'WorkspaceProvider', action: 'refreshAfterRemoveUser' });
      });
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
              component: 'WorkspaceProvider',
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
          component: 'WorkspaceProvider',
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
            component: 'WorkspaceProvider',
            action: 'emitWorkspaceDeleted',
            metadata: { workspaceId },
          });
        });
      }
      return data;
    },
    [api, workspace.workspaces, workspace.currentWorkspace, dispatch, currentUser]
  );

  const actions = useMemo<WorkspaceActions>(
    () => ({
      fetchWorkspaces,
      refreshWorkspaces,
      setCurrentWorkspace: setCurrentWorkspaceWithStorage,
      switchToWorkspace,
      resetCurrentWorkspace: resetCurrentWorkspaceWithStorage,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      getWorkspace,
      getUsers,
      addUser,
      removeUser,
      updateUser,
      getProfile,
      updateUserProfile,
      getFeatures,
      updateFeature,
      updateWorkspaceSettings,
      updateWorkspacePermissions,
    }),
    [
      fetchWorkspaces,
      refreshWorkspaces,
      setCurrentWorkspaceWithStorage,
      switchToWorkspace,
      resetCurrentWorkspaceWithStorage,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      getWorkspace,
      getUsers,
      addUser,
      removeUser,
      updateUser,
      getProfile,
      updateUserProfile,
      getFeatures,
      updateFeature,
      updateWorkspaceSettings,
      updateWorkspacePermissions,
    ]
  );

  return (
    <WorkspaceActionsContext.Provider value={actions}>{children}</WorkspaceActionsContext.Provider>
  );
};

WorkspaceProviderInner.displayName = 'WorkspaceProviderInner';

/**
 * Owns the workspace lifecycle: storage restore, request dedup, switch
 * versioning, and the current-workspace sync/fallback. Mounted by
 * `SaaSOSProvider`; nesting is a safe no-op (the outermost instance wins),
 * so a stray manual mount cannot double-fire `onWorkspaceChange`.
 */
export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const parent = React.useContext(WorkspaceActionsContext);
  if (parent) return <>{children}</>;
  return <WorkspaceProviderInner>{children}</WorkspaceProviderInner>;
};

WorkspaceProvider.displayName = 'WorkspaceProvider';
