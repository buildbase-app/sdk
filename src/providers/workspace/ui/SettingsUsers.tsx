import React from 'react';
import { useAppSelector } from '../../../store/hooks';
import { Button } from '../../../components/ui/button';
import { IUser } from '../../../api/types';
import { IWorkspace } from '../types';

const WorkspaceSettingsUsers: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const { user: currentUser } = useAppSelector(state => state.auth);

  if (!workspace) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Workspace Members</h2>
        <div className="text-gray-500">Loading workspace members...</div>
      </div>
    );
  }

  // Helper function to get user display info
  const getUserDisplay = (user: string | IUser) => {
    if (typeof user === 'string') {
      return { name: 'Unknown User', email: user, id: user };
    }
    return { name: user.name, email: user.email, id: user._id };
  };

  // Get workspace users, handling both string IDs and full user objects
  const workspaceUsers = workspace.users.map(user => getUserDisplay(user));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Workspace Members</h2>
      <div className="mb-4">
        <Button>Invite Member</Button>
      </div>
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">
          {workspaceUsers.length} member{workspaceUsers.length !== 1 ? 's' : ''}
        </div>
      </div>
      <ul className="space-y-2">
        {workspaceUsers.map((member, idx) => (
          <li key={idx} className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{member.name}</div>
                <div className="text-xs text-gray-500">{member.email}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {member.id === currentUser?.id && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
              )}
              {member.id !== currentUser?.id && (
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {workspaceUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">No members found in this workspace.</div>
      )}
    </div>
  );
};

export default WorkspaceSettingsUsers;
