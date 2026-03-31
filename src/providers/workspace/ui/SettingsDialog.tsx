import { Settings } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { IWorkspace } from '../types';
import WorkspaceSettingsDanger from './SettingsDanger';
import WorkspaceSettingsFeatures from './SettingsFeatures';
import WorkspaceSettingsGeneral from './SettingsGeneral';
import WorkspaceSettingsProfile from './SettingsProfile';
import WorkspaceSettingsSubscription from './SettingsSubscription';
import WorkspaceSettingsUsage from './SettingsUsage';
import WorkspaceSettingsUsers from './SettingsUsers';
import WorkspaceSettingsSidebar from './Sidebar';

export type WorkspaceSettingsSection =
  | 'profile'
  | 'general'
  | 'users'
  | 'subscription'
  | 'usage'
  | 'features'
  | 'danger';

export interface WorkspaceSettingsDialogProps {
  workspace: IWorkspace;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultSection?: WorkspaceSettingsSection;
  section?: WorkspaceSettingsSection;
  onSectionChange?: (section: WorkspaceSettingsSection) => void;
  showTrigger?: boolean;
  trigger?: React.ReactNode;
}

const WorkspaceSettingsDialog: React.FC<WorkspaceSettingsDialogProps> = ({
  workspace,
  onClose,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultSection = 'profile',
  section: controlledSection,
  onSectionChange,
  showTrigger = true,
  trigger,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalSection, setInternalSection] = useState<WorkspaceSettingsSection>(defaultSection);

  // Use controlled or uncontrolled state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const section = controlledSection !== undefined ? controlledSection : internalSection;
  const setSection = onSectionChange || setInternalSection;

  // Don't render if no current workspace
  if (!workspace) {
    return null;
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && onClose) {
      onClose();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="icon">
      <Settings className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>}
      <DialogContent className="flex max-w-2xl min-w-full sm:min-w-[800px] p-0 m-0 bg-muted sm:min-h-[600px] min-h-full gap-x-0 space-x-0">
        <DialogDescription className="sr-only">Workspace settings dialog</DialogDescription>
        <WorkspaceSettingsSidebar workspace={workspace} section={section} setSection={setSection} />
        <div className="flex-1 p-6 overflow-auto flex flex-col bg-background">
          <DialogTitle className="text-xl font-bold mb-4 capitalize">
            {section === 'profile' && 'Account'}
            {section === 'general' && 'Workspace Settings'}
            {section === 'users' && 'Workspace Members'}
            {section === 'subscription' && 'Plan & Billing'}
            {section === 'usage' && 'Usage'}
            {section === 'features' && 'Workspace Features'}
            {section === 'danger' && 'Danger Zone'}
          </DialogTitle>
          <div className="max-h-[500px] overflow-y-auto">
            {section === 'profile' && <WorkspaceSettingsProfile workspace={workspace} />}
            {section === 'general' && <WorkspaceSettingsGeneral workspace={workspace} />}
            {section === 'users' && <WorkspaceSettingsUsers workspace={workspace} />}
            {section === 'subscription' && <WorkspaceSettingsSubscription workspace={workspace} />}
            {section === 'usage' && <WorkspaceSettingsUsage />}
            {section === 'features' && (
              <WorkspaceSettingsFeatures workspaceId={workspace._id?.toString()} />
            )}
            {section === 'danger' && <WorkspaceSettingsDanger workspace={workspace} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsDialog;
export { WorkspaceSettingsDialog };
