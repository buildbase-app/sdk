import { useCallback, useEffect } from 'react';
import { WorkspaceApi } from './api';
import { IWorkspace } from './types';
import { WorkspaceSwitcher } from './provider';
import { workspaceStorage } from './utils';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setCurrentWorkspace,
  setError,
  setIsInitialized,
  setLoading,
  setRefreshing,
  setWorkspaces,
} from './reducer';

export const useSaaSWorkspaces = () => {
  const os = useAppSelector(state => state.os);
  const api = new WorkspaceApi(os);
  const dispatch = useAppDispatch();
  const { workspaces, currentWorkspace, loading, error, refreshing, switching, isInitialized } =
    useAppSelector(state => state.workspaces);

  // Load saved workspace ID on initialization
  useEffect(() => {
    if (!isInitialized) {
      const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();
      dispatch(setIsInitialized(true));
      if (savedWorkspaceId) {
        const workspace = workspaces.find(ws => ws._id === savedWorkspaceId);
        if (workspace) {
          dispatch(setCurrentWorkspace(workspace));
        }
      }
    }
  }, [isInitialized]);

  // Custom setCurrentWorkspace that saves to localStorage
  const setCurrentWorkspaceWithStorage = useCallback((workspace: IWorkspace) => {
    if (workspace) {
      dispatch(setCurrentWorkspace(workspace));
    }
    workspaceStorage.saveCurrentWorkspace(workspace);
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
            dispatch(setCurrentWorkspace(fullWorkspace));
          }
        } else if (data.length > 0) {
          // If no valid saved workspace, select the first available workspace
          if (!currentWorkspace) dispatch(setCurrentWorkspace(data[0]));
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

  useEffect(() => {
    if (currentWorkspace?._id) {
      const workspace = workspaces.find(ws => ws._id === currentWorkspace?._id);
      if (workspace) {
        dispatch(setCurrentWorkspace(workspace));
      } else {
        if (workspaces.length > 0) {
          dispatch(setCurrentWorkspace(workspaces[0]));
        }
      }
    }
  }, [currentWorkspace?._id, workspaces]);

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
    createWorkspace,
    switching,
    updateWorkspace,
  };
};
