import { useCallback, useEffect, useRef, useState } from 'react';
import { useSaaSOS } from '../contextProvider';
import { WorkspaceApi } from './api';
import { IWorkspace } from './types';
import { WorkspaceSwitcher } from './provider';
import { workspaceStorage } from './utils';

export const useSaaSWorkspaces = () => {
  const { context } = useSaaSOS();

  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<IWorkspace | null>(null);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const memoRef = useRef<IWorkspace[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const savedWorkspaceIdRef = useRef<string | null>(null);

  const api = new WorkspaceApi(context);

  // Load saved workspace ID on initialization
  useEffect(() => {
    if (!isInitialized) {
      const savedWorkspaceId = workspaceStorage.loadCurrentWorkspace();
      savedWorkspaceIdRef.current = savedWorkspaceId;
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Custom setCurrentWorkspace that saves to localStorage
  const setCurrentWorkspaceWithStorage = useCallback((workspace: IWorkspace | null) => {
    setCurrentWorkspace(workspace);
    workspaceStorage.saveCurrentWorkspace(workspace);
  }, []);

  // Fetch and update workspaces (main fetch)
  const fetchWorkspaces = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
      memoRef.current = data;

      // Apply saved workspace or default to first available
      if (data.length > 0) {
        const savedWorkspaceId = savedWorkspaceIdRef.current;

        if (savedWorkspaceId && workspaceStorage.isWorkspaceValid(savedWorkspaceId, data)) {
          // Find the full workspace object from the fetched data
          const fullWorkspace = data.find(ws => ws._id === savedWorkspaceId);
          if (fullWorkspace) {
            setCurrentWorkspace(fullWorkspace);
          }
        } else if (data.length > 0) {
          // If no valid saved workspace, select the first available workspace
          if (!currentWorkspace) setCurrentWorkspace(data[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Background refresh (does not block UI, updates memo/data)
  const refreshWorkspaces = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
      memoRef.current = data;
    } catch (err) {
      // Optionally set error, but don't block UI
    } finally {
      setRefreshing(false);
    }
  }, [api]);

  const createWorkspace = useCallback(
    async (name: string, image: string) => {
      const data = await api.createWorkspace({ name, image });
      setWorkspaces([...workspaces, data]);
    },
    [api]
  );

  const updateWorkspace = useCallback(
    async (workspace: IWorkspace, _data: Partial<IWorkspace>) => {
      const data = await api.updateWorkspace(workspace._id, _data);
      setWorkspaces(workspaces.map(ws => (ws._id === workspace._id ? data : ws)));
    },
    [api]
  );

  useEffect(() => {
    if (currentWorkspace?._id) {
      const workspace = workspaces.find(ws => ws._id === currentWorkspace?._id);
      if (workspace) {
        setCurrentWorkspace(workspace);
      } else {
        setCurrentWorkspace(null);
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
