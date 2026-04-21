/**
 * @buildbase/sdk
 *
 * Server entry point. Framework-agnostic, zero React.
 *
 *   @buildbase/sdk        → core + BuildBase() factory (this file)
 *   @buildbase/sdk/react  → core types + React hooks, providers, components
 *   @buildbase/sdk/css    → Stylesheet
 *
 * @example
 * ```ts
 * import BuildBase from "@buildbase/sdk"
 * import type { ISubscription } from "@buildbase/sdk"
 * ```
 */

// ─── Core (API classes, types, utils — shared with react entry) ────────────────
export * from './core';

// ─── Webhook Verification (server-only — uses Node.js crypto) ─────────────────
export { verifyWebhookSignature, parseWebhookEvent } from './lib/webhook-verification';

// ─── BuildBase Factory (server-side) ───────────────────────────────────────────
export { default, default as BuildBase } from './lib/server-client';
export type {
  BuildBaseConfig,
  BuildBaseResult,
  BuildBaseSession,
  ScopedActions,
  WorkspaceActions,
  UserActions,
  SubscriptionActions,
  PlanActions,
  InvoiceActions,
  UsageActions,
  SettingsActions,
  FeatureActions,
  PermissionActions,
} from './lib/server-client';
