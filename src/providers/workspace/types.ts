// Workspace context and API types

export interface IWorkspace {
  _id: string;
  name: string;
  image?: string;
  workspaceId: string;
  users: IUser[];
  roles: string[];
  createdBy: string | IUser;
  features: Record<string, boolean>;
}
export interface IWorkspaceFeature {
  _id: string;
  name: string;
  description: string;
  userManaged: boolean; // if true, the feature is managed by the user on the workspace setting page
  defaultValue: boolean;
  slug: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceUser {
  _id: string;
  workspace: string | IWorkspace;
  user: string | IUser;
  role: string;
}

export interface WorkspaceContextValue {
  workspaces: IWorkspace[];
  currentWorkspace: IWorkspace | null;
  loading: boolean;
  switchingToId: string | null;
  refreshing: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>; // Manual trigger to fetch workspaces
  refreshWorkspaces: () => Promise<void>;
}

// Import IUser from your main types if needed
import type { IUser } from '../../api/types';
