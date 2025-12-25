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
import WorkspaceSettingsFeatures from './SettingsFeatures';
import WorkspaceSettingsGeneral from './SettingsGeneral';
import WorkspaceSettingsProfile from './SettingsProfile';
import WorkspaceSettingsUsers from './SettingsUsers';
import WorkspaceSettingsSidebar from './Sidebar';

export type WorkspaceSettingsSection = 'profile' | 'general' | 'users' | 'features';

const WorkspaceSettingsDialog: React.FC<{
  workspace: IWorkspace;
  onClose: () => void;
}> = ({ workspace, onClose }) => {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<WorkspaceSettingsSection>('profile');

  // Don't render if no current workspace
  if (!workspace) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={e => {
        setOpen(e);
        if (!e) {
          onClose();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-w-2xl min-w-full sm:min-w-[800px] p-0 m-0 bg-muted sm:min-h-[600px] min-h-full gap-x-0 space-x-0">
        <DialogDescription className="sr-only">Workspace settings dialog</DialogDescription>
        <WorkspaceSettingsSidebar workspace={workspace} section={section} setSection={setSection} />
        <div className="flex-1 p-6 overflow-auto flex flex-col bg-background">
          <DialogTitle className="text-xl font-bold mb-4 capitalize">
            {section === 'profile' && 'Account'}
            {section === 'general' && 'Workspace Settings'}
            {section === 'users' && 'Workspace Members'}
            {section === 'features' && 'Workspace Features'}
          </DialogTitle>
          <div className="max-h-[500px] overflow-y-auto">
            {section === 'profile' && <WorkspaceSettingsProfile workspace={workspace} />}
            {section === 'general' && <WorkspaceSettingsGeneral workspace={workspace} />}
            {section === 'users' && <WorkspaceSettingsUsers workspace={workspace} />}
            {section === 'features' && (
              <WorkspaceSettingsFeatures workspaceId={workspace._id?.toString()} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsDialog;
