// Workspace context and API types

export interface IWorkspace {
  _id: string;
  name: string;
  image?: string;
  workspaceId: string;
  users: (string | IUser)[];
  roles: string[];
  createdBy: string | IUser;
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
  switching: boolean;
  refreshing: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>; // Manual trigger to fetch workspaces
  refreshWorkspaces: () => Promise<void>;
}

import { ReactNode } from 'react';
// Import IUser from your main types if needed
import type { IUser } from '../../api/types';
