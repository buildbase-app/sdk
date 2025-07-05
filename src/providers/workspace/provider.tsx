import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { WorkspaceDialog } from './WorkspaceDialog';
import { useSaaSWorkspaces } from './hooks';
import type { WorkspaceContextValue } from './types';

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { workspaces, loading, error, fetchWorkspaces, refreshWorkspaces, loadingRefresh } =
    useSaaSWorkspaces();

  // Track dialog open state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Track current workspace (persist in localStorage)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('saas_current_workspace') : null
  );

  // Track switching state
  const [switching, setSwitching] = useState(false);

  // Update current workspace in localStorage
  useEffect(() => {
    if (currentWorkspaceId && typeof window !== 'undefined') {
      localStorage.setItem('saas_current_workspace', currentWorkspaceId);
    }
  }, [currentWorkspaceId]);

  // Fetch workspaces on mount/dialog open
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Set default workspace if none selected
  useEffect(() => {
    if (!currentWorkspaceId && workspaces.length > 0) {
      setCurrentWorkspaceId(workspaces[0]._id);
    }
  }, [workspaces, currentWorkspaceId]);

  // Find the current workspace object
  const currentWorkspace = useMemo(
    () => workspaces.find(ws => ws._id === currentWorkspaceId) || null,
    [workspaces, currentWorkspaceId]
  );

  // Switch workspace by id, with switching state
  const switchWorkspace = useCallback((id: string) => {
    setSwitching(true);
    setTimeout(() => {
      setCurrentWorkspaceId(id);
      setSwitching(false);
    }, 300); // Simulate async switching, replace with real logic if needed
  }, []);

  // Open workspace settings dialog
  const openWorkspaceSettings = useCallback(() => setDialogOpen(true), []);
  const closeWorkspaceSettings = useCallback(() => setDialogOpen(false), []);

  // Dropdown props for workspace switcher
  const workspacesDropdownProps = useMemo(
    () => ({
      value: currentWorkspaceId || undefined,
      onChange: (id: string) => switchWorkspace(id),
      options: workspaces.map(ws => ({ value: ws._id, label: ws.name })),
      loading,
      switching,
    }),
    [currentWorkspaceId, workspaces, switchWorkspace, loading, switching]
  );

  // Context value
  const contextValue: WorkspaceContextValue = {
    workspaces,
    currentWorkspace,
    loading,
    switching,
    error,
    switchWorkspace,
    openWorkspaceSettings,
    workspacesDropdownProps,
    refreshWorkspaces,
    loadingRefresh,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
      <WorkspaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={closeWorkspaceSettings}
      />
    </WorkspaceContext.Provider>
  );
};
