/**
 * Built-in MCP tools mapping BuildBase capabilities to agent-callable tools.
 *
 * Authorization model: the agent acts as an authenticated app user — it knows
 * your app, not BuildBase. Built-in tools therefore carry NO BuildBase-specific
 * scope requirement; they're available whenever your `auth.verify` accepts the
 * token and your app chose to expose them. Every call runs under the acting
 * user's own BuildBase session, so the server enforces that user's permissions
 * — an agent can never exceed what its user could do. Want per-scope gating on
 * top? Set `requiredScopes` on your own custom tools — the handler enforces it.
 *
 * The read-vs-write boundary is YOUR choice via `builtinTools`: the default is
 * `'readonly'` (reads only — least privilege). Opt in to `'all'` to also expose
 * writes AND destructive/billing ops (workspace delete, subscription cancel,
 * credit purchase — still gated by the user's own permissions), `false` to
 * expose no built-ins, or `{ include, exclude }` to hand-pick specific tools.
 *
 * Every workspace-scoped tool accepts an optional `workspaceId` and falls back
 * to the workspace pinned on the verified token (`McpAuthInfo.workspaceId`).
 */

import { z } from 'zod';
import type { McpToolContext, McpToolDefinition } from './mcp-server';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const workspaceIdField = z
  .string()
  .optional()
  .describe('Workspace id. Omit to use the workspace bound to your token.');

function resolveWorkspaceId(input: { workspaceId?: string }, ctx: McpToolContext): string {
  const workspaceId = input.workspaceId ?? ctx.workspaceId;
  if (!workspaceId) {
    throw new Error('workspaceId is required — call list_workspaces to find one.');
  }
  return workspaceId;
}

const readOnly = { readOnlyHint: true } as const;

// ─── Read-only tools (default set) ───────────────────────────────────────────

const readonlyTools: McpToolDefinition<any>[] = [
  {
    name: 'list_workspaces',
    description: "List the authenticated user's workspaces (id, name, roles).",
    inputSchema: z.object({}),
    annotations: readOnly,
    execute: (_input, ctx) => ctx.bb.workspace.list(),
  },
  {
    name: 'get_workspace',
    description: 'Get one workspace: name, members, feature flags, quota snapshot.',
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.workspace.get(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'get_user_profile',
    description: "Get the authenticated user's profile.",
    inputSchema: z.object({}),
    annotations: readOnly,
    execute: (_input, ctx) => ctx.bb.users.getProfile(),
  },
  {
    name: 'list_workspace_users',
    description: 'List the members of a workspace with their roles.',
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.users.list(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'get_subscription',
    description: "Get a workspace's subscription: plan, status, interval, seats.",
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.subscription.get(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'get_plans',
    description: 'Get the plan group available to a workspace (plans, prices, quotas).',
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.plans.getGroup(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'list_invoices',
    description: "List a workspace's invoices (newest first).",
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      limit: z.number().int().min(1).max(100).optional().describe('Max invoices to return.'),
      startingAfter: z.string().optional().describe('Invoice id to paginate after.'),
    }),
    annotations: readOnly,
    execute: (input, ctx) =>
      ctx.bb.invoices.list(resolveWorkspaceId(input, ctx), input.limit, input.startingAfter),
  },
  {
    name: 'get_quota_usage',
    description: 'Get usage vs. limit for one quota in a workspace.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      quotaSlug: z.string().describe('The quota slug, e.g. "api-calls".'),
    }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.usage.getQuota(resolveWorkspaceId(input, ctx), input.quotaSlug),
  },
  {
    name: 'get_all_quota_usage',
    description: 'Get usage vs. limit for every quota in a workspace.',
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.usage.getAll(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'get_credit_balance',
    description: "Get a workspace's prepaid credit balance.",
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.credits.getBalance(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'list_credit_transactions',
    description: "Get a workspace's credit transaction history (paginated).",
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      limit: z.number().int().min(1).max(100).optional(),
      page: z.number().int().min(1).optional(),
    }),
    annotations: readOnly,
    execute: (input, ctx) =>
      ctx.bb.credits.getTransactions(resolveWorkspaceId(input, ctx), {
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        ...(input.page !== undefined ? { page: input.page } : {}),
      }),
  },
  {
    name: 'check_feature_flag',
    description: 'Check whether a feature flag is enabled for a workspace.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      key: z.string().describe('The feature slug.'),
    }),
    annotations: readOnly,
    execute: async (input, ctx) => {
      const workspaceId = resolveWorkspaceId(input, ctx);
      const workspace = await ctx.bb.workspace.get(workspaceId);
      const override = workspace.features?.[input.key];
      if (override !== undefined) {
        return { key: input.key, enabled: override, source: 'workspace' };
      }
      const feature = (await ctx.bb.features.list()).find(f => f.slug === input.key);
      if (!feature) {
        throw new Error(`Unknown feature flag: ${input.key}`);
      }
      return { key: input.key, enabled: feature.defaultValue, source: 'default' };
    },
  },
  {
    name: 'check_permission',
    description: 'Check whether a user has permission(s) in a workspace.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      permission: z
        .union([z.string(), z.array(z.string())])
        .describe('A permission (or list — all must hold), platform or app-defined.'),
      userId: z.string().optional().describe('Defaults to the authenticated user.'),
    }),
    annotations: readOnly,
    execute: async (input, ctx) => {
      const userId = input.userId ?? ctx.auth.userId;
      if (!userId) {
        throw new Error('userId is required — the token carries no user identity.');
      }
      const allowed = await ctx.bb.permissions.check(
        resolveWorkspaceId(input, ctx),
        userId,
        input.permission
      );
      return { userId, permission: input.permission, allowed };
    },
  },
  {
    name: 'resolve_permissions',
    description: 'List every permission a user holds in a workspace.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      userId: z.string().optional().describe('Defaults to the authenticated user.'),
    }),
    annotations: readOnly,
    execute: async (input, ctx) => {
      const userId = input.userId ?? ctx.auth.userId;
      if (!userId) {
        throw new Error('userId is required — the token carries no user identity.');
      }
      const set = await ctx.bb.permissions.resolve(resolveWorkspaceId(input, ctx), userId);
      return { userId, permissions: Array.from(set) };
    },
  },
  {
    name: 'get_invoice',
    description: 'Get one invoice by id.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      invoiceId: z.string().describe('The invoice id.'),
    }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.invoices.get(resolveWorkspaceId(input, ctx), input.invoiceId),
  },
  {
    name: 'get_plan_versions',
    description: 'List the plan-group versions available to a workspace.',
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.plans.getVersions(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'get_public_plans',
    description: 'Get a public plan group by slug (no workspace / auth needed).',
    inputSchema: z.object({ slug: z.string().describe('The plan-group slug.') }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.plans.getPublic(input.slug),
  },
  {
    name: 'get_plan_version',
    description: 'Get one public plan-group version by id (no auth needed).',
    inputSchema: z.object({
      groupVersionId: z.string().describe('The plan-group version id.'),
    }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.plans.getVersion(input.groupVersionId),
  },
  {
    name: 'get_usage_logs',
    description: "Get a workspace's usage log entries (paginated, filterable).",
    inputSchema: z
      .object({
        workspaceId: workspaceIdField,
        quotaSlug: z.string().optional(),
        from: z.string().optional().describe('ISO date lower bound.'),
        to: z.string().optional().describe('ISO date upper bound.'),
        source: z.string().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .strict(),
    annotations: readOnly,
    execute: (input, ctx) => {
      const { workspaceId, ...query } = input;
      return ctx.bb.usage.getLogs(resolveWorkspaceId(input, ctx), query);
    },
  },
  {
    name: 'get_settings',
    description: 'Get the organization settings.',
    inputSchema: z.object({}),
    annotations: readOnly,
    execute: (_input, ctx) => ctx.bb.settings.get(),
  },
  {
    name: 'get_credit_packages',
    description: 'List the credit packages a workspace can purchase.',
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.credits.getPackages(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'get_credit_buckets',
    description: "Get a workspace's credit buckets (paginated).",
    inputSchema: z
      .object({
        workspaceId: workspaceIdField,
        status: z.string().optional(),
        source: z.string().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .strict(),
    annotations: readOnly,
    execute: (input, ctx) => {
      const { workspaceId, ...query } = input;
      return ctx.bb.credits.getBuckets(resolveWorkspaceId(input, ctx), query as any);
    },
  },
  {
    name: 'get_expiring_credits',
    description: 'Get credits expiring within N days (default 7).',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      days: z.number().int().min(1).optional(),
    }),
    annotations: readOnly,
    execute: (input, ctx) => ctx.bb.credits.getExpiring(resolveWorkspaceId(input, ctx), input.days),
  },
  {
    name: 'get_public_credit_packages',
    description: 'List credit packages publicly (no workspace / auth needed).',
    inputSchema: z.object({}),
    annotations: readOnly,
    execute: (_input, ctx) => ctx.bb.credits.getPublicPackages(),
  },
];

// ─── Mutating tools (opt-in) ─────────────────────────────────────────────────

const mutatingTools: McpToolDefinition<any>[] = [
  {
    name: 'record_usage',
    description: 'Record quota usage for a workspace (metered billing).',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      quotaSlug: z.string().describe('The quota slug to record against.'),
      quantity: z.number().positive().describe('Amount of usage to record.'),
      idempotencyKey: z.string().optional().describe('Dedupe key for safe retries.'),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    execute: (input, ctx) =>
      ctx.bb.usage.record(resolveWorkspaceId(input, ctx), {
        quotaSlug: input.quotaSlug,
        quantity: input.quantity,
        source: 'mcp',
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      }),
  },
  {
    name: 'consume_credits',
    description: "Consume prepaid credits from a workspace's balance.",
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      amount: z.number().positive().describe('Credits to consume.'),
      description: z.string().optional().describe('What the credits were spent on.'),
      idempotencyKey: z.string().optional().describe('Dedupe key for safe retries.'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
    execute: (input, ctx) =>
      ctx.bb.credits.consume(resolveWorkspaceId(input, ctx), {
        amount: input.amount,
        ...(input.description ? { description: input.description } : {}),
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      }),
  },
  {
    name: 'send_notification',
    description:
      'Send a notification event to a workspace user (or all members when userId is omitted).',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      event: z.string().describe('The event slug, e.g. "comment_added".'),
      userId: z.string().optional().describe('Recipient. Omit to notify all members.'),
      message: z.string().optional().describe('Message body (used for push).'),
    }),
    annotations: { readOnlyHint: false, openWorldHint: true },
    execute: (input, ctx) =>
      ctx.bb.notification.send(
        resolveWorkspaceId(input, ctx),
        input.event,
        input.userId,
        input.message ? { message: input.message } : undefined
      ),
  },
  {
    name: 'record_usage_batch',
    description: 'Record multiple usage entries in one call (max 100 items).',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      items: z
        .array(
          z.object({
            quotaSlug: z.string(),
            quantity: z.number().positive(),
            idempotencyKey: z.string().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
          })
        )
        .min(1)
        .max(100),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
    execute: (input, ctx) =>
      ctx.bb.usage.recordBatch(resolveWorkspaceId(input, ctx), {
        items: input.items.map((i: Record<string, unknown>) => ({ ...i, source: 'mcp' })),
      }),
  },
  {
    name: 'create_workspace',
    description: 'Create a new workspace.',
    inputSchema: z.object({
      name: z.string().describe('Workspace name.'),
      image: z.string().optional().describe('Image URL.'),
    }),
    annotations: { readOnlyHint: false },
    execute: (input, ctx) =>
      ctx.bb.workspace.create({ name: input.name, ...(input.image ? { image: input.image } : {}) }),
  },
  {
    name: 'update_workspace',
    description: "Update a workspace's editable fields (name, image).",
    inputSchema: z
      .object({
        workspaceId: workspaceIdField,
        name: z.string().min(1).optional().describe('New workspace name.'),
        image: z.string().optional().describe('New image URL.'),
      })
      // Explicit allowlist — never forward arbitrary keys to the backend, so an
      // agent cannot attempt to set owner/plan/internal fields (mass-assignment).
      .strict(),
    annotations: { readOnlyHint: false },
    execute: (input, ctx) => {
      const data: { name?: string; image?: string } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.image !== undefined) data.image = input.image;
      return ctx.bb.workspace.update(resolveWorkspaceId(input, ctx), data as any);
    },
  },
  {
    name: 'delete_workspace',
    description: 'Delete a workspace. Irreversible.',
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: { readOnlyHint: false, destructiveHint: true },
    execute: (input, ctx) => ctx.bb.workspace.delete(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'invite_workspace_user',
    description: 'Invite a user to a workspace with a role.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      email: z.string().describe('Invitee email.'),
      role: z.string().describe('Role to grant.'),
    }),
    annotations: { readOnlyHint: false, openWorldHint: true },
    execute: (input, ctx) =>
      ctx.bb.users.invite(resolveWorkspaceId(input, ctx), input.email, input.role),
  },
  {
    name: 'remove_workspace_user',
    description: 'Remove a user from a workspace. Irreversible.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      userId: z.string().describe('The user to remove.'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
    execute: (input, ctx) => ctx.bb.users.remove(resolveWorkspaceId(input, ctx), input.userId),
  },
  {
    name: 'update_workspace_user_role',
    description: "Change a workspace member's role.",
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      userId: z.string(),
      role: z.string().describe('The new role.'),
    }),
    annotations: { readOnlyHint: false },
    execute: (input, ctx) =>
      ctx.bb.users.updateRole(resolveWorkspaceId(input, ctx), input.userId, input.role),
  },
  {
    name: 'update_user_profile',
    description:
      "Update the authenticated user's own profile (name, image, country, timezone, language, currency).",
    inputSchema: z
      .object({
        name: z.string().min(1).optional(),
        image: z.string().optional().describe('Profile image URL.'),
        country: z.string().optional().describe('ISO country code.'),
        timezone: z.string().optional().describe('IANA timezone.'),
        language: z.string().optional().describe('Language code.'),
        currency: z.string().optional().describe('Currency code.'),
      })
      // Explicit allowlist — role, email, and attributes are NOT self-updatable
      // through this agent tool (mass-assignment protection).
      .strict(),
    annotations: { readOnlyHint: false },
    execute: (input, ctx) => {
      const data: Record<string, string> = {};
      for (const key of ['name', 'image', 'country', 'timezone', 'language', 'currency'] as const) {
        const value = input[key];
        if (value !== undefined) data[key] = value;
      }
      return ctx.bb.users.updateProfile(data as any);
    },
  },
  {
    name: 'update_feature_flag',
    description: 'Set a feature flag on/off for a workspace.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      key: z.string().describe('The feature slug.'),
      value: z.boolean().describe('Enabled?'),
    }),
    annotations: { readOnlyHint: false },
    execute: (input, ctx) =>
      ctx.bb.features.update(resolveWorkspaceId(input, ctx), input.key, input.value),
  },
  {
    name: 'create_subscription_checkout',
    description: 'Create a Stripe checkout session to subscribe a workspace to a plan.',
    inputSchema: z
      .object({
        workspaceId: workspaceIdField,
        planVersionId: z.string(),
        billingInterval: z.string().optional(),
        currency: z.string().optional(),
        successUrl: z.string().optional(),
        cancelUrl: z.string().optional(),
      })
      .strict(),
    annotations: { readOnlyHint: false, openWorldHint: true },
    execute: (input, ctx) => {
      const { workspaceId, ...req } = input;
      return ctx.bb.subscription.checkout(resolveWorkspaceId(input, ctx), req as any);
    },
  },
  {
    name: 'update_subscription',
    description: "Change a workspace's subscription plan.",
    inputSchema: z
      .object({
        workspaceId: workspaceIdField,
        planVersionId: z.string(),
        billingInterval: z.string().optional(),
        successUrl: z.string().optional(),
        cancelUrl: z.string().optional(),
      })
      .strict(),
    annotations: { readOnlyHint: false },
    execute: (input, ctx) => {
      const { workspaceId, ...req } = input;
      return ctx.bb.subscription.update(resolveWorkspaceId(input, ctx), req as any);
    },
  },
  {
    name: 'cancel_subscription',
    description: "Cancel a workspace's subscription.",
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: { readOnlyHint: false, destructiveHint: true },
    execute: (input, ctx) => ctx.bb.subscription.cancel(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'resume_subscription',
    description: "Resume a workspace's canceled subscription.",
    inputSchema: z.object({ workspaceId: workspaceIdField }),
    annotations: { readOnlyHint: false },
    execute: (input, ctx) => ctx.bb.subscription.resume(resolveWorkspaceId(input, ctx)),
  },
  {
    name: 'get_billing_portal_url',
    description: 'Get a Stripe billing-portal URL for a workspace.',
    inputSchema: z.object({
      workspaceId: workspaceIdField,
      returnUrl: z.string().optional(),
    }),
    annotations: { readOnlyHint: false, openWorldHint: true },
    execute: (input, ctx) =>
      ctx.bb.subscription.getBillingPortalUrl(resolveWorkspaceId(input, ctx), input.returnUrl),
  },
  {
    name: 'purchase_credits',
    description: 'Create a Stripe checkout session to buy a credit package.',
    inputSchema: z
      .object({
        workspaceId: workspaceIdField,
        creditPackageId: z.string(),
        currency: z.string().optional(),
        successUrl: z.string().describe('Redirect URL on success.'),
        cancelUrl: z.string().describe('Redirect URL on cancel.'),
      })
      .strict(),
    annotations: { readOnlyHint: false, openWorldHint: true },
    execute: (input, ctx) => {
      const { workspaceId, ...req } = input;
      return ctx.bb.credits.purchase(resolveWorkspaceId(input, ctx), req as any);
    },
  },
];

// ─── Selection ───────────────────────────────────────────────────────────────

/** Every built-in tool, keyed by name. */
export const builtinMcpTools: ReadonlyMap<string, McpToolDefinition<any>> = new Map(
  [...readonlyTools, ...mutatingTools].map(tool => [tool.name, tool])
);

/** The name of a built-in BuildBase MCP tool. */
export type BuiltinMcpToolName =
  // read
  | 'list_workspaces'
  | 'get_workspace'
  | 'get_user_profile'
  | 'list_workspace_users'
  | 'get_subscription'
  | 'get_plans'
  | 'get_plan_versions'
  | 'get_public_plans'
  | 'get_plan_version'
  | 'list_invoices'
  | 'get_invoice'
  | 'get_quota_usage'
  | 'get_all_quota_usage'
  | 'get_usage_logs'
  | 'get_credit_balance'
  | 'list_credit_transactions'
  | 'get_credit_packages'
  | 'get_credit_buckets'
  | 'get_expiring_credits'
  | 'get_public_credit_packages'
  | 'check_feature_flag'
  | 'check_permission'
  | 'resolve_permissions'
  | 'get_settings'
  // write / destructive
  | 'record_usage'
  | 'record_usage_batch'
  | 'consume_credits'
  | 'send_notification'
  | 'create_workspace'
  | 'update_workspace'
  | 'delete_workspace'
  | 'invite_workspace_user'
  | 'remove_workspace_user'
  | 'update_workspace_user_role'
  | 'update_user_profile'
  | 'update_feature_flag'
  | 'create_subscription_checkout'
  | 'update_subscription'
  | 'cancel_subscription'
  | 'resume_subscription'
  | 'get_billing_portal_url'
  | 'purchase_credits';

/** Resolve a `builtinTools` config value to the tools it selects. */
export function selectBuiltinTools(
  selection:
    | 'all'
    | 'readonly'
    | false
    | { include?: BuiltinMcpToolName[]; exclude?: BuiltinMcpToolName[] }
): McpToolDefinition<any>[] {
  if (selection === false) return [];
  if (selection === 'readonly') return [...readonlyTools];
  if (selection === 'all') return [...readonlyTools, ...mutatingTools];

  const base = selection.include
    ? selection.include.map(name => {
        const tool = builtinMcpTools.get(name);
        if (!tool) throw new Error(`Unknown built-in MCP tool: ${name}`);
        return tool;
      })
    : [...readonlyTools];
  const excluded = new Set(selection.exclude ?? []);
  return base.filter(tool => !excluded.has(tool.name as BuiltinMcpToolName));
}
