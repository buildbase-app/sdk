import {
  IPlanGroupResponse,
  IPlanGroupVersion,
  ISubscriptionResponse,
  ISubscriptionUpdateRequest,
  ISubscriptionUpdateResponse,
  IUser,
} from '../../api/types';
import { getAuthHeaders } from '../auth/utils';
import { ApiVersion, IOsConfig } from '../os/types';
import type { IWorkspace, IWorkspaceFeature, IWorkspaceUser } from './types';

export class WorkspaceApi {
  private version: ApiVersion;
  private orgId: string;
  private serverUrl: string;

  constructor(config: IOsConfig) {
    this.version = config.version;
    this.orgId = config.orgId;
    this.serverUrl = config.serverUrl;
  }

  getAuthHeader() {
    return getAuthHeaders();
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
  ): Promise<{
    userId: string;
    workspace: IWorkspace;
    message: string;
  }> {
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

  async removeUser(
    workspaceId: string,
    userId: string
  ): Promise<{
    userId: string;
    workspace: IWorkspace;
    message: string;
  }> {
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
  ): Promise<{
    userId: string;
    workspace: IWorkspace;
    message: string;
  }> {
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

  async getFeatures(): Promise<IWorkspaceFeature[]> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/features`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch features');
    return response.json();
  }

  async updateFeature(workspaceId: string, key: string, value: boolean): Promise<IWorkspace> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/features`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ features: { [key]: value } }),
      }
    );
    if (!response.ok) throw new Error('Failed to update feature');
    return response.json();
  }

  async getWorkspace(workspaceId: string): Promise<IWorkspace> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch workspace');
    return response.json();
  }

  async getProfile(): Promise<IUser> {
    const response = await fetch(`${this.serverUrl}/api/${this.version}/public/profile`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  }

  async updateUserProfile(config: Partial<IUser>): Promise<IUser> {
    const response = await fetch(`${this.serverUrl}/api/${this.version}/public/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to update user profile');
    return response.json();
  }

  // Subscription Management Methods

  /**
   * Get current subscription for a workspace
   * Returns subscription details including plan, plan version, and group information
   */
  async getCurrentSubscription(workspaceId: string): Promise<ISubscriptionResponse> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) {
      let errorMessage = 'Failed to fetch subscription';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        if (response.status === 404) {
          errorMessage = 'Workspace not found or no subscription available';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch subscription (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }
    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch subscription');
      }
      return result.data;
    }
    // If no success field, assume the response is the data directly
    return result;
  }

  /**
   * Get plan group for a workspace
   * Returns the plan group containing the current plan if subscription exists,
   * otherwise returns the latest published group
   */
  async getPlanGroup(workspaceId: string): Promise<IPlanGroupResponse> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription/plan-group`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) {
      let errorMessage = 'Failed to fetch plan group';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        if (response.status === 404) {
          errorMessage = 'No plan group found for this workspace';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch plan group (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }
    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch plan group');
      }
      return result.data;
    }
    // If no success field, assume the response is the data directly
    return result;
  }

  /**
   * Get plan group version details by ID
   * Returns the full plan group version with populated plan versions
   */
  async getPlanGroupVersion(groupVersionId: string): Promise<IPlanGroupVersion> {
    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/plan-group-versions/${groupVersionId}`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) {
      let errorMessage = 'Failed to fetch plan group version';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Plan group version not found';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch plan group version (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }
    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch plan group version');
      }
      return result.data;
    }
    // If no success field, assume the response is the data directly
    return result;
  }

  /**
   * Update subscription (upgrade/downgrade)
   * Only allows plan changes within the same plan group
   */
  async updateSubscription(
    workspaceId: string,
    planVersionId: string
  ): Promise<ISubscriptionUpdateResponse> {
    const requestBody: ISubscriptionUpdateRequest = { planVersionId };

    const response = await fetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to update subscription';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Failed to update subscription (${response.status}: ${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to update subscription');
      }
      return result.data;
    }
    // If no success field, assume the response is the data directly
    return result;
  }
}
