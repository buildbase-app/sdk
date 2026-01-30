import {
  AlertTriangle,
  CreditCard,
  SettingsIcon,
  ToggleRight,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import React from 'react';
import { useAppSelector } from '../../../contexts';
import { cn } from '../../../lib/utils';
import { IWorkspace } from '../types';
import type { WorkspaceSettingsSection } from './SettingsDialog';

interface Props {
  workspace: IWorkspace;
  section: WorkspaceSettingsSection;
  setSection: (section: WorkspaceSettingsSection) => void;
}

const Sidebar: React.FC<Props> = ({ workspace, section, setSection }) => {
  const currentUser = useAppSelector(state => state.auth.session?.user || null);

  const createdBy =
    typeof workspace.createdBy === 'object' && workspace.createdBy !== null
      ? workspace.createdBy._id
      : workspace.createdBy;
  const isCreatedByMe = createdBy === currentUser?.id;

  return (
    <div className="w-56 h-full flex flex-col space-y-6">
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
            <div className={cn('flex-1 min-w-0', !workspace.image ? 'pl-2' : '')}>
              <div className="font-medium text-sm line-clamp-1 text-ellipsis overflow-hidden">
                {workspace.name}
              </div>
              <div className="text-xs text-gray-500">{workspace.workspaceId}</div>
            </div>
          </div>
        </div>
      )}

      <SidebarSection title="Account">
        <SidebarItem
          activeSection={section}
          icon={<UserIcon className="h-3.5 w-3.5" />}
          label="Profile"
          section="profile"
          onClick={() => setSection('profile')}
        />
      </SidebarSection>
      <SidebarSection title="Workspace">
        <SidebarItem
          activeSection={section}
          icon={<SettingsIcon className="h-3.5 w-3.5" />}
          label="General"
          section="general"
          onClick={() => setSection('general')}
        />
        <SidebarItem
          activeSection={section}
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          label="Users"
          section="users"
          onClick={() => setSection('users')}
        />
        <SidebarItem
          activeSection={section}
          icon={<CreditCard className="h-3.5 w-3.5" />}
          label="Plan & Billing"
          section="subscription"
          onClick={() => setSection('subscription')}
        />
        <SidebarItem
          activeSection={section}
          icon={<ToggleRight className="h-3.5 w-3.5" />}
          label="Features"
          section="features"
          onClick={() => setSection('features')}
        />
        {isCreatedByMe && (
          <SidebarItem
            activeSection={section}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Danger Zone"
            section="danger"
            onClick={() => setSection('danger')}
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
        'flex w-full text-left px-2 py-1 rounded text-sm items-center gap-x-1',
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
