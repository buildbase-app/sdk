import { Loader2, Trash2 } from 'lucide-react';
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
import { handleError } from '../../../lib/error-handler';
import { useSaaSAuth } from '../../auth/hooks';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import { getWorkspaceUserRole } from '../utils';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsDanger: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteWorkspace } = useSaaSWorkspaces();
  const { user: currentUser } = useSaaSAuth();

  if (!workspace) {
    return <SettingSkeleton />;
  }

  const myRole = getWorkspaceUserRole(workspace, currentUser?.id ?? null);
  const amIAdmin = myRole?.toLowerCase() === 'admin';

  const handleDeleteWorkspace = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkspace(workspace._id);
      // Workspace will be removed from state by the hook
    } catch (error) {
      handleError(error, {
        component: 'WorkspaceSettingsDanger',
        action: 'handleDeleteWorkspace',
        metadata: { workspaceId: workspace._id },
      });
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
          <Button variant="destructive" disabled={isDeleting} progress={isDeleting}>
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
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Workspace'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkspaceSettingsDanger;
