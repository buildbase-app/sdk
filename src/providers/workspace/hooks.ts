import { useCallback, useEffect, useMemo } from 'react';
import { IUser } from '../../api/types';
import { useOSSelector, useWorkspaceDispatch, useWorkspaceSelector } from '../../contexts';
import { workspaceActions } from '../../contexts/actionCreators';
import { WorkspaceApi } from './api';
import { WorkspaceSwitcher } from './provider';
import { IWorkspace, IWorkspaceUser } from './types';
import { workspaceStorage } from './utils';

export const useSaaSWorkspaces = () => {
  const os = useOSSelector();
  const api = useMemo(() => new WorkspaceApi(os), [os]);
  const workspaceDispatch = useWorkspaceDispatch();

  // Select all workspace state at once - only re-renders when any selected field changes
  const workspace = useWorkspaceSelector();

  // Load saved workspace ID on initialization
  useEffect(() => {
    if (!workspace.isInitialized) {
      const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();
      workspaceDispatch(workspaceActions.setIsInitialized(true));
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
    workspaceDispatch,
  ]);

  const setCurrentWorkspaceWithStorage = useCallback(
    (ws: IWorkspace) => {
      // check if the workspace is the same as the current workspace
      if (ws._id === workspace.currentWorkspace?._id) {
        return;
      }
      if (ws) {
        workspaceDispatch(workspaceActions.setCurrentWorkspace(ws));
      }
    },
    [workspace.currentWorkspace, workspaceDispatch]
  );

  const resetCurrentWorkspaceWithStorage = useCallback(() => {
    workspaceDispatch(workspaceActions.resetCurrentWorkspace());
  }, [workspaceDispatch]);

  // Fetch and update workspaces (main fetch)
  const fetchWorkspaces = useCallback(async () => {
    if (workspace.loading) return;
    workspaceDispatch(workspaceActions.setLoading(true));
    workspaceDispatch(workspaceActions.setError(null));
    try {
      const data = await api.getWorkspaces();
      workspaceDispatch(workspaceActions.setWorkspaces(data));
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
      workspaceDispatch(
        workspaceActions.setError(err instanceof Error ? err.message : 'Failed to fetch workspaces')
      );
    } finally {
      workspaceDispatch(workspaceActions.setLoading(false));
    }
  }, [
    api,
    workspace.loading,
    workspace.currentWorkspace,
    workspaceDispatch,
    setCurrentWorkspaceWithStorage,
  ]);

  // Background refresh (does not block UI, updates memo/data)
  const refreshWorkspaces = useCallback(async () => {
    if (workspace.refreshing) return;
    workspaceDispatch(workspaceActions.setRefreshing(true));
    try {
      const data = await api.getWorkspaces();
      workspaceDispatch(workspaceActions.setWorkspaces(data));
    } catch (err) {
      // Optionally set error, but don't block UI
    } finally {
      workspaceDispatch(workspaceActions.setRefreshing(false));
    }
  }, [api, workspace.refreshing, workspaceDispatch]);

  const createWorkspace = useCallback(
    async (name: string, image: string) => {
      const data = await api.createWorkspace({ name, image });
      workspaceDispatch(workspaceActions.setWorkspaces([...workspace.workspaces, data]));
    },
    [api, workspace.workspaces, workspaceDispatch]
  );

  const updateWorkspace = useCallback(
    async (ws: IWorkspace, _data: Partial<IWorkspace>) => {
      const data = await api.updateWorkspace(ws._id, _data);
      workspaceDispatch(
        workspaceActions.setWorkspaces(workspace.workspaces.map(w => (w._id === ws._id ? data : w)))
      );
    },
    [api, workspace.workspaces, workspaceDispatch]
  );

  const getFeatures = useCallback(async () => {
    const data = await api.getFeatures();
    workspaceDispatch(workspaceActions.setAllFeatures(data));
    return data;
  }, [api, workspaceDispatch]);

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
