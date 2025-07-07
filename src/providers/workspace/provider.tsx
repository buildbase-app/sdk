import { createContext, ReactNode, useEffect, useState } from 'react';
import { useSaaSWorkspaces } from './hooks';
import type { IWorkspace, WorkspaceContextValue } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const {
    workspaces,
    loading,
    error,
    currentWorkspace,
    fetchWorkspaces,
    refreshWorkspaces,
    refreshing,
    switching,
  } = useSaaSWorkspaces();

  // Context value
  const contextValue: WorkspaceContextValue = {
    workspaces,
    currentWorkspace,
    loading,
    switching,
    error,
    refreshing,
    refreshWorkspaces,
    fetchWorkspaces,
  };

  return <WorkspaceContext.Provider value={contextValue}>{children}</WorkspaceContext.Provider>;
};

export function WorkspaceSwitcher(props: {
  trigger: ReactNode;
  onWorkspaceChange: (workspace: IWorkspace) => Promise<void>;
}) {
  const { workspaces, setCurrentWorkspace, currentWorkspace, fetchWorkspaces } =
    useSaaSWorkspaces();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchWorkspaces();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{props.trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workspace Switcher</DialogTitle>
        </DialogHeader>
        <div>
          {workspaces.map(workspace => {
            const isCurrentWorkspace = workspace._id === currentWorkspace?._id;
            return (
              <div key={workspace._id}>
                <Button
                  disabled={isCurrentWorkspace}
                  variant={isCurrentWorkspace ? 'default' : 'outline'}
                  onClick={() => {
                    setCurrentWorkspace(workspace);
                    props.onWorkspaceChange(workspace);
                    setOpen(false);
                  }}
                >
                  {workspace.name} {isCurrentWorkspace ? '(current)' : ''}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
