import { useCallback, useEffect } from 'react';
import { WorkspaceApi } from './api';
import { IWorkspace, IWorkspaceUser } from './types';
import { WorkspaceSwitcher } from './provider';
import { workspaceStorage } from './utils';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  resetCurrentWorkspace,
  setAllFeatures,
  setCurrentWorkspace,
  setError,
  setIsInitialized,
  setLoading,
  setRefreshing,
  setWorkspaces,
} from './reducer';
import { IUser } from '../../api/types';

export const useSaaSWorkspaces = () => {
  const os = useAppSelector(state => state.os);
  const api = new WorkspaceApi(os);
  const dispatch = useAppDispatch();
  const {
    workspaces,
    currentWorkspace,
    loading,
    error,
    refreshing,
    switching,
    isInitialized,
    allFeatures,
  } = useAppSelector(state => state.workspaces);

  // Load saved workspace ID on initialization
  useEffect(() => {
    if (!isInitialized) {
      const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();
      dispatch(setIsInitialized(true));
      if (savedWorkspaceId) {
        const workspace = workspaces.find(ws => ws._id === savedWorkspaceId);
        if (workspace) {
          // check if the workspace is the same as the current workspace
          if (workspace._id === currentWorkspace?._id) {
            return;
          }
          setCurrentWorkspaceWithStorage(workspace);
        }
      }
    }
  }, [isInitialized]);

  const setCurrentWorkspaceWithStorage = useCallback((workspace: IWorkspace) => {
    // check if the workspace is the same as the current workspace
    if (workspace._id === currentWorkspace?._id) {
      return;
    }
    if (workspace) {
      dispatch(setCurrentWorkspace(workspace));
    }
    workspaceStorage.saveCurrentWorkspace(workspace);
  }, []);

  const resetCurrentWorkspaceWithStorage = useCallback(() => {
    dispatch(resetCurrentWorkspace());
    workspaceStorage.clearCurrentWorkspace();
  }, []);

  // Fetch and update workspaces (main fetch)
  const fetchWorkspaces = useCallback(async () => {
    if (loading) return;
    dispatch(setLoading(true));
    dispatch(setError(''));
    try {
      const data = await api.getWorkspaces();
      dispatch(setWorkspaces(data));
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
          if (!currentWorkspace) setCurrentWorkspaceWithStorage(data[0]);
        }
      }
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to fetch workspaces'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [api]);

  // Background refresh (does not block UI, updates memo/data)
  const refreshWorkspaces = useCallback(async () => {
    if (refreshing) return;
    dispatch(setRefreshing(true));
    try {
      const data = await api.getWorkspaces();
      dispatch(setWorkspaces(data));
    } catch (err) {
      // Optionally set error, but don't block UI
    } finally {
      dispatch(setRefreshing(false));
    }
  }, [api]);

  const createWorkspace = useCallback(
    async (name: string, image: string) => {
      const data = await api.createWorkspace({ name, image });
      dispatch(setWorkspaces([...workspaces, data]));
    },
    [api]
  );

  const updateWorkspace = useCallback(
    async (workspace: IWorkspace, _data: Partial<IWorkspace>) => {
      const data = await api.updateWorkspace(workspace._id, _data);
      dispatch(setWorkspaces(workspaces.map(ws => (ws._id === workspace._id ? data : ws))));
    },
    [api]
  );

  const getFeatures = useCallback(async () => {
    const data = await api.getFeatures();
    dispatch(setAllFeatures(data));
    return data;
  }, [api]);

  const updateFeature = useCallback(
    async (workspaceId: string, key: string, value: boolean) => {
      const data = await api.updateFeature(workspaceId, key, value);
      return data;
    },
    [api]
  );

  useEffect(() => {
    if (currentWorkspace?._id) {
      const workspace = workspaces.find(ws => ws._id === currentWorkspace?._id);
      if (workspace) {
        // check if the workspace is the same as the current workspace
        if (workspace._id === currentWorkspace._id) {
          return;
        }
        setCurrentWorkspaceWithStorage(workspace);
      } else {
        if (workspaces.length > 0) {
          // check if the workspace is the same as the current workspace
          if (workspaces[0]._id === currentWorkspace._id) {
            return;
          }
          setCurrentWorkspaceWithStorage(workspaces[0]);
        }
      }
    }
  }, [currentWorkspace?._id, workspaces]);

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
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    refreshWorkspaces,
    refreshing,
    WorkspaceSwitcher,
    currentWorkspace,
    setCurrentWorkspace: setCurrentWorkspaceWithStorage,
    resetCurrentWorkspace: resetCurrentWorkspaceWithStorage,
    createWorkspace,
    allFeatures,
    getFeatures,
    updateFeature,
    getWorkspace,
    switching,
    updateWorkspace,
    getUsers,
    addUser,
    removeUser,
    updateUser,
    getProfile,
    updateUserProfile,
  };
};
