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
import { usePermissions } from '../../../hooks/usePermissions';
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
  const { can } = usePermissions();
  const { appPermissions } = usePermissionConfig();
  const isPersonalMode = settings?.workspace?.mode === WorkspaceModes.Personal;
  const canAccessDangerZone = can(Permission.WORKSPACE_DELETE);
  const hasAppPermissions = appPermissions && Object.keys(appPermissions).length > 0;

  const item = (target: WorkspaceSettingsSection, icon: React.ReactNode, label: string) => (
    <SidebarNavItem
      icon={icon}
      label={label}
      active={section === target}
      onClick={() => setSection(target)}
    />
  );

  return (
    <div className="w-44 sm:w-56 h-full flex flex-col space-y-4 sm:space-y-6 shrink-0">
      {workspace && (
        <div className="border-b p-2 py-4">
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

      <SidebarNavSection title={t('settings.sidebar.account')}>
        {item(
          SettingsScreen.Profile,
          <UserIcon className="h-3.5 w-3.5" />,
          t('settings.sidebar.profile')
        )}
        {item(
          SettingsScreen.Security,
          <KeyRound className="h-3.5 w-3.5" />,
          t('settings.sidebar.security')
        )}
        {item(
          SettingsScreen.ConnectedAgents,
          <Bot className="h-3.5 w-3.5" />,
          t('security.connectedAgentsTitle')
        )}
      </SidebarNavSection>
      <SidebarNavSection title={t('settings.sidebar.workspace')}>
        {can(Permission.WORKSPACE_SETTINGS_VIEW) &&
          item(
            SettingsScreen.General,
            <SettingsIcon className="h-3.5 w-3.5" />,
            t('settings.sidebar.general')
          )}
        {!isPersonalMode &&
          can(Permission.WORKSPACE_MEMBERS_VIEW) &&
          item(
            SettingsScreen.Users,
            <UsersIcon className="h-3.5 w-3.5" />,
            t('settings.sidebar.users')
          )}
        {can(Permission.WORKSPACE_BILLING_VIEW) &&
          item(
            SettingsScreen.Subscription,
            <CreditCard className="h-3.5 w-3.5" />,
            t('settings.sidebar.subscription')
          )}
        {can(Permission.WORKSPACE_USAGE_VIEW) &&
          item(
            SettingsScreen.Usage,
            <BarChart3 className="h-3.5 w-3.5" />,
            t('settings.sidebar.usage')
          )}
        {can(Permission.WORKSPACE_BILLING_VIEW) &&
          item(
            SettingsScreen.Credits,
            <Coins className="h-3.5 w-3.5" />,
            t('settings.sidebar.credits')
          )}
        {can(Permission.WORKSPACE_FEATURES_VIEW) &&
          item(
            SettingsScreen.Features,
            <ToggleRight className="h-3.5 w-3.5" />,
            t('settings.sidebar.features')
          )}
        {item(
          SettingsScreen.Notifications,
          <Bell className="h-3.5 w-3.5" />,
          t('settings.sidebar.notifications')
        )}
        {hasAppPermissions &&
          !isPersonalMode &&
          item(
            SettingsScreen.Permissions,
            <Shield className="h-3.5 w-3.5" />,
            t('settings.sidebar.permissions')
          )}
        {canAccessDangerZone &&
          !isPersonalMode &&
          item(
            SettingsScreen.Danger,
            <AlertTriangle className="h-3.5 w-3.5" />,
            t('settings.sidebar.danger')
          )}
      </SidebarNavSection>
    </div>
  );
};

export default Sidebar;
