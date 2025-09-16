import { SettingsIcon, ToggleRight, UserIcon, UsersIcon } from 'lucide-react';
import React from 'react';
import { cn } from '../../../lib/utils';
import { IWorkspace } from '../types';
import type { WorkspaceSettingsSection } from './SettingsDialog';

interface Props {
  workspace: IWorkspace;
  section: WorkspaceSettingsSection;
  setSection: (section: WorkspaceSettingsSection) => void;
}

const Sidebar: React.FC<Props> = ({ workspace, section, setSection }) => {
  return (
    <div className="w-56 h-full flex flex-col px-2 py-2">
      {workspace && (
        <div className="mb-6 pb-4 border-b">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-medium px-0.5 py-0.5">
              <img src={workspace.image} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-medium text-sm">{workspace.name}</div>
              <div className="text-xs text-gray-500">{workspace.workspaceId}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="text-xs font-bold mb-2 text-gray-500 uppercase tracking-wide px-2">
          Account
        </div>
        <button
          className={cn(
            'flex w-full text-left px-2 py-1 rounded text-sm items-center gap-x-2',
            section === 'profile' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
          )}
          onClick={() => setSection('profile')}
        >
          <UserIcon className="h-4 w-4" /> Profile
        </button>
      </div>

      <div>
        <div className="text-xs font-bold mb-2 text-gray-500 uppercase tracking-wide px-2">
          Workspace
        </div>
        <button
          className={cn(
            'flex w-full text-left px-2 py-1 rounded text-sm items-center gap-x-2',
            section === 'general' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
          )}
          onClick={() => setSection('general')}
        >
          <SettingsIcon className="h-4 w-4" /> General
        </button>
        <button
          className={cn(
            'flex w-full text-left px-2 py-1 rounded text-sm items-center gap-x-2',
            section === 'users' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
          )}
          onClick={() => setSection('users')}
        >
          <UsersIcon className="h-4 w-4" /> Users
        </button>
        <button
          className={cn(
            'flex w-full text-left px-2 py-1 rounded text-sm items-center gap-x-2',
            section === 'features' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
          )}
          onClick={() => setSection('features')}
        >
          <ToggleRight className="h-4 w-4" /> Features
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
