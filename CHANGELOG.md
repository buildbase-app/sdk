# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
