# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **`@buildbase/sdk/react` now actually exports the core runtime values its types declared.** `src/react.ts` used `export type * from './core'`, but the generated `dist/react/index.d.ts` flattened it into value exports — so `import { Permission, formatCents, AuthStatus, … } from '@buildbase/sdk/react'` (as documented in the README) type-checked and then was `undefined` at runtime. The re-export is now a value re-export (`export * from './core'`); the React bundle exposes the full core surface (90 → 159 exports).
- **Caller-initiated aborts are no longer misreported as timeouts.** `BaseApi` converted every `AbortError` into a fake "Request timeout" error whenever a timeout was configured (i.e. always, default 30s), defeating `isAbortError()` filtering — component-unmount cancellations surfaced as real errors. Conversion now happens only when the internal timeout controller actually fired.
- **`unwrapResponse` no longer swallows falsy payloads.** `result.data || result` returned the whole `{success, data}` envelope when `data` was `0`, `false`, `''`, or `null`; now checks `!== undefined`.
- **API path parameters are URI-encoded.** All interpolated path segments (workspace/user/passkey/invoice/plan-version IDs, attribute keys) go through a new `BaseApi.apiPath` tagged template, so values containing `/ ? # ..` can't retarget the request path. Query strings are unaffected.
- **Invoices tab no longer claims an active subscription while loading.** `subscription?.subscription !== null` was `true` for `undefined` (initial load); now `!= null`.
- **Paid plans with no price for the selected interval render "—" instead of "Free"** in the plan dialog (dead ternary branch fell through to the free label).
- **`@hookform/resolvers` moved from devDependencies to dependencies** — it's a runtime import in 4 shipped files and was being silently bundled (contradicting the 0.0.50 externalization), risking version skew against the external `zod`/`react-hook-form`.
- Docs: AGENTS.md webhook verification note updated to runtime-agnostic (missed in 0.0.50); stale "3 levels" comment on `TranslationKey` corrected to 4.

### Added

- **`ui` prop on `SaaSOSProvider`** (`SDKUIConfig`): implementor-facing UI configuration. Every option is additive and defaults to current behavior; visibility options only hide UI and never bypass platform permissions.
  - `ui.settings.sections` — show/hide any section of the workspace settings dialog (`profile`, `security`, `connected-agents`, `general`, `users`, `subscription`, `usage`, `credits`, `features`, `notifications`, `permissions`, `danger`). Hidden sections are removed from the sidebar (empty groups collapse) and are unreachable via deep links or `defaultSection` (the dialog falls back to the first enabled section).
  - Per-screen toggles: `settings.profile.{language,country,currency,timezone}`, `settings.security.{passkeyRename,passkeyDelete}`, `settings.general.{nameEdit,iconEditor}`, `settings.users.{invite,roleChange,remove,seatPricing}`, `settings.subscription.{changePlan,cancel,managePayment,invoicesTab,planDetails}`, `settings.credits.{buyButton,transactions}`.
  - `ui.workspaceSwitcher.{show,createButton,planBadge,memberCount}` — client-side switcher control, ANDed with server settings (`showSwitcher`, `canCreateWorkspace`).
  - `ui.behavior.autoOpenPlanDialog` — disable the automatic plan-picker popup when a workspace has no subscription (explicit `selectPlan` deep links still open). `ui.behavior.trialEndingDays` — global default threshold for `WhenTrialEnding`.
  - `ui.messages` (`PartialSDKMessages`) — per-key overrides for any SDK UI string, deep-merged over the active locale bundle (e.g. rename "Credits" to "Tokens" without forking locale files).
  - `ui.errorBoundary.{title,retryLabel}` — strings for the top-level error boundary's default fallback (plain strings, since the boundary renders even when the i18n layer crashed).
  - `ui.formats.date` — `Intl.DateTimeFormatOptions` for SDK-rendered dates (passkey activity, connected agents).
- **`useUIVisibility()` hook** (exported): single-call visibility decision combining a `ui` config flag with an optional permission check — `visible(ui => ui.settings?.users?.invite, Permission.WORKSPACE_MEMBERS_INVITE)`. Used internally by every gated SDK surface; available to implementors for their own UI.
- **`useUIConfig()` hook** (exported): raw access to the provided `ui` config. **`mergeUIConfig(base, override)`** (exported): the deep-merge used for per-dialog overrides.
- **Per-dialog `ui` override**: `WorkspaceSettingsDialog` accepts its own `ui` prop, deep-merged over the provider-global config, so one app can render differently-configured settings dialogs.
- **Notifications screen toggles**: `settings.notifications.{push,emailToggles,pushToggles}` hide the browser push block or the per-event email/push preference columns (the preference list collapses when both columns are hidden).
- **Docs**: new `docs/UI-CONFIG.md` — full UI-configuration guide (complete toggle reference, visibility precedence, per-dialog override, recipes); README "UI Configuration" section links to it.
- **Auth gates get standard gate props**: `WhenAuthenticated` / `WhenUnauthenticated` now accept `loadingComponent` and `fallbackComponent`, matching the subscription/quota/credit gates. Loading now covers all transitional auth states (`loading`, `redirecting`, `authenticating`).
- **i18n English fallback chain**: `t()` now falls back to the English bundle for keys missing from an incomplete locale (or overrides) before returning the raw key.
- **`SDKErrorBoundary`** accepts `errorTitle` and `retryLabel` props for its default fallback UI.

## [0.0.50] - 2026-07-07

### Fixed

- **Webhook verification now works on every JS runtime**: `verifyWebhookSignature` / `parseWebhookEvent` previously used Node's `require('crypto')`, which was bundled into the ESM output and threw (silently caught → returned `false`, rejecting valid webhooks) on ESM Node, Cloudflare Workers, Vercel Edge, Deno, and Bun. They now use the dependency-free pure-JS HMAC-SHA256 (`src/lib/sha256.ts`, shared with the OAuth app-bridge), so verification behaves identically under CJS, ESM, bundlers, edge runtimes, Deno, Bun, and browsers. Added `hexToBytes` to `sha256`.
- **`safeRedirect` no longer throws off-browser**: it is exported from the framework-agnostic core entry but used unguarded `window`. It now guards `window` and no-ops (returns `false`) on non-browser runtimes, returning `true` only when it navigates.
- **`AbortSignal.any` compatibility**: request cancellation + timeout composition used `AbortSignal.any`, unavailable on Node <18.17 and older browsers/Deno. A feature-detected fallback (`combineAbortSignals`) restores support on those runtimes.
- **Clearer error when no `fetch` is available** (old Node without an injected `fetch`), instead of a cryptic `.bind` crash.

### Changed

- **Dependencies are no longer bundled**: the build now externalizes all runtime dependencies (`zod`, `react-hook-form`, `@radix-ui/*`, `lucide-react`, …) instead of inlining them. This removes duplicate installs and bundle bloat and fixes duplicate-instance interop bugs (e.g. `zod` schema `instanceof`, `react-hook-form`/React context sharing) where a bundled copy diverged from the consumer's copy.
- **React entry code-splits again**: switched to multi-chunk directory output so the lazy i18n locale bundles and the Settings/Subscription dialogs load on demand (they were being inlined into a single chunk).
- **Packaging**: added a `typesVersions` map so legacy `moduleResolution: "node"` consumers resolve types for the `/react`, `/data`, and `/css` subpaths; added a `"./package.json"` export. Webhook docs updated from "Node.js only" to runtime-agnostic.

## [0.0.49] - 2026-07-07

### Added

- **Server-side agent-readiness discovery** (`@buildbase/sdk`): framework-agnostic helpers to make a consuming app "agent ready" — `resolveWellKnown`, `fetchAgentReadiness`, `clearAgentReadinessCache`, `buildAgentCard`, `buildProtectedResourceMetadata`, `buildAgentSkillsIndex`, `buildSkillMd`, `buildSecurityTxt`, `buildLlmsTxt`, `sha256Digest`; types `AgentReadyConfig`, `AgentReadinessBundle`, `AgentSkill`, `DiscoveryDocument`. Serves Agent Card, OAuth protected-resource metadata (RFC 9728), Agent Skills, `security.txt` (RFC 9116), and `llms.txt`. Fetches are fail-soft and cached in-memory.
- **Server-side OAuth2 app-bridge** (`@buildbase/sdk`): verify BuildBase's signed `applicationTokenUrl`/`applicationRevokeUrl` webhook requests and shape the exact response the platform expects — `handleAppTokenRequest`, `handleAppRevokeRequest`, `bearerChallenge`, `verifyAppTokenRequest`, `verifyAppRevokeRequest`, `verifyClientJwt`, `extractBearerToken`, `appTokenSuccess`, `appTokenFailure`, `AppBridgeError`; types `AppTokenRequestClaims`, `AppRevokeRequestClaims`, `AppTokenResult`, `AppTokenResponseBody`, `HandlerResult`. HS256 JWT verification is timing-safe with no `alg` confusion.
- **Dependency-free SHA-256 / HMAC-SHA256** (`src/lib/sha256.ts`): pure-JS implementation (no Web Crypto, no Node `crypto`) shared by the discovery and app-bridge toolkits, so digests are identical on every runtime (browser, edge, Node 18+).
- **README**: new "Webhook Verification", "Agent Readiness (Discovery)", and "OAuth2 App Bridge" sections, plus server-only toolkits in the API Reference.

### Fixed

- **Workspace → Users crash**: a member whose `name` is null/undefined (common with OAuth/passkey signups) no longer crashes the entire member list; `getUserDisplay` now falls back to the "unknown user" label.
- **Duplicate `onError` callbacks**: network/timeout failures routed through `fetchJson` invoked the `onError` callback twice (double Sentry capture / double error toast). The callback now fires at most once per failure, regardless of code path.
- Corrected the `agent-discovery` module JSDoc example, which referenced a non-existent `agentReady()` factory; it now uses the actual `resolveWellKnown` / `buildLlmsTxt` API.
- **AI-agent docs**: added `AGENTS.md` (shipped in the package) — a dense reference of both entry points, the full export map, the i18n contract, and gotchas.

## [0.0.19] - 2025-02-07

### Added

- **Multi-currency support**: New `currency-utils` with `CURRENCY_DISPLAY`, `CURRENCY_FLAG`, `PLAN_CURRENCY_CODES`, `PLAN_CURRENCY_OPTIONS`, `formatCents`, `formatOverageRate`, `formatOverageRateWithLabel`, `formatQuotaIncludedOverage`, `getCurrencyFlag`, `getCurrencySymbol`, `getQuotaUnitLabelFromName`.
- **Pricing variant utilities**: New `pricing-variant-utils` with `getPricingVariant`, `getBasePriceCents`, `getStripePriceIdForInterval`, `getQuotaOverageCents`, `getQuotaDisplayWithVariant`, `getAvailableCurrenciesFromPlans`, `getDisplayCurrency`, `getBillingIntervalAndCurrencyFromPriceId`; types `IPricingVariant`, `PlanVersionWithPricingVariants`, `QuotaDisplayWithOverage`.
- **API types**: `IPricingVariant`, `IStripePricesByInterval`, `IQuotaOveragesByInterval`, `IQuotaOveragePriceIdsByInterval`; plan/plan-version types now support `pricingVariants` and per-interval quotas.

### Changed

- **Plan and subscription types**: `IPlanVersion` uses `pricingVariants` (multi-currency) instead of single `basePricing`/`stripePrices`; `quotas` unified to `IQuotaByInterval`; `IQuotaIntervalValue` overage/priceId optional for public plans.
- **Public plans**: `IPublicPlanVersion` uses `pricingVariants` and `IQuotaByInterval`; removed `IPublicPlanPricing`, `IPublicPlanQuotaValue`; added `notes` to `IPublicPlansResponse`.
- **Workspace**: Refactored workspace hooks to simplify dependencies and state management; `SubscriptionDialog` and `SettingsSubscription` updated for multi-currency and new types; `SettingsGeneral` and `SettingsInvoices` adjustments.
- **Quota utils**: `quota-utils` API updates and alignment with pricing variant overage display.
- **Docs**: README added "Multi-Currency & Pricing Utilities" section and API reference for currency/pricing-variant/quota utilities; `ARCHITECTURE.md` documents API utilities and type exports; `ERROR_CODES.md` unchanged.

### Removed

- Legacy types: `IQuotaValue`, `IPublicPlanPricing`, `IPublicPlanQuotaValue` (replaced by pricing variants and `IQuotaByInterval`).
