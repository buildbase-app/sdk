import { SelectValue } from '@radix-ui/react-select';
import { Loader2, TrashIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { IUser } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../components/ui/select';
import { handleError } from '../../../lib/error-handler';
import { useSaaSAuth } from '../../auth/hooks';
import { useSaaSSettings } from '../../os/hooks';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace, IWorkspaceUser } from '../types';
import { isWorkspaceOwner } from '../utils';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsUsers: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const { user: currentUser } = useSaaSAuth();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<IWorkspaceUser[]>([]);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const { getUsers, removeUser, updateUser } = useSaaSWorkspaces();
  const { settings } = useSaaSSettings();

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    getUsers(workspace._id)
      .then(users => {
        setWorkspaceUsers(users);
      })
      .catch(error => {
        handleError(error, {
          component: 'WorkspaceSettingsUsers',
          action: 'getUsers',
          metadata: { workspaceId: workspace._id },
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspace, refreshCounter]);

  const refresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  if (loading || !workspace) {
    return <SettingSkeleton />;
  }

  // Helper function to get user display info
  const getUserDisplay = (user: string | IUser) => {
    if (typeof user === 'string') {
      return { name: 'Unknown User', email: user, id: user, role: '-' };
    }
    return { name: user.name, email: user.email, id: user._id };
  };

  const finalUsers = workspaceUsers.map(user => ({
    ...user,
    ...getUserDisplay(user.user),
  }));

  const handleRemoveUser = (userId: string) => {
    // Check if user is the owner
    if (isWorkspaceOwner(workspace, userId)) {
      handleError(new Error('Cannot remove the workspace owner'), {
        component: 'WorkspaceSettingsUsers',
        action: 'handleRemoveUser',
        metadata: { workspaceId: workspace._id, userId },
      });
      return;
    }

    removeUser(workspace._id, userId)
      .then(() => {
        refresh();
      })
      .catch(error => {
        handleError(error, {
          component: 'WorkspaceSettingsUsers',
          action: 'handleRemoveUser',
          metadata: { workspaceId: workspace._id, userId },
        });
      });
  };

  const handleUpdateRole = (workspaceId: string, userId: string, role: string) => {
    // Check if user is the owner
    if (isWorkspaceOwner(workspace, userId)) {
      handleError(new Error('Cannot change the role of the workspace owner'), {
        component: 'WorkspaceSettingsUsers',
        action: 'handleUpdateRole',
        metadata: { workspaceId, userId, role },
      });
      return;
    }

    setUpdatingRoleUserId(userId);
    updateUser(workspaceId, userId, { role })
      .then(() => {
        refresh();
      })
      .catch(error => {
        handleError(error, {
          component: 'WorkspaceSettingsUsers',
          action: 'handleUpdateRole',
          metadata: { workspaceId, userId, role },
        });
      })
      .finally(() => {
        setUpdatingRoleUserId(null);
      });
  };

  const myRole = workspaceUsers.find(user => {
    const id = typeof user.user === 'string' ? user.user : user.user._id;
    return id === currentUser?.id;
  })?.role;

  const amIAdmin = myRole === 'admin';

  const totalAllowedUsers = settings?.workspace.maxWorkspaceUsers ?? Number.MAX_VALUE;
  const currentUsersCount = workspaceUsers.length;
  const allowedToInviteUser = totalAllowedUsers > (currentUsersCount ?? 0);

  return (
    <div>
      {!amIAdmin && (
        <div className="text-red-500">Only workspace admin can manage users and roles.</div>
      )}

      {amIAdmin && (
        <div className="mb-4">
          {allowedToInviteUser && <InviteMember onInvite={refresh} workspaceId={workspace._id} />}
          {!allowedToInviteUser && (
            <div className="text-red-500">
              You have reached the maximum number of users for this workspace.
            </div>
          )}
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600 mb-2">
            {workspaceUsers.length} member{workspaceUsers.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div>
          <Button variant="ghost" size="sm" onClick={refresh} progress={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {finalUsers.map((member, idx) => {
          const myself = member.id === currentUser?.id;
          const createdBy =
            typeof workspace.createdBy === 'object' && workspace.createdBy !== null
              ? workspace.createdBy._id
              : workspace.createdBy;
          const isOwner = createdBy === member.id;
          return (
            <li key={idx} className="flex items-center justify-between border rounded p-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-xs text-gray-500">{member.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-x-1">
                <div className="relative">
                  <Select
                    disabled={myself || !amIAdmin || isOwner || updatingRoleUserId === member.id}
                    value={member.role}
                    onValueChange={value => handleUpdateRole(workspace._id, member.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspace?.roles.map(role => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingRoleUserId === member.id && (
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    </div>
                  )}
                </div>
                {myself && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
                )}
                {isOwner && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Owner
                  </span>
                )}
                {!myself && !isOwner && amIAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    startIcon={<TrashIcon />}
                    onClick={() => {
                      handleRemoveUser(member.id);
                    }}
                  ></Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {workspaceUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">No members found in this workspace.</div>
      )}
    </div>
  );
};

function InviteMember({ onInvite, workspaceId }: { onInvite: () => void; workspaceId: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('admin');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { addUser, getWorkspace } = useSaaSWorkspaces();

  useEffect(() => {
    return () => { clearTimeout(messageTimerRef.current); };
  }, []);
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const { settings } = useSaaSSettings();
  const roles = settings?.workspace.roles ?? workspace?.roles ?? [];

  useEffect(() => {
    if (!workspaceId) return;
    getWorkspace(workspaceId).then(setWorkspace);
  }, [workspaceId]);

  const handleInvite = async () => {
    const emailValue = email.trim();
    if (!emailValue) {
      setError('Email is required');
      return;
    }

    // check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // simple email validation
    if (!emailRegex.test(emailValue)) {
      setError('Invalid email address format');
      return;
    }

    setInviting(true);

    await addUser(workspaceId, emailValue, role)
      .then(() => {
        setSuccess('User invited successfully');
        onInvite?.();
      })
      .catch(error => {
        handleError(error, {
          component: 'InviteMember',
          action: 'addUser',
          metadata: { workspaceId, email: emailValue, role },
        });
        setError(error instanceof Error ? error.message : 'Failed to invite member');
      })
      .finally(() => {
        setInviting(false);

        clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => {
          clearMessages();
        }, 6000);
      });
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setEmail('');
    setRole('admin');
  };

  return (
    <div className="flex gap-2 flex-col gap-y-2">
      {error && <div className="text-red-500 capitalize">{error}</div>}
      {success && <div className="text-green-500 capitalize">{success}</div>}
      <div>
        <Label>Invite member by email</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="example@example.com"
        />
      </div>
      <div>
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button progress={inviting} onClick={handleInvite} disabled={inviting || !email || !role}>
          {inviting ? 'Inviting...' : `Invite as ${role}`}
        </Button>
      </div>
    </div>
  );
}

export default WorkspaceSettingsUsers;
