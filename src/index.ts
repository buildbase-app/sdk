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

// ─── Agent-readiness discovery (pure, framework-agnostic functions) ───────────
// Every function returns plain data (a DiscoveryDocument or the raw bundle) and
// does no framework I/O — wire them into any router yourself (see the guide).
export {
  AI_BOT_USER_AGENTS,
  buildA2AAgentCard,
  buildAgentCard,
  buildAgentSkillsIndex,
  buildApiCatalog,
  buildAuthMd,
  buildDiscoveryLinkHeader,
  buildDnsAidRecords,
  buildLlmsFullTxt,
  buildLlmsTxt,
  buildMcpDiscoveryManifest,
  buildMcpServerCard,
  buildProtectedResourceMetadata,
  buildRobotsTxt,
  buildSecurityTxt,
  buildSitemap,
  buildSkillMd,
  buildWebBotAuthDirectory,
  clearAgentReadinessCache,
  fetchAgentReadiness,
  negotiateMarkdown,
  provideWebMcpTools,
  resolveAgentPath,
  resolveWellKnown,
  sha256Digest,
  wantsMarkdown,
} from './lib/agent-discovery';
export type {
  A2ACardConfig,
  A2ACardSkill,
  AgentReadinessBundle,
  AgentReadyConfig,
  AgentSkill,
  ApiCatalogApi,
  AppScope,
  ContentSignals,
  DiscoveryDocument,
  DnsAidRecord,
  McpServerCard,
  RobotsConfig,
  RobotsPolicy,
  SitemapUrl,
  WebMcpTool,
} from './lib/agent-discovery';

// ─── OAuth2 app-bridge (server-side handlers for applicationTokenUrl/Revoke) ───
export {
  AppBridgeError,
  appTokenFailure,
  appTokenSuccess,
  bearerChallenge,
  extractBearerToken,
  handleAppRevokeRequest,
  handleAppTokenRequest,
  signClientJwt,
  verifyAppRevokeRequest,
  verifyAppTokenRequest,
  verifyClientJwt,
} from './lib/agent-bridge';
export type {
  AppRevokeRequestClaims,
  AppTokenRequestClaims,
  AppTokenResponseBody,
  AppTokenResult,
  HandlerResult,
} from './lib/agent-bridge';

// ─── BuildBase agent-auth presets (the app mints/verifies its own tokens; the
// platform never sees the secret or the token — pure local WebCrypto) ─────────
export { buildbaseAuth, createSessionRefCrypto, mintAgentToken } from './lib/agent-auth';
export type {
  BuildBaseAuthOptions,
  MintAgentTokenOptions,
  SessionRefCrypto,
} from './lib/agent-auth';

// ─── BuildBase Factory (server-side) ───────────────────────────────────────────
export { default as BuildBase, default } from './lib/server-client';
export type {
  BuildBaseConfig,
  BuildBaseResult,
  BuildBaseSession,
  CreditActions,
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
