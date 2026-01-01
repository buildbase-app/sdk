import { Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import { useAppSelector } from '../../../contexts';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsDanger: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteWorkspace } = useSaaSWorkspaces();
  const currentUser = useAppSelector(state => state.auth.session?.user || null);

  if (!workspace) {
    return <SettingSkeleton />;
  }

  const myRole = workspace?.users.find(user => {
    const id = typeof user === 'object' && user !== null ? user._id : user;
    return id === currentUser?.id;
  })?.role as string;

  const amIAdmin = myRole?.toLowerCase() === 'admin';

  const handleDeleteWorkspace = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkspace(workspace._id);
      // Workspace will be removed from state by the hook
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!amIAdmin) {
    return (
      <div className="space-y-4">
        <div className="text-red-500">Only workspace admins can delete workspaces.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-destructive">Delete Workspace</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Once you delete a workspace, there is no going back. This will permanently delete the
          workspace <strong>{workspace.name}</strong> and all of its data, including members,
          settings, and features.
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Workspace
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workspace{' '}
              <strong>{workspace.name}</strong> and all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkspaceSettingsDanger;
