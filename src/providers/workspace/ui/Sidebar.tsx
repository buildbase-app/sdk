import { useTranslation } from '../../../i18n';
import { useSaaSSettings } from '../../os/hooks';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CreditCard,
  SettingsIcon,
  ToggleRight,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import React from 'react';
import { cn } from '../../../lib/utils';
import { useSaaSAuth } from '../../auth/hooks';
import { WorkspaceModes } from '../../types';
import { IWorkspace } from '../types';
import { getWorkspaceUserRole } from '../utils';
import { SettingsScreen } from './SettingsDialog';
import type { WorkspaceSettingsSection } from './SettingsDialog';

interface Props {
  workspace: IWorkspace;
  section: WorkspaceSettingsSection;
  setSection: (section: WorkspaceSettingsSection) => void;
}

const Sidebar: React.FC<Props> = ({ workspace, section, setSection }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useSaaSAuth();
  const { settings } = useSaaSSettings();
  const isPersonalMode = settings?.workspace?.mode === WorkspaceModes.Personal;

  const createdBy =
    typeof workspace.createdBy === 'object' && workspace.createdBy !== null
      ? workspace.createdBy._id
      : workspace.createdBy;
  const isCreatedByMe = createdBy === currentUser?.id;
  const myRole = getWorkspaceUserRole(workspace, currentUser?.id ?? null);
  const canAccessDangerZone = isCreatedByMe || myRole?.toLowerCase() === 'admin';

  return (
    <div className="w-44 sm:w-56 h-full flex flex-col space-y-4 sm:space-y-6 shrink-0">
      {workspace && (
        <div className="border-b p-2 py-4">
          <div className="flex items-center gap-x-2">
            {workspace.image && workspace.image.trim() && (
              <div
                className="bg-blue-100 rounded flex items-center justify-center text-blue-600 font-medium px-0.5 py-0.5"
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
              <div className="text-xs text-gray-500">{workspace.workspaceId}</div>
            </div>
          </div>
        </div>
      )}

      <SidebarSection title={t("settings.sidebar.account")}>
        <SidebarItem
          activeSection={section}
          icon={<UserIcon className="h-3.5 w-3.5" />}
          label={t("settings.sidebar.profile")}
          section={SettingsScreen.Profile}
          onClick={() => setSection(SettingsScreen.Profile)}
        />
      </SidebarSection>
      <SidebarSection title={t("settings.sidebar.workspace")}>
        <SidebarItem
          activeSection={section}
          icon={<SettingsIcon className="h-3.5 w-3.5" />}
          label={t("settings.sidebar.general")}
          section={SettingsScreen.General}
          onClick={() => setSection(SettingsScreen.General)}
        />
        {!isPersonalMode && (
        <SidebarItem
          activeSection={section}
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          label={t("settings.sidebar.users")}
          section={SettingsScreen.Users}
          onClick={() => setSection(SettingsScreen.Users)}
        />
        )}
        <SidebarItem
          activeSection={section}
          icon={<CreditCard className="h-3.5 w-3.5" />}
          label={t("settings.sidebar.subscription")}
          section={SettingsScreen.Subscription}
          onClick={() => setSection(SettingsScreen.Subscription)}
        />
        <SidebarItem
          activeSection={section}
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          label={t("settings.sidebar.usage")}
          section={SettingsScreen.Usage}
          onClick={() => setSection(SettingsScreen.Usage)}
        />
        <SidebarItem
          activeSection={section}
          icon={<ToggleRight className="h-3.5 w-3.5" />}
          label={t("settings.sidebar.features")}
          section={SettingsScreen.Features}
          onClick={() => setSection(SettingsScreen.Features)}
        />
        <SidebarItem
          activeSection={section}
          icon={<Bell className="h-3.5 w-3.5" />}
          label={t("settings.sidebar.notifications")}
          section={SettingsScreen.Notifications}
          onClick={() => setSection(SettingsScreen.Notifications)}
        />
        {canAccessDangerZone && !isPersonalMode && (
          <SidebarItem
            activeSection={section}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label={t("settings.sidebar.danger")}
            section={SettingsScreen.Danger}
            onClick={() => setSection(SettingsScreen.Danger)}
          />
        )}
      </SidebarSection>
    </div>
  );
};

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 flex flex-col space-y-1">
      <div className="text-xs font-bold mb-2 text-gray-500 uppercase tracking-wide px-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  section,
  onClick,
  activeSection,
}: {
  icon: React.ReactNode;
  label: string;
  section: WorkspaceSettingsSection;
  onClick: (section: string) => void;
  activeSection: WorkspaceSettingsSection;
}) {
  return (
    <button
      className={cn(
        'flex w-full text-start px-2 py-1 rounded text-sm items-center gap-x-1',
        section === activeSection
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'hover:bg-gray-200 hover:text-gray-700'
      )}
      onClick={() => onClick(section)}
    >
      {icon}
      {label}
    </button>
  );
}

export default Sidebar;
