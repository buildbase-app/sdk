import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { WorkspaceDialog } from './WorkspaceDialog';
import { useSaaSWorkspaces } from './hooks';
import type { WorkspaceContextValue } from './types';

// Add this at the top of the file to extend the Window interface
declare global {
  interface Window {
    __saas_workspace_provider_mounted?: number;
  }
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

// Singleton guard for context and fetch
let hasFetchedWorkspaces = false;

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { workspaces, loading, error, fetchWorkspaces, refreshWorkspaces, loadingRefresh } =
    useSaaSWorkspaces();

  // Only fetch workspaces once per app session, even if provider is mounted multiple times
  useEffect(() => {
    if (!hasFetchedWorkspaces) {
      fetchWorkspaces();
      hasFetchedWorkspaces = true;
    }
    // Warn in dev if multiple providers are mounted (browser only)
    if (typeof window !== 'undefined') {
      if (!(window.__saas_workspace_provider_mounted ?? 0)) {
        window.__saas_workspace_provider_mounted = 1;
      } else {
        window.__saas_workspace_provider_mounted = (window.__saas_workspace_provider_mounted ?? 0) + 1;
        if ((window.__saas_workspace_provider_mounted ?? 0) > 1 && window.location.hostname === 'localhost') {
          // eslint-disable-next-line no-console
          console.warn('Warning: Multiple WorkspaceProvider instances detected. Only one should be mounted.');
        }
      }
      return () => {
        window.__saas_workspace_provider_mounted = (window.__saas_workspace_provider_mounted ?? 1) - 1;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Note: fetchWorkspaces is not called automatically
  // Call fetchWorkspaces() manually when you need to load workspaces

  // Set default workspace if none selected and workspaces are available
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
    fetchWorkspaces, // Expose fetchWorkspaces for manual triggering
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
