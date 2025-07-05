import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useSaaSWorkspaces } from '../../hooks/use-workspace';

interface WorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

const SIDEBAR_SECTIONS = [
  { key: 'preferences', label: 'Preferences' },
  { key: 'people', label: 'People' },
];

export const WorkspaceDialog: React.FC<WorkspaceDialogProps> = ({
  open,
  onOpenChange,
  onClose,
}) => {
  const {
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    deleteWorkspace,
    getWorkspaceUsers,
    addWorkspaceUser,
    removeWorkspaceUser,
    updateWorkspaceUserRole,
  } = useSaaSWorkspaces();

  const [selectedSection, setSelectedSection] = useState('preferences');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserRole, setAddUserRole] = useState<'workspace_admin' | 'workspace_user'>(
    'workspace_user'
  );

  React.useEffect(() => {
    if (open) fetchWorkspaces();
  }, [open, fetchWorkspaces]);

  // When dialog opens, reset to Preferences
  React.useEffect(() => {
    if (open) setSelectedSection('preferences');
  }, [open]);

  // --- Preferences Section (placeholder) ---
  const PreferencesContent = (
    <div>
      <h2 className="text-lg font-semibold mb-4">Preferences</h2>
      <div className="mb-4">
        <div className="font-medium mb-1">Appearance</div>
        <div className="text-sm text-muted-foreground">
          Customize how your workspace looks on your device.
        </div>
      </div>
      <div className="mb-4">
        <div className="font-medium mb-1">Language & Time</div>
        <div className="text-sm text-muted-foreground">
          Change language, timezone, and calendar settings.
        </div>
      </div>
      <div className="mb-4">
        <div className="font-medium mb-1">Desktop app</div>
        <div className="text-sm text-muted-foreground">Settings for desktop experience.</div>
      </div>
      <div className="text-xs text-muted-foreground">
        (Preferences section is a placeholder. Customize as needed.)
      </div>
    </div>
  );

  // --- People Section ---
  const handleSelectWorkspace = async (id: string) => {
    setSelectedWorkspace(id);
    setUserLoading(true);
    setUserError(null);
    try {
      const users = await getWorkspaceUsers(id);
      setUsers(users);
    } catch (e: any) {
      setUserError(e.message || 'Failed to load users');
    } finally {
      setUserLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedWorkspace || !addUserEmail) return;
    await addWorkspaceUser(selectedWorkspace, addUserEmail, addUserRole);
    setAddUserEmail('');
    handleSelectWorkspace(selectedWorkspace);
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedWorkspace) return;
    await removeWorkspaceUser(selectedWorkspace, userId);
    handleSelectWorkspace(selectedWorkspace);
  };

  const handleRoleChange = async (userId: string, role: 'workspace_admin' | 'workspace_user') => {
    if (!selectedWorkspace) return;
    await updateWorkspaceUserRole(selectedWorkspace, userId, role);
    handleSelectWorkspace(selectedWorkspace);
  };

  const PeopleContent = (
    <div>
      <h2 className="text-lg font-semibold mb-4">People</h2>
      <div className="mb-2">Select a workspace to manage users:</div>
      <ul className="mb-4">
        {workspaces.map(ws => (
          <li key={ws._id} className="flex items-center justify-between py-1 border-b">
            <span>{ws.name}</span>
            <Button
              size="sm"
              variant={selectedWorkspace === ws._id ? 'default' : 'outline'}
              onClick={() => handleSelectWorkspace(ws._id)}
            >
              {selectedWorkspace === ws._id ? 'Selected' : 'Manage Users'}
            </Button>
          </li>
        ))}
      </ul>
      {selectedWorkspace && (
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Users</h4>
          {userError && <div className="text-red-500">{userError}</div>}
          {userLoading ? (
            <div>Loading users...</div>
          ) : (
            <>
              <ul className="mb-2">
                {users.map(u => (
                  <li key={u.user._id || u.user} className="flex items-center justify-between py-1">
                    <span>{u.user.name || u.user.email || u.user}</span>
                    <div className="flex gap-2 items-center">
                      <select
                        value={u.role}
                        onChange={e =>
                          handleRoleChange(u.user._id || u.user, e.target.value as any)
                        }
                        className="border rounded px-2 py-1"
                      >
                        <option value="workspace_admin">Admin</option>
                        <option value="workspace_user">User</option>
                      </select>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveUser(u.user._id || u.user)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="User email or ID"
                  value={addUserEmail}
                  onChange={e => setAddUserEmail(e.target.value)}
                />
                <select
                  value={addUserRole}
                  onChange={e => setAddUserRole(e.target.value as any)}
                  className="border rounded px-2 py-1"
                >
                  <option value="workspace_admin">Admin</option>
                  <option value="workspace_user">User</option>
                </select>
                <Button size="sm" onClick={handleAddUser} disabled={!addUserEmail}>
                  Add User
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // --- Main Render ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="flex h-[600px] w-full">
          {/* Sidebar */}
          <aside className="w-64 bg-muted/40 border-r flex flex-col py-6 px-4">
            <div className="mb-6 font-bold text-lg">Workspace Settings</div>
            <nav className="flex-1">
              <ul>
                {SIDEBAR_SECTIONS.map(section => (
                  <li key={section.key}>
                    <button
                      className={`w-full text-left px-2 py-2 rounded hover:bg-muted transition font-medium ${selectedSection === section.key ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedSection(section.key)}
                    >
                      {section.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          {/* Main Content */}
          <main className="flex-1 p-8 overflow-y-auto">
            {selectedSection === 'preferences' && PreferencesContent}
            {selectedSection === 'people' && PeopleContent}
          </main>
        </div>
        <DialogFooter className="border-t p-4">
          <DialogClose asChild>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
