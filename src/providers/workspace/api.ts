import { Context } from '../../api/context';
import { getAccessToken } from '../auth/utils';
import type { IWorkspace, IWorkspaceRole, IWorkspaceUser } from './types';

export class WorkspaceApi {
  private version: string;
  private orgId: string;
  private serverUrl: string;

  constructor(context: Context) {
    this.version = context.getVersion();
    this.orgId = context.getOrgId();
    this.serverUrl = context.getServerUrl();
  }

  getAuthHeader() {
    const token = getAccessToken();
    let headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async getWorkspaces(): Promise<IWorkspace[]> {
    const response = await fetch(`${this.serverUrl}/api/${this.version}/public/workspaces`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch workspaces');
    return response.json();
  }

  async createWorkspace(data: { name: string; image?: string }): Promise<IWorkspace> {
    const response = await fetch(`${this.serverUrl}/api/${this.version}/public/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create workspace');
    return response.json();
  }

  async updateWorkspace(id: string, data: Partial<IWorkspace>): Promise<IWorkspace> {
    const response = await fetch(`${this.serverUrl}/api/${this.version}/public/workspaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update workspace');
    return response.json();
  }

  async deleteWorkspace(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.serverUrl}/api/${this.version}/public/workspaces/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to delete workspace');
    return response.json();
  }

  async getWorkspaceUsers(workspaceId: string): Promise<IWorkspaceUser[]> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch workspace users');
    return response.json();
  }

  async addWorkspaceUser(
    workspaceId: string,
    userId: string,
    role: IWorkspaceRole
  ): Promise<IWorkspaceUser> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ orgId: this.orgId, userId, role }),
      }
    );
    if (!response.ok) throw new Error('Failed to add workspace user');
    return response.json();
  }

  async removeWorkspaceUser(workspaceId: string, userId: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users/${userId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) throw new Error('Failed to remove workspace user');
    return response.json();
  }

  async updateWorkspaceUserRole(
    workspaceId: string,
    userId: string,
    role: IWorkspaceRole
  ): Promise<IWorkspaceUser> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users/${userId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ orgId: this.orgId, role }),
      }
    );
    if (!response.ok) throw new Error('Failed to update workspace user role');
    return response.json();
  }
}
