export type WorkspaceMode = 'personal' | 'platform';

export const WorkspaceModes = {
  Personal: 'personal' as const,
  Platform: 'platform' as const,
};

export interface ISettings {
  workspace: {
    roles: string[];
    defaultRole: string;
    maxWorkspaces: number;
    maxWorkspaceUsers: number;
    /** Workspace mode: 'personal' (solo) or 'platform' (multi-user, default) */
    mode: WorkspaceMode;
    /** Whether users can create workspaces. false = disabled, 'owner-only' = restricted */
    canCreateWorkspace: boolean | 'owner-only';
    /** Whether members can invite others. false = disabled, 'admin-only' = restricted */
    canInviteMembers: boolean | 'admin-only';
    /** Custom role→permission mapping. Overrides SDK defaults when provided by backend. */
    permissions?: Record<string, string[]>;
    /** Show workspace switcher in the UI */
    showSwitcher: boolean;
    /** Max workspaces a user can own. 0 = unlimited */
    maxWorkspacesPerUser: number;
    /** Auto-create workspace on first login */
    autoCreateFirst: boolean;
  };
  [key: string]: any;
}
