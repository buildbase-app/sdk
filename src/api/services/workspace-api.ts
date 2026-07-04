import { BaseApi } from '../../lib/api-base';
import {
  CheckoutResult,
  IAllQuotaUsageResponse,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IConsumeCreditsRequest,
  IConsumeCreditsResponse,
  ICreditBalance,
  ICreditBucketsQuery,
  ICreditBucketsResponse,
  ICreditPackage,
  ICreditPurchaseRequest,
  ICreditPurchaseResponse,
  ICreditTransactionsQuery,
  ICreditTransactionsResponse,
  IExpiringCreditsResponse,
  IInvoiceListResponse,
  IInvoiceResponse,
  IPasskeySummary,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionsResponse,
  IPublicCreditPackagesResponse,
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
} from '../types';
import type { IOsConfig, IWorkspace, IWorkspaceFeature, IWorkspaceUser } from './shared-types';

// ─── Notification Types ──────────────────────────────────────────

/** Data passed to a notification template for merge tag replacement. */
export interface NotificationData {
  /** Push notification title. Falls back to the event name if not provided. */
  title?: string;
  /** Primary message — used in email body and as push notification body. */
  message?: string;
  /** Custom icon URL for the push notification. Falls back to the org icon. */
  icon?: string;
  /** Large image URL displayed in the push notification body. */
  image?: string;
  /** Small monochrome icon for the status bar (Android/ChromeOS). */
  badge?: string;
  /** URL to open when the user clicks the push notification. Also available as {{url}} in email template. */
  url?: string;
  /** Tag to group/replace notifications. New notification with same tag replaces the previous one instead of stacking. */
  tag?: string;
  /** Action buttons displayed on the notification (max 2). */
  actions?: Array<{ action: string; title: string; icon?: string }>;
  /** Show notification without sound or vibration. */
  silent?: boolean;
  /** Keep notification visible until user interacts (no auto-dismiss). Useful for critical alerts. */
  requireInteraction?: boolean;
  /** Vibrate/sound again when replacing a notification with the same tag. Only works with `tag`. */
  renotify?: boolean;
  /** Custom timestamp (ms since epoch) displayed on the notification. */
  timestamp?: number;
  /** Text direction for title/body. */
  dir?: 'ltr' | 'rtl' | 'auto';
  /** Time-to-live in seconds. Push service discards the message if not delivered within this time. Default: 86400 (24h). */
  ttl?: number;
  /** Delivery urgency hint. Affects battery/delivery priority on mobile. */
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  /** ISO 8601 date string. Delays delivery until the specified time. */
  scheduledAt?: string;
  /**
   * Which channels to send on. Overrides the event's default channel config.
   * Omit to use the event's configured channels.
   *
   * @example
   * ```ts
   * // Only push, no email
   * { channels: { push: true } }
   *
   * // Only email, no push
   * { channels: { email: true } }
   * ```
   */
  channels?: {
    email?: boolean;
    push?: boolean;
  };
  /** Any additional merge tags available as {{key}} in the email template. */
  [key: string]: any;
}

/** Result of sending a notification. */
export interface NotificationResult {
  sent: boolean;
  /** Which channels were actually used. false = blocked by settings or missing template. */
  channels: {
    email: boolean;
    push: boolean;
  };
  /** Number of users notified. 1 for single user, N for whole workspace. */
  notifiedCount?: number;
  /** Reason if not sent (e.g., 'event_disabled'). Only present when sent=false. */
  reason?: string;
}

/** A notification event that end-users can manage in their workspace settings. */
export interface NotificationEvent {
  slug: string;
  name: string;
  description: string;
  category: string;
  channels: { email: boolean; push: boolean };
}

export class WorkspaceApi extends BaseApi {
  constructor(config: IOsConfig & { sessionId?: string; onUnauthorized?: () => void }) {
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

  async updateSettings(data: { permissions: Record<string, string[]> }): Promise<any> {
    return this.fetchJson(
      'workspaces/settings',
      { method: 'PATCH', body: JSON.stringify(data) },
      'Failed to update workspace settings'
    );
  }

  async updateWorkspacePermissions(
    workspaceId: string,
    permissions: Record<string, string[]>
  ): Promise<any> {
    return this.fetchJson(
      `workspaces/${workspaceId}/permissions`,
      { method: 'PATCH', body: JSON.stringify({ permissions }) },
      'Failed to update workspace permissions'
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

  // Passkey Management Methods
  // Registration is not available here: WebAuthn credentials are bound to the
  // hosted auth domain, so enrollment happens during sign-in on that domain.

  async getPasskeys(): Promise<IPasskeySummary[]> {
    const data = await this.fetchJson<{ passkeys: IPasskeySummary[] }>(
      'passkeys',
      {},
      'Failed to fetch passkeys'
    );
    return data?.passkeys ?? [];
  }

  async renamePasskey(passkeyId: string, name: string): Promise<void> {
    await this.fetchJson(
      `passkeys/${passkeyId}`,
      { method: 'PATCH', body: JSON.stringify({ name }) },
      'Failed to rename passkey'
    );
  }

  async deletePasskey(passkeyId: string): Promise<void> {
    await this.fetchJson(`passkeys/${passkeyId}`, { method: 'DELETE' }, 'Failed to remove passkey');
  }

  // Subscription Management Methods

  /**
   * Get current subscription for a workspace
   * Returns subscription details including plan, plan version, and group information
   */
  async getCurrentSubscription(workspaceId: string): Promise<ISubscriptionResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription`);
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch subscription');
    return this.unwrapResponse<ISubscriptionResponse>(response, 'Failed to fetch subscription');
  }

  /**
   * Get plan group for a workspace
   * Returns the plan group containing the current plan if subscription exists,
   * otherwise returns the latest published group
   */
  async getPlanGroup(workspaceId: string): Promise<IPlanGroupResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription/plan-group`);
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch plan group');
    return this.unwrapResponse<IPlanGroupResponse>(response, 'Failed to fetch plan group');
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
      `workspaces/${workspaceId}/subscription/plan-group?groupVersionId=${encodeURIComponent(groupVersionId)}`
    );
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch plan group version');
    return this.unwrapResponse<IPlanGroupResponse>(response, 'Failed to fetch plan group version');
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
    if (!response.ok)
      await this.throwResponseError(response, 'Failed to fetch plan group versions');
    return this.unwrapResponse<IPlanGroupVersionsResponse>(
      response,
      'Failed to fetch plan group versions'
    );
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch plans');
    return this.unwrapResponse<IPublicPlansResponse>(response, 'Failed to fetch plans');
  }

  /**
   * Get credit packages (public, no auth required).
   * Returns active credit packages for the org with pricing info.
   * Use this for public credit store pages.
   *
   * @returns Credit packages with pricing variants
   */
  async getPublicCreditPackages(): Promise<IPublicCreditPackagesResponse> {
    if (!this.orgId) throw new Error('orgId is required for getPublicCreditPackages');
    const response = await this.fetchResponse(`${this.orgId}/credit-packages`);
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch credit packages');
    return this.unwrapResponse<IPublicCreditPackagesResponse>(
      response,
      'Failed to fetch credit packages'
    );
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch plan group version');
    return this.unwrapResponse<IPlanGroupVersion>(response, 'Failed to fetch plan group version');
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to create checkout session');
    return this.unwrapResponse<CheckoutResult>(response, 'Failed to create checkout session');
  }

  async selectFreePlan(
    workspaceId: string,
    planVersionId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/select-free-plan`,
      {
        method: 'POST',
        body: JSON.stringify({ planVersionId }),
      }
    );
    if (!response.ok) await this.throwResponseError(response, 'Failed to select free plan');
    // Return full response — type includes success/message which callers may use
    return response.json();
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to update subscription');
    return this.unwrapResponse<ISubscriptionUpdateResponse | ICheckoutSessionResponse>(
      response,
      'Failed to update subscription'
    );
  }

  /**
   * Create a Stripe Customer Portal session for managing payment methods, invoices, etc.
   * Returns the portal URL — redirect user to it.
   */
  async createBillingPortalSession(
    workspaceId: string,
    returnUrl?: string
  ): Promise<{ url: string }> {
    return this.fetchJson(`workspaces/${workspaceId}/subscription/billing-portal`, {
      method: 'POST',
      body: JSON.stringify(returnUrl ? { returnUrl } : {}),
    });
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
      `workspaces/${workspaceId}/subscription/invoices?${params.toString()}`
    );
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch invoices');
    return this.unwrapResponse<IInvoiceListResponse>(response, 'Failed to fetch invoices');
  }

  /**
   * Get a single invoice by ID
   * @param workspaceId - The workspace ID
   * @param invoiceId - The invoice ID
   * @returns Invoice details
   */
  async getInvoice(workspaceId: string, invoiceId: string): Promise<IInvoiceResponse> {
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/invoices/${invoiceId}`
    );
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch invoice');
    return this.unwrapResponse<IInvoiceResponse>(response, 'Failed to fetch invoice');
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to cancel subscription');
    return this.unwrapResponse<ISubscriptionResponse>(response, 'Failed to cancel subscription');
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to resume subscription');
    return this.unwrapResponse<ISubscriptionResponse>(response, 'Failed to resume subscription');
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to record usage');
    return this.unwrapResponse<IRecordUsageResponse>(response, 'Failed to record usage');
  }

  /**
   * Record multiple quota usage entries in a single request.
   * Designed for backend-to-backend high-volume scenarios (bulk exports, batch jobs).
   * Max 100 items per request.
   *
   * @example
   * ```ts
   * await api.recordUsageBatch(workspaceId, {
   *   items: [
   *     { quotaSlug: 'images', quantity: 500, source: 'batch-export' },
   *     { quotaSlug: 'videos', quantity: 10, source: 'batch-export' },
   *   ]
   * });
   * ```
   */
  async recordUsageBatch(
    workspaceId: string,
    request: {
      items: Array<{
        quotaSlug: string;
        quantity: number;
        metadata?: Record<string, any>;
        source?: string;
        idempotencyKey?: string;
      }>;
    }
  ): Promise<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ success: boolean; quotaSlug: string; quantity: number; error?: string }>;
  }> {
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/subscription/usage/batch`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) await this.throwResponseError(response, 'Failed to record batch usage');
    return this.unwrapResponse(response, 'Failed to record batch usage');
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch quota usage status');
    return this.unwrapResponse<IQuotaUsageStatusResponse>(
      response,
      'Failed to fetch quota usage status'
    );
  }

  /**
   * Get usage status for all quotas in the workspace's current plan
   * @param workspaceId - The workspace ID
   * @returns All quota usage statuses keyed by quota slug
   */
  async getAllQuotaUsage(workspaceId: string): Promise<IAllQuotaUsageResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/subscription/usage/all`);
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch all quota usage');
    return this.unwrapResponse<IAllQuotaUsageResponse>(response, 'Failed to fetch all quota usage');
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch usage logs');
    return this.unwrapResponse<IUsageLogsResponse>(response, 'Failed to fetch usage logs');
  }

  // Notification Preferences

  // Notification Actions

  /**
   * Trigger a notification event for a workspace.
   * Respects all notification gates (org settings, event config, workspace preferences).
   *
   * @param workspaceId - The workspace context
   * @param event - The event slug (e.g., 'comment_added')
   * @param userId - The user to notify. Omit to notify all workspace members.
   * @param data - Template merge data. `message` is used as push body.
   *
   * @example
   * ```ts
   * // Notify a specific user
   * await api.sendNotification(workspaceId, 'comment_added', userId, {
   *   message: 'Alice commented on your project',
   * });
   *
   * // Notify all workspace members
   * await api.sendNotification(workspaceId, 'new_release', undefined, {
   *   message: 'Version 2.0 is now available!',
   * });
   * ```
   */
  async sendNotification(
    workspaceId: string,
    event: string,
    userId?: string,
    data?: NotificationData
  ): Promise<NotificationResult> {
    const body: Record<string, any> = { event };
    if (userId) body.userId = userId;
    if (data) body.data = data;

    return this.fetchJson(
      `workspaces/${workspaceId}/notifications/send`,
      { method: 'POST', body: JSON.stringify(body) },
      'Failed to send notification'
    );
  }

  // Notification Events & Preferences

  async getNotificationEvents(workspaceId: string): Promise<NotificationEvent[]> {
    return this.fetchJson(
      `workspaces/${workspaceId}/notification-events`,
      {},
      'Failed to fetch notification events'
    );
  }

  async getNotificationPreferences(
    workspaceId: string
  ): Promise<Record<string, { email?: boolean; push?: boolean }>> {
    const result = await this.fetchJson<{
      notificationPreferences: Record<string, { email?: boolean; push?: boolean }>;
    }>(
      `workspaces/${workspaceId}/notification-preferences`,
      {},
      'Failed to fetch notification preferences'
    );
    return result.notificationPreferences ?? {};
  }

  async updateNotificationPreferences(
    workspaceId: string,
    preferences: Record<string, { email?: boolean; push?: boolean }>
  ): Promise<Record<string, { email?: boolean; push?: boolean }>> {
    const result = await this.fetchJson<{
      notificationPreferences: Record<string, { email?: boolean; push?: boolean }>;
    }>(
      `workspaces/${workspaceId}/notification-preferences`,
      {
        method: 'PATCH',
        body: JSON.stringify({ notificationPreferences: preferences }),
      },
      'Failed to update notification preferences'
    );
    return result.notificationPreferences ?? {};
  }

  // ── Credit Methods ──────────────────────────────────────────────────────────

  /**
   * Get credit balance for a workspace.
   * @param workspaceId - The workspace ID
   * @returns Credit balance with available, totalGranted, totalConsumed, totalExpired, totalRefunded
   */
  async getCreditBalance(workspaceId: string): Promise<ICreditBalance> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/credits`);
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch credit balance');
    return this.unwrapResponse<ICreditBalance>(response, 'Failed to fetch credit balance');
  }

  /**
   * Consume credits from a workspace balance.
   * Throws an error with `code: 'INSUFFICIENT_CREDITS'` and `available`/`requested` fields on 402.
   * @param workspaceId - The workspace ID
   * @param request - Consume request with amount, optional description, idempotencyKey, metadata
   * @returns Consume result with consumed amount and balanceAfter
   */
  async consumeCredits(
    workspaceId: string,
    request: IConsumeCreditsRequest
  ): Promise<IConsumeCreditsResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/credits/consume`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      if (response.status === 402) {
        const errorData = await response.json().catch(() => ({}));
        const err: Error & { available?: number; requested?: number; code?: string } = new Error(
          errorData.message || 'Insufficient credits'
        );
        err.available = errorData.available;
        err.requested = errorData.requested;
        err.code = 'INSUFFICIENT_CREDITS';
        throw err;
      }
      await this.throwResponseError(response, 'Failed to consume credits');
    }
    return this.unwrapResponse<IConsumeCreditsResponse>(response, 'Failed to consume credits');
  }

  /**
   * Create a Stripe checkout session for purchasing a credit package.
   * Returns a checkout URL to redirect the user to.
   * @param workspaceId - The workspace ID
   * @param request - Purchase request with creditPackageId, successUrl, cancelUrl, optional currency
   * @returns Checkout session ID and URL
   */
  async purchaseCredits(
    workspaceId: string,
    request: ICreditPurchaseRequest
  ): Promise<ICreditPurchaseResponse> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/credits/purchase`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok)
      await this.throwResponseError(response, 'Failed to create credit purchase checkout');
    return this.unwrapResponse<ICreditPurchaseResponse>(
      response,
      'Failed to create credit purchase checkout'
    );
  }

  /**
   * List available credit packages for purchase.
   * Returns active, non-archived packages sorted by sortOrder then creditAmount.
   * @param workspaceId - The workspace ID
   * @returns Array of credit packages
   */
  async getCreditPackages(workspaceId: string): Promise<ICreditPackage[]> {
    const response = await this.fetchResponse(`workspaces/${workspaceId}/credits/packages`);
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch credit packages');
    const data = await this.unwrapResponse<any>(response, 'Failed to fetch credit packages');
    return data.docs ?? data;
  }

  /**
   * Get paginated credit transaction history.
   * @param workspaceId - The workspace ID
   * @param query - Optional filters: type, page, limit
   * @returns Paginated credit transactions
   */
  async getCreditTransactions(
    workspaceId: string,
    query?: ICreditTransactionsQuery
  ): Promise<ICreditTransactionsResponse> {
    const params = new URLSearchParams();
    if (query?.type) params.append('type', query.type);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    const url = `workspaces/${workspaceId}/credits/transactions${queryString ? `?${queryString}` : ''}`;

    const response = await this.fetchResponse(url);
    if (!response.ok)
      await this.throwResponseError(response, 'Failed to fetch credit transactions');
    return this.unwrapResponse<ICreditTransactionsResponse>(
      response,
      'Failed to fetch credit transactions'
    );
  }

  /**
   * Get paginated credit buckets.
   * @param workspaceId - The workspace ID
   * @param query - Optional filters: status, source, page, limit
   * @returns Paginated credit buckets
   */
  async getCreditBuckets(
    workspaceId: string,
    query?: ICreditBucketsQuery
  ): Promise<ICreditBucketsResponse> {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.source) params.append('source', query.source);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    const url = `workspaces/${workspaceId}/credits/buckets${queryString ? `?${queryString}` : ''}`;

    const response = await this.fetchResponse(url);
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch credit buckets');
    return this.unwrapResponse<ICreditBucketsResponse>(response, 'Failed to fetch credit buckets');
  }

  /**
   * Get credits expiring within N days.
   * @param workspaceId - The workspace ID
   * @param days - Look-ahead window in days (1-90, default 7)
   * @returns Expiring credits summary with bucket list
   */
  async getExpiringCredits(workspaceId: string, days?: number): Promise<IExpiringCreditsResponse> {
    const params = days ? `?days=${days}` : '';
    const response = await this.fetchResponse(
      `workspaces/${workspaceId}/credits/expiring${params}`
    );
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch expiring credits');
    return this.unwrapResponse<IExpiringCreditsResponse>(
      response,
      'Failed to fetch expiring credits'
    );
  }
}
