import { ArrowLeft, Settings } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { cn } from '../../../lib/utils';
import { IWorkspace } from '../types';
import WorkspaceSettingsConnectedAgents from './SettingsConnectedAgents';
import WorkspaceSettingsCredits from './SettingsCredits';
import WorkspaceSettingsDanger from './SettingsDanger';
import WorkspaceSettingsFeatures from './SettingsFeatures';
import WorkspaceSettingsGeneral from './SettingsGeneral';
import WorkspaceSettingsNotifications from './SettingsNotifications';
import WorkspaceSettingsPermissions from './SettingsPermissions';
import WorkspaceSettingsProfile from './SettingsProfile';
import WorkspaceSettingsSecurity from './SettingsSecurity';
import WorkspaceSettingsSubscription from './SettingsSubscription';
import WorkspaceSettingsUsage from './SettingsUsage';
import WorkspaceSettingsUsers from './SettingsUsers';
import WorkspaceSettingsSidebar from './Sidebar';

import { SettingsScreen, type WorkspaceSettingsSection } from '../settings-screens';

// Re-exported for backward compatibility — prefer importing from '../settings-screens'.
export { SETTINGS_SCREENS, SettingsScreen } from '../settings-screens';
export type { WorkspaceSettingsSection } from '../settings-screens';
export { WorkspaceSettingsDialog };

/** Translation key for each screen title */
const SCREEN_TITLE_KEYS: Record<WorkspaceSettingsSection, TranslationKey> = {
  [SettingsScreen.Profile]: 'settings.titles.profile',
  [SettingsScreen.Security]: 'settings.titles.security',
  [SettingsScreen.ConnectedAgents]: 'security.connectedAgentsTitle',
  [SettingsScreen.General]: 'settings.titles.general',
  [SettingsScreen.Users]: 'settings.titles.users',
  [SettingsScreen.Subscription]: 'settings.titles.subscription',
  [SettingsScreen.Usage]: 'settings.titles.usage',
  [SettingsScreen.Credits]: 'settings.titles.credits',
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

  // Mobile list → detail navigation: start on the menu unless a specific
  // section was requested (controlled usage / deep link). Desktop ignores this.
  const startOnMenu = controlledSection === undefined && defaultSection === SettingsScreen.Profile;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(startOnMenu);
  const prevSectionRef = useRef(section);
  const contentPaneRef = useRef<HTMLDivElement>(null);
  const menuPaneRef = useRef<HTMLDivElement>(null);

  // Keep keyboard/screen-reader focus sensible when panes swap on mobile —
  // the element that had focus gets display:none, which would drop focus to <body>.
  const prevMenuOpenRef = useRef(mobileMenuOpen);
  useEffect(() => {
    if (prevMenuOpenRef.current === mobileMenuOpen) return;
    prevMenuOpenRef.current = mobileMenuOpen;
    if (typeof window === 'undefined' || window.innerWidth >= 640) return;
    (mobileMenuOpen ? menuPaneRef : contentPaneRef).current?.focus();
  }, [mobileMenuOpen]);

  // Externally driven section changes (e.g. settings-manager deep links) jump to content
  useEffect(() => {
    if (prevSectionRef.current !== section) {
      prevSectionRef.current = section;
      setMobileMenuOpen(false);
    }
  }, [section]);

  // Re-opening the dialog starts fresh on the menu (mobile)
  useEffect(() => {
    if (open) {
      setMobileMenuOpen(startOnMenu);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectSection = (next: WorkspaceSettingsSection) => {
    setSection(next);
    setMobileMenuOpen(false);
  };

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
    <Button variant="outline" size="icon" aria-label={t('settings.common.openSettings')}>
      <Settings className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>}
      <DialogContent
        dir={dir}
        className="flex flex-col sm:flex-row max-w-2xl min-w-full md:min-w-[800px] xl:min-w-[960px] p-0 m-0 bg-muted h-dvh max-h-dvh sm:h-auto sm:max-h-[90vh] sm:min-h-[600px] overflow-hidden gap-x-0 space-x-0"
      >
        <DialogDescription className="sr-only">{t(SCREEN_TITLE_KEYS[section])}</DialogDescription>
        {/* Menu pane — full page on mobile, permanent sidebar from sm up */}
        <div
          ref={menuPaneRef}
          tabIndex={-1}
          className={cn(
            // px/pb only — no top padding, so the sticky workspace header sits flush
            'flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-2 sm:p-0 sm:flex sm:flex-none focus:outline-none',
            mobileMenuOpen ? 'flex' : 'hidden'
          )}
        >
          <WorkspaceSettingsSidebar
            workspace={workspace}
            section={section}
            setSection={selectSection}
          />
        </div>
        {/* Content pane — hidden on mobile while the menu is open */}
        <div
          ref={contentPaneRef}
          tabIndex={-1}
          className={cn(
            'flex-1 p-4 sm:p-6 overflow-auto flex-col bg-background sm:flex focus:outline-none',
            mobileMenuOpen ? 'hidden' : 'flex'
          )}
        >
          {/* Back + title share one row on mobile (iOS pattern); back hidden on desktop */}
          <div className="flex items-center gap-1 mb-4 pe-10 sm:pe-0">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden -ms-2 shrink-0 text-muted-foreground"
              aria-label={t('settings.common.back')}
              onClick={() => setMobileMenuOpen(true)}
            >
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Button>
            <DialogTitle className="text-xl font-semibold min-w-0 truncate">
              {t(SCREEN_TITLE_KEYS[section])}
            </DialogTitle>
          </div>
          <div className="sm:max-h-[500px] xl:max-h-[65vh] overflow-y-auto">
            {section === SettingsScreen.Profile && (
              <WorkspaceSettingsProfile workspace={workspace} />
            )}
            {section === SettingsScreen.Security && <WorkspaceSettingsSecurity />}
            {section === SettingsScreen.ConnectedAgents && <WorkspaceSettingsConnectedAgents />}
            {section === SettingsScreen.General && (
              <WorkspaceSettingsGeneral workspace={workspace} />
            )}
            {section === SettingsScreen.Users && <WorkspaceSettingsUsers workspace={workspace} />}
            {section === SettingsScreen.Subscription && (
              <WorkspaceSettingsSubscription workspace={workspace} />
            )}
            {section === SettingsScreen.Usage && <WorkspaceSettingsUsage />}
            {section === SettingsScreen.Credits && (
              <WorkspaceSettingsCredits workspace={workspace} />
            )}
            {section === SettingsScreen.Features && (
              <WorkspaceSettingsFeatures workspaceId={workspace._id?.toString()} />
            )}
            {section === SettingsScreen.Notifications && (
              <WorkspaceSettingsNotifications workspace={workspace} />
            )}
            {section === SettingsScreen.Permissions && (
              <WorkspaceSettingsPermissions workspace={workspace} />
            )}
            {section === SettingsScreen.Danger && <WorkspaceSettingsDanger workspace={workspace} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsDialog;
