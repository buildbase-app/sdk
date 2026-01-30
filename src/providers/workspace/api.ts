import {
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IInvoiceListResponse,
  IInvoiceResponse,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionsResponse,
  IPublicPlansResponse,
  ISubscriptionResponse,
  ISubscriptionUpdateRequest,
  ISubscriptionUpdateResponse,
  IUser,
} from '../../api/types';
import { handleApiResponse, safeFetch } from '../../lib/api-utils';
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
    const response = await safeFetch(`${this.serverUrl}/api/${this.version}/public/workspaces`, {
      headers: this.getAuthHeader(),
    });
    return handleApiResponse<IWorkspace[]>(response, 'Failed to fetch workspaces');
  }

  async createWorkspace(data: { name: string; image?: string }): Promise<IWorkspace> {
    const response = await safeFetch(`${this.serverUrl}/api/${this.version}/public/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleApiResponse<IWorkspace>(response, 'Failed to create workspace');
  }

  async updateWorkspace(id: string, data: Partial<IWorkspace>): Promise<IWorkspace> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(data),
      }
    );
    return handleApiResponse<IWorkspace>(response, 'Failed to update workspace');
  }

  async deleteWorkspace(id: string): Promise<{ success: boolean }> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${id}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      }
    );
    return handleApiResponse<{ success: boolean }>(response, 'Failed to delete workspace');
  }

  async getWorkspaceUsers(workspaceId: string): Promise<IWorkspaceUser[]> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users`,
      {
        headers: this.getAuthHeader(),
      }
    );
    return handleApiResponse<IWorkspaceUser[]>(response, 'Failed to fetch workspace users');
  }

  async addUser(
    workspaceId: string,
    config: { email: string; role: string }
  ): Promise<{
    userId: string;
    workspace: IWorkspace;
    message: string;
  }> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users/add`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(config),
      }
    );
    return handleApiResponse<{
      userId: string;
      workspace: IWorkspace;
      message: string;
    }>(response, 'Failed to invite member');
  }

  async removeUser(
    workspaceId: string,
    userId: string
  ): Promise<{
    userId: string;
    workspace: IWorkspace;
    message: string;
  }> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/users/${userId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      }
    );
    return handleApiResponse<{
      userId: string;
      workspace: IWorkspace;
      message: string;
    }>(response, 'Failed to remove user');
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
    const response = await safeFetch(
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
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/features`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch features');
    return response.json();
  }

  async updateFeature(workspaceId: string, key: string, value: boolean): Promise<IWorkspace> {
    const response = await safeFetch(
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
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch workspace');
    return response.json();
  }

  async getProfile(): Promise<IUser> {
    const response = await safeFetch(`${this.serverUrl}/api/${this.version}/public/profile`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  }

  async updateUserProfile(config: Partial<IUser>): Promise<IUser> {
    const response = await safeFetch(`${this.serverUrl}/api/${this.version}/public/profile`, {
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
    const response = await safeFetch(
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
    const response = await safeFetch(
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
   * Get plan group for a workspace with a specific version
   * @param workspaceId - The workspace ID
   * @param groupVersionId - The plan group version ID to fetch
   * @returns Plan group response with the specified version
   */
  async getPlanGroupByVersion(
    workspaceId: string,
    groupVersionId: string
  ): Promise<IPlanGroupResponse> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription/plan-group?groupVersionId=${groupVersionId}`,
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
   * Get current group version and available newer versions of the same group
   * - If user has active subscription: returns their current group version + newer versions
   * - If no subscription: returns the latest published group version
   * Shows what's new in newer versions to help users upgrade
   * Example: User on Group v1 (Basic Plan) can see Group v2 (Basic + Pro Plan)
   * @param workspaceId - The workspace ID
   * @returns Plan group versions response with currentVersion and availableVersions
   */
  async getPlanGroupVersions(workspaceId: string): Promise<IPlanGroupVersionsResponse> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription/plan-group/versions`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) {
      let errorMessage = 'Failed to fetch plan group versions';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'No plan group versions found';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch plan group versions (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }
    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch plan group versions');
      }
      return result.data;
    }
    // If no success field, assume the response is the data directly
    return result;
  }

  /**
   * Get plan group versions by slug (public, no auth required).
   * Returns the latest published plan group versions for the given plan group slug.
   * Use this for public pricing pages when you want to show a specific plan group.
   *
   * @param slug - Plan group slug (e.g. 'default', 'enterprise')
   * @returns Plan group versions response with currentVersion and availableVersions
   */
  async getPublicPlans(slug: string): Promise<IPublicPlansResponse> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/${this.orgId}/plans/${encodeURIComponent(slug)}`,
      {
        headers: this.getAuthHeader(),
      }
    );
    if (!response.ok) {
      let errorMessage = 'Failed to fetch plans';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = `Plans "${slug}" not found`;
        } else {
          errorMessage = `Failed to fetch plans (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }
    const result = await response.json();
    if (result.success !== undefined && !result.success) {
      throw new Error(result.message || 'Failed to fetch plans');
    }
    return result.data ?? result;
  }

  /**
   * Get plan group version details by ID (public, no auth required).
   * Returns the full plan group version with populated plan versions.
   * Use this for public pricing pages when you have the groupVersionId (e.g. from config or URL).
   *
   * @param groupVersionId - The plan group version ID to fetch
   * @returns Plan group version with populated plan versions
   */
  async getPlanGroupVersion(groupVersionId: string): Promise<IPlanGroupVersion> {
    const response = await safeFetch(
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
   * Create checkout session for new subscription
   * @param workspaceId - The workspace ID
   * @param request - Checkout session request with planVersionId and optional billing interval/URLs
   * @returns Checkout session response with checkoutUrl to redirect user
   */
  async createCheckoutSession(
    workspaceId: string,
    request: ICheckoutSessionRequest
  ): Promise<ICheckoutSessionResponse> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription/checkout`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to create checkout session';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Failed to create checkout session (${response.status}: ${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to create checkout session');
      }
      return result.data || result;
    }
    // If no success field, assume the response is the data directly
    return result;
  }

  /**
   * Update subscription (upgrade/downgrade)
   * Only allows plan changes within the same plan group
   * Returns checkout session if payment is required, otherwise returns subscription update response
   */
  async updateSubscription(
    workspaceId: string,
    request: ISubscriptionUpdateRequest
  ): Promise<ISubscriptionUpdateResponse | ICheckoutSessionResponse> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(request),
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
      // Check if response contains checkoutUrl (checkout session) or subscription data
      if (result.data?.checkoutUrl || result.checkoutUrl) {
        return result.data || result;
      }
      return result.data;
    }
    // If no success field, check if it's a checkout session response
    if (result.checkoutUrl) {
      return result;
    }
    // Otherwise assume it's the subscription update response
    return result;
  }

  /**
   * List invoices for a workspace subscription
   * @param workspaceId - The workspace ID
   * @param limit - Number of invoices to return (default: 10)
   * @param startingAfter - Invoice ID to start after (for pagination)
   * @returns List of invoices with pagination info
   */
  async listInvoices(
    workspaceId: string,
    limit: number = 10,
    startingAfter?: string
  ): Promise<IInvoiceListResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startingAfter) {
      params.append('starting_after', startingAfter);
    }

    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription/invoices?${params.toString()}`,
      {
        headers: this.getAuthHeader(),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to fetch invoices';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Workspace not found or no invoices available';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch invoices (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch invoices');
      }
      return result;
    }
    // If no success field, assume the response is the data directly
    return result;
  }

  /**
   * Get a single invoice by ID
   * @param workspaceId - The workspace ID
   * @param invoiceId - The invoice ID
   * @returns Invoice details
   */
  async getInvoice(workspaceId: string, invoiceId: string): Promise<IInvoiceResponse> {
    const response = await safeFetch(
      `${this.serverUrl}/api/${this.version}/public/workspaces/${workspaceId}/subscription/invoices/${invoiceId}`,
      {
        headers: this.getAuthHeader(),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to fetch invoice';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Invoice not found';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch invoice (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch invoice');
      }
      return result;
    }
    // If no success field, assume the response is the data directly
    return result;
  }
}
