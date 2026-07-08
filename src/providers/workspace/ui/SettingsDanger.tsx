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
import { SectionHeader } from '../../../components/ui/section-header';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { Permission } from '../../../lib/permissions';
import { useSaaSSettings } from '../../os/hooks';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import NoPermission from './NoPermission';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsDanger: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteWorkspace } = useSaaSWorkspaces();
  const { can } = usePermissions();
  const { settings } = useSaaSSettings();
  const { t } = useTranslation();

  // In personal mode (maxWorkspacesPerUser: 1), don't allow deleting the only workspace
  const maxPerUser = settings?.workspace?.maxWorkspacesPerUser ?? 0;
  if (maxPerUser === 1) {
    return null;
  }

  if (!workspace) {
    return <SettingSkeleton />;
  }

  const canDelete = can(Permission.WORKSPACE_DELETE);

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
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canDelete) {
    return <NoPermission descriptionKey="danger.adminOnly" />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('danger.title')}
        titleClassName="text-destructive"
        description={t('danger.deleteDescription')}
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting} progress={isDeleting}>
            <Trash2 className="h-4 w-4 me-2" />
            {t('danger.deleteWorkspace')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('danger.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('danger.deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('settings.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('danger.deleting')}
                </>
              ) : (
                t('danger.deleteWorkspace')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkspaceSettingsDanger;
