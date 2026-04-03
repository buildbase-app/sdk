import {
  IAllQuotaUsageResponse,
  CheckoutResult,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IInvoiceListResponse,
  IInvoiceResponse,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionsResponse,
  IPublicPlansResponse,
  IQuotaUsageStatusResponse,
  IRecordUsageRequest,
  IRecordUsageResponse,
  ISubscriptionResponse,
  ISubscriptionUpdateRequest,
  ISubscriptionUpdateResponse,
  IUsageLogsQuery,
  IUsageLogsResponse,
  IUser,
} from '../../api/types';
import { BaseApi } from '../../lib/api-base';
import { IOsConfig } from '../os/types';
import type { IWorkspace, IWorkspaceFeature, IWorkspaceUser } from './types';

export class WorkspaceApi extends BaseApi {
  constructor(config: IOsConfig) {
    super({ ...config, requireOrgId: true });
  }

  async getWorkspaces(): Promise<IWorkspace[]> {
    return this.fetchJson<IWorkspace[]>('workspaces', {}, 'Failed to fetch workspaces');
  }

  async createWorkspace(data: { name: string; image?: string }): Promise<IWorkspace> {
    return this.fetchJson<IWorkspace>(
      'workspaces',
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create workspace'
    );
  }

  async updateWorkspace(id: string, data: Partial<IWorkspace>): Promise<IWorkspace> {
    return this.fetchJson<IWorkspace>(
      `workspaces/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      'Failed to update workspace'
    );
  }

  async deleteWorkspace(id: string): Promise<{ success: boolean }> {
    return this.fetchJson<{ success: boolean }>(
      `workspaces/${id}`,
      { method: 'DELETE' },
      'Failed to delete workspace'
    );
  }

  async getWorkspaceUsers(workspaceId: string): Promise<IWorkspaceUser[]> {
    return this.fetchJson<IWorkspaceUser[]>(
      `workspaces/${workspaceId}/users`,
      {},
      'Failed to fetch workspace users'
    );
  }

  async addUser(
    workspaceId: string,
    config: { email: string; role: string }
  ): Promise<{ userId: string; workspace: IWorkspace; message: string }> {
    return this.fetchJson(
      `workspaces/${workspaceId}/users/add`,
      { method: 'POST', body: JSON.stringify(config) },
      'Failed to invite member'
    );
  }

  async removeUser(
    workspaceId: string,
    userId: string
  ): Promise<{ userId: string; workspace: IWorkspace; message: string }> {
    return this.fetchJson(
      `workspaces/${workspaceId}/users/${userId}`,
      { method: 'DELETE' },
      'Failed to remove user'
    );
  }

  async updateUser(
    workspaceId: string,
    userId: string,
    data: Partial<IWorkspaceUser>
  ): Promise<{ userId: string; workspace: IWorkspace; message: string }> {
    return this.fetchJson(
      `workspaces/${workspaceId}/users/${userId}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      'Failed to update user'
    );
  }

  async getFeatures(): Promise<IWorkspaceFeature[]> {
    return this.fetchJson<IWorkspaceFeature[]>(
      'workspaces/features',
      {},
      'Failed to fetch features'
    );
  }

  async updateFeature(workspaceId: string, key: string, value: boolean): Promise<IWorkspace> {
    return this.fetchJson<IWorkspace>(
      `workspaces/${workspaceId}/features`,
      {
        method: 'PATCH',
        body: JSON.stringify({ features: { [key]: value } }),
      },
      'Failed to update feature'
    );
  }

  async getWorkspace(workspaceId: string): Promise<IWorkspace> {
    return this.fetchJson<IWorkspace>(`workspaces/${workspaceId}`, {}, 'Failed to fetch workspace');
  }

  async getProfile(): Promise<IUser> {
    return this.fetchJson<IUser>('profile', {}, 'Failed to fetch profile');
  }

  async updateUserProfile(config: Partial<IUser>): Promise<IUser> {
    return this.fetchJson<IUser>(
      'profile',
      { method: 'PATCH', body: JSON.stringify(config) },
      'Failed to update user profile'
    );
  }

  // Subscription Management Methods

  /**
   * Get current subscription for a workspace
   * Returns subscription details including plan, plan version, and group information
   */
  async getCurrentSubscription(workspaceId: string): Promise<ISubscriptionResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription`);
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
      return result.data || result;
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
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription/plan-group`);
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
      return result.data || result;
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
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/plan-group?groupVersionId=${groupVersionId}`
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
      return result.data || result;
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
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/plan-group/versions`
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
      return result.data || result;
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
    if (!this.orgId) throw new Error('orgId is required for getPublicPlans');
    const response = await this.fetchResponse(`${this.orgId}/plans/${encodeURIComponent(slug)}`);
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
    const response = await this.fetchResponse(`plan-group-versions/${groupVersionId}`);
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
      return result.data || result;
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
  ): Promise<CheckoutResult> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription/checkout`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

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
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });

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
      return result.data || result;
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

    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/invoices?${params.toString()}`,
      {}
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
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/invoices/${invoiceId}`,
      {}
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

  /**
   * Cancel subscription at the end of the current billing period
   * Sets cancelAtPeriodEnd: true - subscription remains active until period ends
   * @param workspaceId - The workspace ID
   * @returns Updated subscription with cancelAtPeriodEnd and stripeCurrentPeriodEnd
   */
  async cancelSubscriptionAtPeriodEnd(workspaceId: string): Promise<ISubscriptionResponse> {
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/cancel-at-period-end`,
      { method: 'POST' }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to cancel subscription';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Subscription not found';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to cancel subscription (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to cancel subscription');
      }
      return result.data || result;
    }
    return result;
  }

  /**
   * Resume a subscription that was scheduled for cancellation
   * Sets cancelAtPeriodEnd: false - subscription will continue after period ends
   * @param workspaceId - The workspace ID
   * @returns Updated subscription with cancelAtPeriodEnd set to false
   */
  async resumeSubscription(workspaceId: string): Promise<ISubscriptionResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription/resume`, {
      method: 'POST',
    });

    if (!response.ok) {
      let errorMessage = 'Failed to resume subscription';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Subscription not found';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to resume subscription (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Handle both wrapped and direct response formats
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to resume subscription');
      }
      return result.data || result;
    }
    return result;
  }

  // Quota Usage Methods

  /**
   * Record quota usage for a workspace
   * @param workspaceId - The workspace ID
   * @param request - Usage request with quotaSlug, quantity, and optional metadata/source
   * @returns Usage result with consumed/included/available/overage
   */
  async recordUsage(
    workspaceId: string,
    request: IRecordUsageRequest
  ): Promise<IRecordUsageResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription/usage`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to record usage';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Failed to record usage (${response.status}: ${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to record usage');
      }
      return result.data || result;
    }
    return result;
  }

  /**
   * Get usage status for a single quota
   * @param workspaceId - The workspace ID
   * @param quotaSlug - The quota slug to check
   * @returns Quota usage status with consumed/included/available/overage/hasOverage
   */
  async getQuotaUsageStatus(
    workspaceId: string,
    quotaSlug: string
  ): Promise<IQuotaUsageStatusResponse> {
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/usage/status?quotaSlug=${encodeURIComponent(quotaSlug)}`
    );

    if (!response.ok) {
      let errorMessage = 'Failed to fetch quota usage status';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Workspace not found or no subscription available';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch quota usage status (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch quota usage status');
      }
      return result.data || result;
    }
    return result;
  }

  /**
   * Get usage status for all quotas in the workspace's current plan
   * @param workspaceId - The workspace ID
   * @returns All quota usage statuses keyed by quota slug
   */
  async getAllQuotaUsage(workspaceId: string): Promise<IAllQuotaUsageResponse> {
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/usage/all`
    );

    if (!response.ok) {
      let errorMessage = 'Failed to fetch all quota usage';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Workspace not found or no subscription available';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch all quota usage (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch all quota usage');
      }
      return result.data || result;
    }
    return result;
  }

  /**
   * Get paginated usage logs for a workspace
   * @param workspaceId - The workspace ID
   * @param query - Optional filters: quotaSlug, from, to, source, page, limit
   * @returns Paginated usage log entries
   */
  async getUsageLogs(workspaceId: string, query?: IUsageLogsQuery): Promise<IUsageLogsResponse> {
    const params = new URLSearchParams();
    if (query?.quotaSlug) params.append('quotaSlug', query.quotaSlug);
    if (query?.from) params.append('from', query.from);
    if (query?.to) params.append('to', query.to);
    if (query?.source) params.append('source', query.source);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    const url = `workspaces/${workspaceId}/subscription/usage/logs${queryString ? `?${queryString}` : ''}`;

    const response = await this.fetchResponse(url);

    if (!response.ok) {
      let errorMessage = 'Failed to fetch usage logs';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        if (response.status === 404) {
          errorMessage = 'Workspace not found';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your session';
        } else {
          errorMessage = `Failed to fetch usage logs (${response.status}: ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result.success !== undefined) {
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch usage logs');
      }
      return result.data || result;
    }
    return result;
  }

}
