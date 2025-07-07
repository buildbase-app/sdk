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
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Building2, Search, Users, Check, Loader2, Plus, Settings, Crown } from 'lucide-react';
import { useSaaSAuth } from '../auth';

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
  trigger: (currentWorkspace: IWorkspace | null) => ReactNode;
  onWorkspaceChange: (workspace: IWorkspace) => Promise<void>;
}) {
  const { user } = useSaaSAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { workspaces, setCurrentWorkspace, currentWorkspace, fetchWorkspaces, loading } =
    useSaaSWorkspaces();

  useEffect(() => {
    if (workspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [workspaces]);

  // Filter workspaces based on search query
  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getWorkspaceInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger?.(currentWorkspace)}</DialogTrigger>
      {/* Dialog Content */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Workspace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2/3 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Workspace */}
          {currentWorkspace && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Current Workspace</div>
              <div className="flex items-center gap-3 rounded-lg border-2 p-3 border-border bg-muted text-muted-foreground">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentWorkspace.image} />
                  <AvatarFallback>{getWorkspaceInitials(currentWorkspace.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{currentWorkspace.name}</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{currentWorkspace.users?.length || 0} members</span>
                  </div>
                </div>
                <Check className="h-5 w-5 text-primary" />
              </div>
            </div>
          )}

          <Separator />

          {/* Workspaces List */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Available Workspaces ({filteredWorkspaces.length})
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading workspaces...</span>
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ? 'No workspaces found' : 'No workspaces available'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2 pr-4">
                  {filteredWorkspaces
                    .filter(workspace => workspace._id !== currentWorkspace?._id)
                    .map(workspace => {
                      const usersCount = workspace?.users?.length || 0;
                      const isAdmin = workspace.createdBy === user?.id;

                      return (
                        <Button
                          key={workspace._id}
                          variant="outline"
                          className="w-full justify-start h-auto p-3 rounded-none"
                          onClick={async () => {
                            await props.onWorkspaceChange(workspace);
                            setCurrentWorkspace(workspace);
                            setOpen(false);
                          }}
                        >
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage src={workspace.image} />
                            <AvatarFallback>{getWorkspaceInitials(workspace.name)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{workspace.name}</span>
                              {isAdmin && <Crown className="h-3 w-3 text-amber-500" />}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>
                                {usersCount} member{usersCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                            onClick={e => {
                              e.stopPropagation();
                              // Handle settings
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Button>
                      );
                    })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Create New Workspace */}
          <Separator />
          <Button
            className="w-full rounded-none"
            onClick={() => {
              // Handle create new workspace
              console.log('Create new workspace');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Workspace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
