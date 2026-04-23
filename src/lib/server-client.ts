/**
 * Server-side BuildBase SDK — Auth.js-style configuration pattern.
 *
 * Configure once, use everywhere. Session is resolved automatically.
 *
 * @example 1. Configure once (lib/buildbase.ts)
 * ```ts
 * import BuildBase from "@buildbase/sdk"
 * import { cookies } from "next/headers"
 *
 * export const { auth, workspace, subscription, usage } = BuildBase({
 *   serverUrl: process.env.BUILDBASE_URL!,
 *   orgId: process.env.BUILDBASE_ORG_ID!,
 *   getSessionId: async () => {
 *     const c = await cookies()
 *     return c.get("bb-session-id")?.value ?? null
 *   },
 * })
 * ```
 *
 * @example 2. Use in API routes — no sessionId passing needed
 * ```ts
 * import { auth, workspace, subscription } from "@/lib/buildbase"
 *
 * export async function GET() {
 *   const session = await auth()
 *   if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
 *
 *   const workspaces = await workspace.list()
 *   const sub = await subscription.get(workspaceId)
 *   return Response.json({ workspaces, sub })
 * }
 * ```
 *
 * @example 3. Background jobs — override session for service accounts
 * ```ts
 * import { client } from "@/lib/buildbase"
 *
 * const api = client.forSession(process.env.SERVICE_SESSION_ID!)
 * await api.workspace.recordUsage(workspaceId, { quotaSlug: "uploads", quantity: 1 })
 * ```
 */

import { PushApi, SettingsApi, UserApi, WorkspaceApi } from '../api/services';
import type {
  ApiVersion,
  ISettings,
  IWorkspace,
  IWorkspaceFeature,
  IWorkspaceUser,
} from '../api/services/shared-types';
import type {
  CheckoutResult,
  IAllQuotaUsageResponse,
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
} from '../api/types';
import { hasPermission, resolvePermissions } from './permissions';

// ─── Config ────────────────────────────────────────────────────────────────────

export interface BuildBaseConfig {
  /** Base URL of the BuildBase API server */
  serverUrl: string;
  /** Organization ID */
  orgId: string;
  /** API version (default: 'v1') */
  version?: ApiVersion;

  /**
   * Async callback to resolve the current session ID.
   * Called automatically before each authenticated API call.
   *
   * @example Next.js (httpOnly cookie)
   * ```ts
   * getSessionId: async () => {
   *   const c = await cookies()
   *   return c.get("bb-session-id")?.value ?? null
   * }
   * ```
   *
   * @example Express (from request — use withSession() instead)
   * ```ts
   * // Don't set getSessionId for Express. Use withSession(req.sessionId) per-request.
   * ```
   */
  getSessionId?: () => Promise<string | null>;

  /**
   * Request timeout in milliseconds. (default: 30000 — 30 seconds)
   * Set to 0 to disable timeout.
   */
  timeout?: number;

  /**
   * Maximum number of automatic retries for transient network failures.
   * Uses exponential backoff. (default: 0 — no retries)
   * Only retries on network errors and 5xx responses, never on 4xx.
   */
  maxRetries?: number;

  /**
   * Enable debug logging. Logs all API requests/responses to console.
   * (default: false)
   */
  debug?: boolean;

  /**
   * Custom headers merged into every request.
   * Useful for proxies, tracing, or custom auth schemes.
   *
   * @example
   * ```ts
   * headers: {
   *   'X-Request-Source': 'backend-cron',
   *   'X-Trace-Id': traceId,
   * }
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Called when any API request fails. Use for centralized error logging.
   * The error is still thrown after this callback runs.
   *
   * @example
   * ```ts
   * onError: (error, context) => {
   *   Sentry.captureException(error, { extra: context })
   * }
   * ```
   */
  onError?: (error: Error, context: { method: string; path: string }) => void;

  /**
   * Custom fetch implementation. Replaces the global `fetch`.
   * Useful for testing, proxying, or adding middleware.
   *
   * @example Using undici for Node.js
   * ```ts
   * import { fetch } from 'undici'
   * { fetch: fetch as any }
   * ```
   */
  fetch?: typeof globalThis.fetch;
}

// ─── Auth result ───────────────────────────────────────────────────────────────

export interface BuildBaseSession {
  sessionId: string;
}

// ─── Action interfaces ─────────────────────────────────────────────────────────

export interface WorkspaceActions {
  list(): Promise<IWorkspace[]>;
  get(workspaceId: string): Promise<IWorkspace>;
  create(data: { name: string; image?: string }): Promise<IWorkspace>;
  update(workspaceId: string, data: Partial<IWorkspace>): Promise<IWorkspace>;
  delete(workspaceId: string): Promise<{ success: boolean }>;
}

export interface UserActions {
  list(workspaceId: string): Promise<IWorkspaceUser[]>;
  invite(
    workspaceId: string,
    email: string,
    role: string
  ): Promise<{ userId: string; workspace: IWorkspace; message: string }>;
  remove(
    workspaceId: string,
    userId: string
  ): Promise<{ userId: string; workspace: IWorkspace; message: string }>;
  updateRole(
    workspaceId: string,
    userId: string,
    role: string
  ): Promise<{ userId: string; workspace: IWorkspace; message: string }>;
  getProfile(): Promise<IUser>;
  updateProfile(data: Partial<IUser>): Promise<IUser>;
}

export interface SubscriptionActions {
  get(workspaceId: string): Promise<ISubscriptionResponse>;
  checkout(
    workspaceId: string,
    request: ICheckoutSessionRequest
  ): Promise<CheckoutResult | ICheckoutSessionResponse>;
  update(
    workspaceId: string,
    request: ISubscriptionUpdateRequest
  ): Promise<ISubscriptionUpdateResponse | ICheckoutSessionResponse>;
  cancel(workspaceId: string): Promise<ISubscriptionResponse>;
  resume(workspaceId: string): Promise<ISubscriptionResponse>;
  getBillingPortalUrl(workspaceId: string, returnUrl?: string): Promise<{ url: string }>;
}

export interface PlanActions {
  getGroup(workspaceId: string): Promise<IPlanGroupResponse>;
  getVersions(workspaceId: string): Promise<IPlanGroupVersionsResponse>;
  /** No auth required */
  getPublic(slug: string): Promise<IPublicPlansResponse>;
  /** No auth required */
  getVersion(groupVersionId: string): Promise<IPlanGroupVersion>;
}

export interface InvoiceActions {
  list(workspaceId: string, limit?: number, startingAfter?: string): Promise<IInvoiceListResponse>;
  get(workspaceId: string, invoiceId: string): Promise<IInvoiceResponse>;
}

export interface UsageBatchRequest {
  items: Array<{
    quotaSlug: string;
    quantity: number;
    metadata?: Record<string, any>;
    source?: string;
    idempotencyKey?: string;
  }>;
}

export interface UsageBatchResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ success: boolean; quotaSlug: string; quantity: number; error?: string }>;
}

export interface UsageActions {
  record(workspaceId: string, request: IRecordUsageRequest): Promise<IRecordUsageResponse>;
  /** Record multiple usage entries in one request. Max 100 items. For bulk/batch operations. */
  recordBatch(workspaceId: string, request: UsageBatchRequest): Promise<UsageBatchResponse>;
  getQuota(workspaceId: string, quotaSlug: string): Promise<IQuotaUsageStatusResponse>;
  getAll(workspaceId: string): Promise<IAllQuotaUsageResponse>;
  getLogs(workspaceId: string, query?: IUsageLogsQuery): Promise<IUsageLogsResponse>;
}

export interface SettingsActions {
  get(): Promise<ISettings>;
}

export interface FeatureActions {
  list(): Promise<IWorkspaceFeature[]>;
  update(workspaceId: string, key: string, value: boolean): Promise<IWorkspace>;
}

export interface PermissionActions {
  /** Check if a user has a permission (or all of an array) in a workspace. Works with both platform permissions (Permission.*) and app permissions (custom strings). */
  check(workspaceId: string, userId: string, permission: string | string[]): Promise<boolean>;
  /** Resolve all permissions for a user in a workspace. Returns both platform and app permissions. */
  resolve(workspaceId: string, userId: string): Promise<Set<string>>;
}

export interface NotificationActions {
  /**
   * Send a notification to a user or all workspace members.
   * Respects all notification gates (org settings, event config, workspace preferences).
   *
   * @param workspaceId - The workspace context
   * @param event - The event slug (e.g., 'comment_added')
   * @param userId - The user to notify. Omit to notify all workspace members.
   * @param data - Template merge data. `message` is used as push body.
   *
   * @example
   * ```ts
   * // Notify one user
   * await notification.send(workspaceId, 'comment_added', userId, {
   *   message: 'Alice commented on your project',
   * })
   *
   * // Notify all workspace members
   * await notification.send(workspaceId, 'new_release', undefined, {
   *   message: 'Version 2.0 is now available!',
   * })
   * ```
   */
  send(
    workspaceId: string,
    event: string,
    userId?: string,
    data?: import('../api/services/workspace-api').NotificationData
  ): Promise<import('../api/services/workspace-api').NotificationResult>;
}

// ─── Scoped actions (bound to a session) ───────────────────────────────────────

/** All action modules bound to a specific session. Returned by `withSession()`. */
export interface ScopedActions {
  workspace: WorkspaceActions;
  users: UserActions;
  subscription: SubscriptionActions;
  plans: PlanActions;
  invoices: InvoiceActions;
  usage: UsageActions;
  settings: SettingsActions;
  features: FeatureActions;
  permissions: PermissionActions;
  notification: NotificationActions;
}

// ─── BuildBase Result ──────────────────────────────────────────────────────────

export interface BuildBaseResult extends ScopedActions {
  /**
   * Check authentication. Returns session or null.
   * Uses the `getSessionId` callback from config.
   *
   * ```ts
   * const session = await auth()
   * if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
   * ```
   */
  auth(): Promise<BuildBaseSession | null>;

  /**
   * Create a scoped client bound to a specific session ID.
   * Returns all the same action modules (workspace, subscription, etc.)
   * but using the provided session instead of the `getSessionId` callback.
   *
   * Use this for frameworks without async request context (Express, Hono, Fastify)
   * or for background jobs / service accounts.
   *
   * @example Express
   * ```ts
   * app.get("/api/workspaces", async (req, res) => {
   *   const bb = withSession(req.headers["x-session-id"])
   *   const workspaces = await bb.workspace.list()
   *   res.json(workspaces)
   * })
   * ```
   *
   * @example Background job
   * ```ts
   * const bb = withSession(process.env.SERVICE_SESSION_ID!)
   * await bb.usage.record(workspaceId, { quotaSlug: "uploads", quantity: 5 })
   * ```
   */
  withSession(sessionId: string): ScopedActions;

  /** Low-level API classes bound to a specific session */
  client: {
    forSession(sessionId: string): {
      workspace: WorkspaceApi;
      user: UserApi;
      settings: SettingsApi;
      push: PushApi;
    };
  };
}

// ─── Factory ───────────────────────────────────────────────────────────────────

export default function BuildBase(config: BuildBaseConfig): BuildBaseResult {
  const {
    serverUrl,
    orgId,
    version = 'v1' as ApiVersion,
    getSessionId: getSessionIdFn,
    timeout,
    maxRetries,
    debug,
    headers,
    onError,
    fetch: customFetch,
  } = config;

  if (!serverUrl) throw new Error('BuildBase: serverUrl is required');
  if (!orgId) throw new Error('BuildBase: orgId is required');

  // Shared options passed to every API client
  const sharedOptions = {
    ...(timeout !== undefined && { timeout }),
    ...(maxRetries !== undefined && { maxRetries }),
    ...(debug !== undefined && { debug }),
    ...(headers && { headers }),
    ...(onError && { onError }),
    ...(customFetch && { fetch: customFetch }),
  };

  // Create raw API clients bound to a specific session
  const forSession = (sessionId: string) => {
    const apiConfig = { serverUrl, version, orgId, sessionId, ...sharedOptions };
    return {
      workspace: new WorkspaceApi(apiConfig),
      user: new UserApi(apiConfig),
      settings: new SettingsApi(apiConfig),
      push: new PushApi(apiConfig),
    };
  };

  // Unauthenticated client (for public endpoints)
  const publicApi = new WorkspaceApi({ serverUrl, version, orgId, ...sharedOptions });

  // Build high-level action modules from a session resolver function
  const buildActions = (getApi: () => Promise<ReturnType<typeof forSession>>): ScopedActions => ({
    workspace: {
      list: async () => (await getApi()).workspace.getWorkspaces(),
      get: async wid => (await getApi()).workspace.getWorkspace(wid),
      create: async data => (await getApi()).workspace.createWorkspace(data),
      update: async (wid, data) => (await getApi()).workspace.updateWorkspace(wid, data),
      delete: async wid => (await getApi()).workspace.deleteWorkspace(wid),
    },

    users: {
      list: async wid => (await getApi()).workspace.getWorkspaceUsers(wid),
      invite: async (wid, email, role) => (await getApi()).workspace.addUser(wid, { email, role }),
      remove: async (wid, uid) => (await getApi()).workspace.removeUser(wid, uid),
      updateRole: async (wid, uid, role) =>
        (await getApi()).workspace.updateUser(wid, uid, { role }),
      getProfile: async () => (await getApi()).workspace.getProfile(),
      updateProfile: async data => (await getApi()).workspace.updateUserProfile(data),
    },

    subscription: {
      get: async wid => (await getApi()).workspace.getCurrentSubscription(wid),
      checkout: async (wid, req) => (await getApi()).workspace.createCheckoutSession(wid, req),
      update: async (wid, req) => (await getApi()).workspace.updateSubscription(wid, req),
      cancel: async wid => (await getApi()).workspace.cancelSubscriptionAtPeriodEnd(wid),
      resume: async wid => (await getApi()).workspace.resumeSubscription(wid),
      getBillingPortalUrl: async (wid, returnUrl?) =>
        (await getApi()).workspace.createBillingPortalSession(wid, returnUrl),
    },

    plans: {
      getGroup: async wid => (await getApi()).workspace.getPlanGroup(wid),
      getVersions: async wid => (await getApi()).workspace.getPlanGroupVersions(wid),
      getPublic: slug => publicApi.getPublicPlans(slug),
      getVersion: gvid => publicApi.getPlanGroupVersion(gvid),
    },

    invoices: {
      list: async (wid, limit?, startingAfter?) =>
        (await getApi()).workspace.listInvoices(wid, limit, startingAfter),
      get: async (wid, invoiceId) => (await getApi()).workspace.getInvoice(wid, invoiceId),
    },

    usage: {
      record: async (wid, req) => (await getApi()).workspace.recordUsage(wid, req),
      /** Record multiple usage entries in one request. Max 100 items. For bulk operations. */
      recordBatch: async (wid, req) => (await getApi()).workspace.recordUsageBatch(wid, req),
      getQuota: async (wid, slug) => (await getApi()).workspace.getQuotaUsageStatus(wid, slug),
      getAll: async wid => (await getApi()).workspace.getAllQuotaUsage(wid),
      getLogs: async (wid, query?) => (await getApi()).workspace.getUsageLogs(wid, query),
    },

    settings: {
      get: async () => (await getApi()).settings.getSettings(),
    },

    features: {
      list: async () => (await getApi()).workspace.getFeatures(),
      update: async (wid, key, value) => (await getApi()).workspace.updateFeature(wid, key, value),
    },

    notification: {
      send: async (wid, event, uid, data?) =>
        (await getApi()).workspace.sendNotification(wid, event, uid, data),
    },

    permissions: {
      check: async (wid, uid, permission) => {
        const api = await getApi();
        const [workspace, settings, workspaceUsers] = await Promise.all([
          api.workspace.getWorkspace(wid),
          api.settings.getSettings(),
          api.workspace.getWorkspaceUsers(wid),
        ]);
        const wu = workspaceUsers.find(u => {
          const id = typeof u.user === 'string' ? u.user : u.user._id;
          return id === uid;
        });
        return hasPermission(permission, {
          userId: uid,
          workspaceRole: wu?.role ?? null,
          workspace,
          settings,
        });
      },
      resolve: async (wid, uid) => {
        const api = await getApi();
        const [workspace, settings, workspaceUsers] = await Promise.all([
          api.workspace.getWorkspace(wid),
          api.settings.getSettings(),
          api.workspace.getWorkspaceUsers(wid),
        ]);
        const wu = workspaceUsers.find(u => {
          const id = typeof u.user === 'string' ? u.user : u.user._id;
          return id === uid;
        });
        return resolvePermissions({
          userId: uid,
          workspaceRole: wu?.role ?? null,
          workspace,
          settings,
        });
      },
    },
  });

  // Resolve session from the getSessionId callback — throws if missing
  const resolveSession = async (): Promise<string> => {
    if (!getSessionIdFn) {
      throw new Error(
        'BuildBase: getSessionId callback is required for authenticated calls. ' +
          'Pass it in BuildBase({ getSessionId: ... }) or use withSession(id) / client.forSession(id).'
      );
    }
    const sessionId = await getSessionIdFn();
    if (!sessionId) {
      throw new Error('BuildBase: Not authenticated (getSessionId returned null)');
    }
    return sessionId;
  };

  // Default actions use the getSessionId callback
  const defaultActions = buildActions(async () => forSession(await resolveSession()));

  return {
    // Auth check
    auth: async () => {
      if (!getSessionIdFn) return null;
      const sessionId = await getSessionIdFn();
      return sessionId ? { sessionId } : null;
    },

    // Per-request scoped client (Express, Hono, Fastify, background jobs)
    withSession: (sessionId: string) => {
      const cached = forSession(sessionId);
      return buildActions(async () => cached);
    },

    // Low-level API classes
    client: { forSession },

    // Default actions (use getSessionId callback)
    ...defaultActions,
  };
}
