import { useCallback, useEffect, useRef, useState } from 'react';
import { useSaaSOS } from '../contextProvider';
import { WorkspaceApi } from './api';
import { IWorkspace, IWorkspaceRole } from './types';
import { WorkspaceSwitcher } from './provider';

export const useSaaSWorkspaces = () => {
  const { context } = useSaaSOS();
  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<IWorkspace | null>(null);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const memoRef = useRef<IWorkspace[]>([]);

  const api = new WorkspaceApi(context);

  // Fetch and update workspaces (main fetch)
  const fetchWorkspaces = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
      memoRef.current = data;
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
    async (data: { name: string; image?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const ws = await api.createWorkspace(data);
        setWorkspaces(prev => [...prev, ws]);
        memoRef.current = [...memoRef.current, ws];
        return ws;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create workspace');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const updateWorkspace = useCallback(
    async (id: string, data: Partial<IWorkspace>) => {
      setLoading(true);
      setError(null);
      try {
        const ws = await api.updateWorkspace(id, data);
        setWorkspaces(prev => prev.map(w => (w._id === id ? ws : w)));
        memoRef.current = memoRef.current.map(w => (w._id === id ? ws : w));
        return ws;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update workspace');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const deleteWorkspace = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        await api.deleteWorkspace(id);
        setWorkspaces(prev => prev.filter(w => w._id !== id));
        memoRef.current = memoRef.current.filter(w => w._id !== id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete workspace');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  // Workspace users
  const getWorkspaceUsers = useCallback(
    async (workspaceId: string) => {
      setLoading(true);
      setError(null);
      try {
        return await api.getWorkspaceUsers(workspaceId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch workspace users');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const addWorkspaceUser = useCallback(
    async (workspaceId: string, userId: string, role: IWorkspaceRole) => {
      setLoading(true);
      setError(null);
      try {
        return await api.addWorkspaceUser(workspaceId, userId, role);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add workspace user');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const removeWorkspaceUser = useCallback(
    async (workspaceId: string, userId: string) => {
      setLoading(true);
      setError(null);
      try {
        return await api.removeWorkspaceUser(workspaceId, userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove workspace user');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const updateWorkspaceUserRole = useCallback(
    async (workspaceId: string, userId: string, role: IWorkspaceRole) => {
      setLoading(true);
      setError(null);
      try {
        return await api.updateWorkspaceUserRole(workspaceId, userId, role);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update workspace user role');
        throw err;
      } finally {
        setLoading(false);
      }
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
    setCurrentWorkspace,
    switching,
  };
};
