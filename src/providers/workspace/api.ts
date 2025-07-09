import { getAccessToken } from '../auth/utils';
import { IOsConfig } from '../os/types';
import type { IWorkspace, IWorkspaceUser } from './types';

export class WorkspaceApi {
  private version: string;
  private orgId: string;
  private serverUrl: string;

  constructor(config: IOsConfig) {
    this.version = config.version;
    this.orgId = config.orgId;
    this.serverUrl = config.serverUrl;
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

  async addUser(
    workspaceId: string,
    config: { email: string; role: string }
  ): Promise<IWorkspaceUser> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users/add`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(config),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to invite member');
    }
    return response.json();
  }

  async removeUser(workspaceId: string, userId: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users/${userId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove user');
    }
    return response.json();
  }

  async updateUser(
    workspaceId: string,
    userId: string,
    data: Partial<IWorkspaceUser>
  ): Promise<IWorkspaceUser> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users/${userId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update user');
    }
    return response.json();
  }
}
