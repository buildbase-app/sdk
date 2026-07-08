import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Coins,
  CreditCard,
  KeyRound,
  SettingsIcon,
  Shield,
  ToggleRight,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import React from 'react';
import { SidebarNavItem, SidebarNavSection } from '../../../components/ui/sidebar-nav';
import { usePermissionConfig } from '../../../contexts/PermissionContext';
import { useUIVisibility } from '../../../hooks/useUIVisibility';
import { useTranslation } from '../../../i18n';
import { Permission } from '../../../lib/permissions';
import { cn } from '../../../lib/utils';
import { useSaaSSettings } from '../../os/hooks';
import { WorkspaceModes } from '../../types';
import type { WorkspaceSettingsSection } from '../settings-screens';
import { SettingsScreen } from '../settings-screens';
import { IWorkspace } from '../types';

interface Props {
  workspace: IWorkspace;
  section: WorkspaceSettingsSection;
  setSection: (section: WorkspaceSettingsSection) => void;
}

const Sidebar: React.FC<Props> = ({ workspace, section, setSection }) => {
  const { t } = useTranslation();
  const { settings } = useSaaSSettings();
  const { appPermissions } = usePermissionConfig();
  const { visible } = useUIVisibility();
  const isPersonalMode = settings?.workspace?.mode === WorkspaceModes.Personal;
  const hasAppPermissions = appPermissions && Object.keys(appPermissions).length > 0;

  // Final visibility per item: implementor UI config AND permission/mode gates.
  // The config can only hide items — permissions remain the security floor.
  const showSection = (target: WorkspaceSettingsSection, permission?: string) =>
    visible(ui => ui.settings?.sections?.[target], permission);
  const showProfile = showSection(SettingsScreen.Profile);
  const showSecurity = showSection(SettingsScreen.Security);
  const showConnectedAgents = showSection(SettingsScreen.ConnectedAgents);
  const showGeneral = showSection(SettingsScreen.General, Permission.WORKSPACE_SETTINGS_VIEW);
  const showUsers =
    showSection(SettingsScreen.Users, Permission.WORKSPACE_MEMBERS_VIEW) && !isPersonalMode;
  const showSubscription = showSection(
    SettingsScreen.Subscription,
    Permission.WORKSPACE_BILLING_VIEW
  );
  const showUsage = showSection(SettingsScreen.Usage, Permission.WORKSPACE_USAGE_VIEW);
  const showCredits = showSection(SettingsScreen.Credits, Permission.WORKSPACE_BILLING_VIEW);
  const showFeatures = showSection(SettingsScreen.Features, Permission.WORKSPACE_FEATURES_VIEW);
  const showNotifications = showSection(SettingsScreen.Notifications);
  const showPermissions =
    showSection(SettingsScreen.Permissions) && hasAppPermissions && !isPersonalMode;
  const showDanger =
    showSection(SettingsScreen.Danger, Permission.WORKSPACE_DELETE) && !isPersonalMode;

  const showAccountSection = showProfile || showSecurity || showConnectedAgents;
  const showWorkspaceSection =
    showGeneral ||
    showUsers ||
    showSubscription ||
    showUsage ||
    showCredits ||
    showFeatures ||
    showNotifications ||
    showPermissions ||
    showDanger;

  const item = (target: WorkspaceSettingsSection, icon: React.ReactNode, label: string) => (
    <SidebarNavItem
      icon={icon}
      label={label}
      active={section === target}
      onClick={() => setSection(target)}
    />
  );

  return (
    // Mobile: full-width menu page (list → detail). sm+: fixed vertical sidebar.
    <div className="w-full sm:w-56 sm:h-full flex flex-col space-y-4 sm:space-y-6 shrink-0">
      {workspace && (
        // Sticky so the workspace context stays visible while the menu scrolls.
        // pe-10 on mobile keeps the name clear of the dialog's × button.
        <div className="sticky top-0 z-10 bg-muted border-b p-2 py-4 pe-10 sm:pe-2">
          <div className="flex items-center gap-x-2">
            {workspace.image && workspace.image.trim() && (
              <div
                className="bg-info/15 rounded flex items-center justify-center text-info font-medium px-0.5 py-0.5"
                style={{
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  minHeight: '40px',
                }}
              >
                <img
                  src={workspace.image}
                  className="w-full h-full object-contain"
                  style={{
                    width: '36px',
                    height: '36px',
                    maxWidth: '36px',
                    maxHeight: '36px',
                    objectFit: 'contain',
                  }}
                  alt={workspace.name}
                />
              </div>
            )}
            <div className={cn('flex-1 min-w-0', !workspace.image ? 'ps-2' : '')}>
              <div className="font-medium text-sm line-clamp-1 text-ellipsis overflow-hidden">
                {workspace.name}
              </div>
              <div className="text-xs text-muted-foreground">{workspace.workspaceId}</div>
            </div>
          </div>
        </div>
      )}

      {showAccountSection && (
        <SidebarNavSection title={t('settings.sidebar.account')}>
          {showProfile &&
            item(
              SettingsScreen.Profile,
              <UserIcon className="h-3.5 w-3.5" />,
              t('settings.sidebar.profile')
            )}
          {showSecurity &&
            item(
              SettingsScreen.Security,
              <KeyRound className="h-3.5 w-3.5" />,
              t('settings.sidebar.security')
            )}
          {showConnectedAgents &&
            item(
              SettingsScreen.ConnectedAgents,
              <Bot className="h-3.5 w-3.5" />,
              t('security.connectedAgentsTitle')
            )}
        </SidebarNavSection>
      )}
      {showWorkspaceSection && (
        <SidebarNavSection title={t('settings.sidebar.workspace')}>
          {showGeneral &&
            item(
              SettingsScreen.General,
              <SettingsIcon className="h-3.5 w-3.5" />,
              t('settings.sidebar.general')
            )}
          {showUsers &&
            item(
              SettingsScreen.Users,
              <UsersIcon className="h-3.5 w-3.5" />,
              t('settings.sidebar.users')
            )}
          {showSubscription &&
            item(
              SettingsScreen.Subscription,
              <CreditCard className="h-3.5 w-3.5" />,
              t('settings.sidebar.subscription')
            )}
          {showUsage &&
            item(
              SettingsScreen.Usage,
              <BarChart3 className="h-3.5 w-3.5" />,
              t('settings.sidebar.usage')
            )}
          {showCredits &&
            item(
              SettingsScreen.Credits,
              <Coins className="h-3.5 w-3.5" />,
              t('settings.sidebar.credits')
            )}
          {showFeatures &&
            item(
              SettingsScreen.Features,
              <ToggleRight className="h-3.5 w-3.5" />,
              t('settings.sidebar.features')
            )}
          {showNotifications &&
            item(
              SettingsScreen.Notifications,
              <Bell className="h-3.5 w-3.5" />,
              t('settings.sidebar.notifications')
            )}
          {showPermissions &&
            item(
              SettingsScreen.Permissions,
              <Shield className="h-3.5 w-3.5" />,
              t('settings.sidebar.permissions')
            )}
          {showDanger &&
            item(
              SettingsScreen.Danger,
              <AlertTriangle className="h-3.5 w-3.5" />,
              t('settings.sidebar.danger')
            )}
        </SidebarNavSection>
      )}
    </div>
  );
};

export default Sidebar;
