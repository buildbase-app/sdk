export interface ISettings {
  workspace: {
    roles: string[];
    defaultRole: string;
    maxWorkspaces: number;
    maxWorkspaceUsers: number;
  };
  [key: string]: any; // Allow for additional top-level settings
}
