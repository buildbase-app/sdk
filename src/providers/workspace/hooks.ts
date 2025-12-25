import React, { useCallback, useEffect, useMemo } from 'react';
import { IUser } from '../../api/types';
import { useAppDispatch, useAppSelector, workspaceActions } from '../../contexts';
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
        dispatch.workspaces(workspaceActions.setCurrentWorkspace(ws));
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
    },
    [api, workspace.workspaces, dispatch]
  );

  const updateWorkspace = useCallback(
    async (ws: IWorkspace, _data: Partial<IWorkspace>) => {
      const data = await api.updateWorkspace(ws._id, _data);
      dispatch.workspaces(
        workspaceActions.setWorkspaces(workspace.workspaces.map(w => (w._id === ws._id ? data : w)))
      );
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
      return data;
    },
    [api]
  );

  const removeUser = useCallback(
    async (workspaceId: string, userId: string) => {
      const data = await api.removeUser(workspaceId, userId);
      return data;
    },
    [api]
  );

  const updateUser = useCallback(
    async (workspaceId: string, userId: string, config: Partial<IWorkspaceUser>) => {
      const data = await api.updateUser(workspaceId, userId, config);
      return data;
    },
    [api]
  );

  const updateUserProfile = useCallback(
    async (config: Partial<IUser>) => {
      const data = await api.updateUserProfile(config);
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
  };
};
