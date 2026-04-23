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
export { parseWebhookEvent, verifyWebhookSignature } from './lib/webhook-verification';

// ─── BuildBase Factory (server-side) ───────────────────────────────────────────
export { default as BuildBase, default } from './lib/server-client';
export type {
  BuildBaseConfig,
  BuildBaseResult,
  BuildBaseSession,
  FeatureActions,
  InvoiceActions,
  PermissionActions,
  PlanActions,
  ScopedActions,
  SettingsActions,
  SubscriptionActions,
  UsageActions,
  UserActions,
  WorkspaceActions,
} from './lib/server-client';
