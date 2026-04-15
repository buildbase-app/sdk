import { Settings } from 'lucide-react';
import { useTranslation, type TranslationKey } from '../../../i18n';
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
import WorkspaceSettingsNotifications from './SettingsNotifications';
import WorkspaceSettingsPermissions from './SettingsPermissions';
import WorkspaceSettingsSidebar from './Sidebar';

export const SettingsScreen = {
  Profile: 'profile',
  General: 'general',
  Users: 'users',
  Subscription: 'subscription',
  Usage: 'usage',
  Features: 'features',
  Notifications: 'notifications',
  Permissions: 'permissions',
  Danger: 'danger',
} as const;

export type WorkspaceSettingsSection = (typeof SettingsScreen)[keyof typeof SettingsScreen];

/** Set of all valid section values — used for runtime validation */
export const SETTINGS_SCREENS = new Set<WorkspaceSettingsSection>(
  Object.values(SettingsScreen)
);

/** Translation key for each screen title */
const SCREEN_TITLE_KEYS: Record<WorkspaceSettingsSection, TranslationKey> = {
  [SettingsScreen.Profile]: 'settings.titles.profile',
  [SettingsScreen.General]: 'settings.titles.general',
  [SettingsScreen.Users]: 'settings.titles.users',
  [SettingsScreen.Subscription]: 'settings.titles.subscription',
  [SettingsScreen.Usage]: 'settings.titles.usage',
  [SettingsScreen.Features]: 'settings.titles.features',
  [SettingsScreen.Notifications]: 'settings.titles.notifications',
  [SettingsScreen.Permissions]: 'settings.titles.permissions',
  [SettingsScreen.Danger]: 'settings.titles.danger',
};

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
  defaultSection = SettingsScreen.Profile,
  section: controlledSection,
  onSectionChange,
  showTrigger = true,
  trigger,
}) => {
  const { t, dir } = useTranslation();
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
      <DialogContent dir={dir} className="flex max-w-2xl min-w-full sm:min-w-[800px] p-0 m-0 bg-muted sm:min-h-[600px] min-h-full gap-x-0 space-x-0">
        <DialogDescription className="sr-only">{t(SCREEN_TITLE_KEYS[section])}</DialogDescription>
        <WorkspaceSettingsSidebar workspace={workspace} section={section} setSection={setSection} />
        <div className="flex-1 p-6 overflow-auto flex flex-col bg-background">
          <DialogTitle className="text-xl font-bold mb-4">
            {t(SCREEN_TITLE_KEYS[section])}
          </DialogTitle>
          <div className="sm:max-h-[500px] overflow-y-auto">
            {section === SettingsScreen.Profile && <WorkspaceSettingsProfile workspace={workspace} />}
            {section === SettingsScreen.General && <WorkspaceSettingsGeneral workspace={workspace} />}
            {section === SettingsScreen.Users && <WorkspaceSettingsUsers workspace={workspace} />}
            {section === SettingsScreen.Subscription && <WorkspaceSettingsSubscription workspace={workspace} />}
            {section === SettingsScreen.Usage && <WorkspaceSettingsUsage />}
            {section === SettingsScreen.Features && (
              <WorkspaceSettingsFeatures workspaceId={workspace._id?.toString()} />
            )}
            {section === SettingsScreen.Notifications && <WorkspaceSettingsNotifications workspace={workspace} />}
            {section === SettingsScreen.Permissions && <WorkspaceSettingsPermissions workspace={workspace} />}
            {section === SettingsScreen.Danger && <WorkspaceSettingsDanger workspace={workspace} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsDialog;
export { WorkspaceSettingsDialog };
