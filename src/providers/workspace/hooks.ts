import React, { useCallback, useEffect, useMemo } from 'react';
import { IUser } from '../../api/types';
import { useAppDispatch, useAppSelector, workspaceActions } from '../../contexts';
import { eventEmitter } from '../events';
import { WorkspaceApi } from './api';
import { WorkspaceSwitcher } from './provider';
import { IWorkspace, IWorkspaceUser } from './types';
import { workspaceStorage } from './utils';

export const useSaaSWorkspaces = () => {
  const dispatch = useAppDispatch();
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os]);

  // Select all workspace state at once - only re-renders when any selected field changes
  const workspace = useAppSelector(state => state.workspaces);

  const setCurrentWorkspaceWithStorage = useCallback(
    (ws: IWorkspace) => {
      // check if the workspace is the same as the current workspace
      if (ws._id === workspace.currentWorkspace?._id) {
        return;
      }
      if (ws) {
        const previousWorkspace = workspace.currentWorkspace;
        dispatch.workspaces(workspaceActions.setCurrentWorkspace(ws));
        // Trigger workspace changed event
        eventEmitter.emitWorkspaceChanged(ws, previousWorkspace).catch(error => {
          console.error('Error emitting workspace changed event:', error);
        });
      }
    },
    [workspace.currentWorkspace, dispatch]
  );

  // Load saved workspace ID on initialization
  useEffect(() => {
    if (!workspace.isInitialized) {
      const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();
      dispatch.workspaces(workspaceActions.setIsInitialized(true));
      if (savedWorkspaceId) {
        const savedWorkspace = workspace.workspaces.find(ws => ws._id === savedWorkspaceId);
        if (savedWorkspace) {
          // check if the workspace is the same as the current workspace
          if (savedWorkspace._id === workspace.currentWorkspace?._id) {
            return;
          }
          setCurrentWorkspaceWithStorage(savedWorkspace);
        }
      }
    }
  }, [
    workspace.isInitialized,
    workspace.workspaces,
    workspace.currentWorkspace,
    dispatch,
    setCurrentWorkspaceWithStorage,
  ]);

  const resetCurrentWorkspaceWithStorage = useCallback(() => {
    dispatch.workspaces(workspaceActions.resetCurrentWorkspace());
  }, [dispatch]);

  // Request deduplication refs
  const fetchingRef = React.useRef(false);
  const fetchingFeaturesRef = React.useRef(false);

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
          // Find the full workspace object from the fetched data
          const fullWorkspace = data.find(ws => ws._id === savedWorkspaceId);
          if (fullWorkspace) {
            setCurrentWorkspaceWithStorage(fullWorkspace);
          }
        } else if (data.length > 0) {
          // If no valid saved workspace, select the first available workspace
          if (!workspace.currentWorkspace) setCurrentWorkspaceWithStorage(data[0]);
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
  }, [
    api,
    workspace.loading,
    workspace.currentWorkspace,
    dispatch,
    setCurrentWorkspaceWithStorage,
  ]);

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
    async (name: string, image: string) => {
      const data = await api.createWorkspace({ name, image });
      dispatch.workspaces(workspaceActions.setWorkspaces([...workspace.workspaces, data]));
      // Trigger workspace created event
      eventEmitter.emitWorkspaceCreated(data).catch(error => {
        console.error('Error emitting workspace created event:', error);
      });
    },
    [api, workspace.workspaces, dispatch]
  );

  const updateWorkspace = useCallback(
    async (ws: IWorkspace, _data: Partial<IWorkspace>) => {
      const data = await api.updateWorkspace(ws._id, _data);
      dispatch.workspaces(
        workspaceActions.setWorkspaces(workspace.workspaces.map(w => (w._id === ws._id ? data : w)))
      );
      // Trigger workspace updated event
      eventEmitter.emitWorkspaceUpdated(data).catch(error => {
        console.error('Error emitting workspace updated event:', error);
      });
    },
    [api, workspace.workspaces, dispatch]
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
      console.error('Failed to fetch features:', err);
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

  useEffect(() => {
    if (workspace.currentWorkspace?._id) {
      const ws = workspace.workspaces.find(w => w._id === workspace.currentWorkspace?._id);
      if (ws) {
        // check if the workspace is the same as the current workspace
        if (ws._id === workspace.currentWorkspace._id) {
          return;
        }
        setCurrentWorkspaceWithStorage(ws);
      } else {
        if (workspace.workspaces.length > 0) {
          // check if the workspace is the same as the current workspace
          if (workspace.workspaces[0]._id === workspace.currentWorkspace._id) {
            return;
          }
          setCurrentWorkspaceWithStorage(workspace.workspaces[0]);
        }
      }
    }
  }, [workspace.currentWorkspace?._id, workspace.workspaces, setCurrentWorkspaceWithStorage]);

  const getUsers = useCallback(
    async (workspaceId: string) => {
      const data = await api.getWorkspaceUsers(workspaceId);
      return data;
    },
    [api]
  );

  const addUser = useCallback(
    async (workspaceId: string, email: string, role: string) => {
      const data = await api.addUser(workspaceId, { email, role });
      // Find the workspace to trigger events
      const targetWorkspace = workspace.workspaces.find(w => w._id === workspaceId);
      if (targetWorkspace) {
        // Trigger workspace user added event
        eventEmitter.emitWorkspaceUserAdded(data.userId, targetWorkspace, role).catch(error => {
          console.error('Error emitting workspace user added event:', error);
        });
      }
      return data;
    },
    [api, workspace.workspaces]
  );

  const removeUser = useCallback(
    async (workspaceId: string, userId: string) => {
      // Find the workspace and user before removal to trigger events
      const targetWorkspace = workspace.workspaces.find(w => w._id === workspaceId);
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
          console.error('Error emitting workspace user removed event:', error);
        });
      }
      return data;
    },
    [api, workspace.workspaces]
  );

  const updateUser = useCallback(
    async (workspaceId: string, userId: string, config: Partial<IWorkspaceUser>) => {
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
            console.error('Error emitting workspace user role changed event:', error);
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
        console.error('Error emitting user updated event:', error);
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
      // Find the workspace before deletion to trigger event
      const targetWorkspace = workspace.workspaces.find(w => w._id === workspaceId);
      const data = await api.deleteWorkspace(workspaceId);
      // Remove workspace from state
      dispatch.workspaces(
        workspaceActions.setWorkspaces(workspace.workspaces.filter(w => w._id !== workspaceId))
      );
      // If deleted workspace was current, reset current workspace
      if (workspace.currentWorkspace?._id === workspaceId) {
        dispatch.workspaces(workspaceActions.resetCurrentWorkspace());
      }
      // Trigger workspace deleted event
      if (targetWorkspace) {
        eventEmitter.emitWorkspaceDeleted(targetWorkspace).catch(error => {
          console.error('Error emitting workspace deleted event:', error);
        });
      }
      return data;
    },
    [api, workspace.workspaces, workspace.currentWorkspace, dispatch]
  );

  return {
    workspaces: workspace.workspaces,
    loading: workspace.loading,
    error: workspace.error,
    fetchWorkspaces,
    refreshWorkspaces,
    refreshing: workspace.refreshing,
    WorkspaceSwitcher,
    currentWorkspace: workspace.currentWorkspace,
    setCurrentWorkspace: setCurrentWorkspaceWithStorage,
    resetCurrentWorkspace: resetCurrentWorkspaceWithStorage,
    createWorkspace,
    allFeatures: workspace.allFeatures,
    getFeatures,
    updateFeature,
    getWorkspace,
    switching: workspace.switching,
    updateWorkspace,
    getUsers,
    addUser,
    removeUser,
    updateUser,
    getProfile,
    updateUserProfile,
    deleteWorkspace,
  };
};
