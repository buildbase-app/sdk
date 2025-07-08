import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '../../../components/ui/dialog';
import WorkspaceSettingsSidebar from './Sidebar';
import WorkspaceSettingsProfile from './SettingsProfile';
import WorkspaceSettingsGeneral from './SettingsGeneral';
import WorkspaceSettingsUsers from './SettingsUsers';
import { Button } from '../../../components/ui/button';
import { Settings } from 'lucide-react';
import { IWorkspace } from '../types';

export type WorkspaceSettingsSection = 'profile' | 'general' | 'users';

const WorkspaceSettingsDialog: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<WorkspaceSettingsSection>('profile');

  // Don't render if no current workspace
  if (!workspace) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex min-w-[800px] min-h-full sm:min-h-[600px] p-0 divide-x">
        <WorkspaceSettingsSidebar workspace={workspace} section={section} setSection={setSection} />
        <div className="flex-1 p-6 overflow-auto">
          {section === 'profile' && <WorkspaceSettingsProfile workspace={workspace} />}
          {section === 'general' && <WorkspaceSettingsGeneral workspace={workspace} />}
          {section === 'users' && <WorkspaceSettingsUsers workspace={workspace} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsDialog;
