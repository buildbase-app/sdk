// Workspace context and API types

export interface IWorkspace {
  _id: string;
  name: string;
  image?: string;
  workspaceId: string;
  users: (string | IUser)[];
  createdBy: string | IUser;
}

export type IWorkspaceRole = 'workspace_admin' | 'workspace_user';

export interface IWorkspaceUser {
  _id: string;
  workspace: string | IWorkspace;
  user: string | IUser;
  role: IWorkspaceRole;
}

export interface WorkspaceContextValue {
  workspaces: IWorkspace[];
  currentWorkspace: IWorkspace | null;
  loading: boolean;
  switching: boolean;
  error: string | null;
  switchWorkspace: (id: string) => void;
  openWorkspaceSettings: () => void;
  workspacesDropdownProps: {
    value: string | undefined;
    onChange: (id: string) => void;
    options: { value: string; label: string }[];
    loading: boolean;
    switching: boolean;
  };
  refreshWorkspaces: () => Promise<void>;
  loadingRefresh: boolean;
}

// Import IUser from your main types if needed
import type { IUser } from '../../api/types';
