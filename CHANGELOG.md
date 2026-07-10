# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.53] - 2026-07-09

Production-readiness pass — MCP + agent-bridge hardening, permission-resolution correctness, auth-session teardown, and settings/a11y/i18n fixes. **Behavior changes** are marked ⚠️ (`builtinTools` default; permission-override semantics); the rest are additive or internal.

### Security

- **`builtinTools` now defaults to `'readonly'`, not `'all'`.** ⚠️ **Behavior change.** A `createMcpHandler({ buildbase })` with no explicit `builtinTools` previously exposed the entire surface — including `delete_workspace`, `cancel_subscription`, `purchase_credits`, `consume_credits` — to any token `auth.verify` accepted. It now exposes reads only (least privilege); opt into writes with `builtinTools: 'all'` or an explicit `{ include }` list. If you relied on the old default, add `builtinTools: 'all'`.
- **Scope gating no longer bypassed by scopeless tokens.** `visibleTools` treated `scopes: undefined` as "grant everything" — a JWT minted without a `scope` claim received every tool, including custom tools declaring `requiredScopes`. A token now sees a scoped tool only when it carries all of that tool's scopes; no scopes → only tools that require none. `scopes: []` and `scopes: undefined` behave identically.
- **Built-in `update_workspace` / `update_user_profile` no longer accept arbitrary fields.** Both took `data: z.record(z.string(), z.unknown())` forwarded to the backend `as any` (mass-assignment). They now expose an explicit, `.strict()` allowlist — `update_workspace`: `name`, `image`; `update_user_profile`: `name`, `image`, `country`, `timezone`, `language`, `currency` (role/email/attributes are not self-updatable via the agent tool).
- **`verifyClientJwt` requires a numeric `exp` by default.** A JWT with no expiry was accepted and never expired. New `VerifyClientJwtOptions` (passable as the 3rd arg, which still also accepts a bare `clockToleranceSec` number): `requireExp` (default `true`), plus optional `issuer` / `audience` pinning (RFC 7519).
- **`bearerChallenge` escapes `WWW-Authenticate` values.** `resource_metadata` / `error` / `error_description` are quoted-string-escaped and CR/LF-stripped, closing a header-injection vector when `errorDescription` is fed dynamic text.
- **`buildRobotsTxt` / `buildSitemap` sanitize interpolated config.** robots.txt directive values strip CR/LF (can't inject extra directives); sitemap `<changefreq>` is XML-escaped and `<priority>` is clamped to 0.0–1.0.
- **Permission resolution: explicit `[]` now revokes, and unknown roles are denied.** ⚠️ **Behavior change.** `resolvePermissions` used a non-emptiness check, so an explicit empty override (`workspace.permissions[role] = []`, a deliberate revoke) silently fell through to org/SDK defaults and granted permissions anyway. It now uses presence: an explicit entry — including `[]` — fully defines that role's permissions at that tier. And an **unknown role is denied by default** instead of silently inheriting `member` permissions; only an explicitly-configured, _known_ `settings.workspace.defaultRole` is honored as a fallback. Owners are unaffected (still all permissions).
- **A dead session (401) is now cleared.** `useWorkspaceApiWithOs`'s `onUnauthorized` only called `onSessionExpired`; it now also runs `removeSession()` + dispatches `authActions.removeSession()`, so gated UI can't keep rendering "authenticated" behind an invalid token.

### Added

- **MCP CORS / preflight.** With `allowedOrigins` set, `OPTIONS` returns 204 with `Access-Control-*` headers and successful responses echo `Access-Control-Allow-Origin` for a matching Origin — browser-based MCP clients now work. No `allowedOrigins` → no CORS headers (server-to-server unaffected).
- **`createMcpHandler({ formatToolError })`.** Map a thrown tool error to the message returned to the agent — redact internal details in production while the full error still reaches `onError`.
- **Public model types exported** from `@buildbase/sdk` and `/react`: `IUser`, `IWorkspace`, `ISettings`, `TranslationKey` (previously appeared in exported signatures but weren't name-exported).
- **`createMcpHandler` DoS controls.** `maxRequestBytes` (default 1 MiB) rejects oversized bodies with 413 before parsing — and before the stream is read on the `fetch` adapter (via `Content-Length`); set `0` to disable. `rateLimit(auth, req)` gate runs after auth and before dispatch, returning `false` or `{ ok: false, retryAfter }` for a 429 (the server holds no counters — back it with your own store; a throwing limiter fails closed).
- **OIDC discovery alias.** `resolveWellKnown`/`resolveAgentPath` now also serve the authorization-server metadata at `/.well-known/openid-configuration` (same document as `/.well-known/oauth-authorization-server`), and the Agent Card advertises `openid_configuration` — so agents that only probe the OIDC path no longer get a 404.
- **`AgentReadyConfig.fetchTimeoutMs`** (default 5000) — platform fetches (`fetchAgentReadiness`, auth-server metadata) now time out via `AbortController` and fail soft, so a hung BuildBase server can't hang discovery routes forever.
- **`onError` covers `tools/list` schema conversion.** A tool whose zod schema can't convert to JSON Schema no longer throws an unhandled 500 out of `handle`; it's reported via `onError` and served a permissive object schema.

### Fixed

- **`useConnectedAgents().refresh()` guards against stale writes.** The list fetch now passes an `AbortSignal`, ignores superseded/aborted responses, and aborts on unmount — a rapid workspace/server switch or unmount can no longer clobber state with an older response.
- **Accessibility.** The personal-mode settings trigger was a bare `div onClick` (no keyboard/AT access) — now `role="button"` + `tabIndex` + Enter/Space handling + `aria-label`. The subscription tabs had `role="tab"`/`tablist` without the rest of the pattern — now complete: `id`/`aria-controls`/roving `tabIndex`/arrow-key navigation, with real `role="tabpanel"` panels.
- **Hardcoded strings moved into i18n** (all 8 locales): subscription tabs `aria-label`, "(ends {date})", "Version {version}", the invite-email placeholder, and the logo / workspace-preview `alt` text.
- **Palette token.** `focus:ring-red-600` → `focus:ring-destructive`; the `lint:tokens` guard was widened to also catch `ring`/`outline`/`from`/`via`/`to`/`fill`/`stroke`/`shadow` palette classes.

### Changed

- **`lucide-react` bound to `>=0.544.0 <1`** — 0.x releases rename/remove icons; the previous open range let consumers pull a breaking minor.

## [0.0.52] - 2026-07-08

### Added

- **New entry point `@buildbase/sdk/mcp` — a live MCP server for your app.** `createMcpHandler({ buildbase, auth, tools })` returns a stateless Streamable-HTTP handler (`fetch(Request)` for Next.js/edge, pure `handle()` for Express) exposing the **full BuildBase surface** as MCP tools — 42 built-ins spanning workspaces, users, subscription, plans, invoices, usage, credits, feature flags, permissions, and settings (reads + writes + destructive ops). **Default `builtinTools: 'all'`** — the SDK restricts nothing; the consumer narrows via `'readonly'` | `false` | `{ include }` | `{ exclude }`. Every tool runs under the user's BuildBase session, so the platform enforces the user's real permissions (an agent can never exceed the user). Custom tools are defined with `defineMcpTool` + zod schemas (converted to JSON Schema with zod 4's native `z.toJSONSchema`). Bearer auth plugs into the OAuth2 app-bridge: `auth.verify` maps the app-minted token to the BuildBase session tools run under, and unauthenticated requests get an RFC 9728 `WWW-Authenticate` challenge. Built-in tools carry no BuildBase-specific scope requirement (the agent acts as an authenticated app user; the read/write boundary is `builtinTools`); optional per-scope gating (`requiredScopes` vs the token's `scopes`) is available for custom tools using your own scope names. Origin allowlisting, per-request `withSession`. Hand-rolled protocol subset (initialize / ping / tools/list / tools/call, protocol versions 2024-11-05 → 2025-06-18) — no `@modelcontextprotocol/sdk` dependency (zod-3-based, Node-http-bound). Separate entry so the core stays zod-free at runtime.
- **`resolveAgentPath(path, config)`** — superset of `resolveWellKnown` that also serves the root-level documents: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/auth.md`, `/security.txt` (RFC 9116 legacy alias). One catch-all now covers the entire agent-readiness surface.
- **`buildRobotsTxt(config)`** — robots.txt with per-AI-bot policy groups (new `AI_BOT_USER_AGENTS` list: GPTBot, ClaudeBot, PerplexityBot, Bytespider, …; `aiBots: 'allow' | 'deny' | RobotsPolicy[]`), [Content Signals](https://contentsignals.org) directives (`contentSignals: { search, aiInput, aiTrain }`), and `Sitemap:` references.
- **`buildSitemap(config)`** — minimal sitemap.xml from `config.sitemap.urls` for API-first apps without a content pipeline (null when unconfigured, so next-sitemap users keep their files).
- **`wantsMarkdown(acceptHeader)` / `negotiateMarkdown(...)`** — q-value-aware markdown content negotiation; negotiated documents carry `vary: 'Accept'` (new optional field on `DiscoveryDocument`).
- **`buildDiscoveryLinkHeader(config)`** — `Link` response-header value advertising llms.txt, the Agent Card, sitemap, API catalog, and MCP server card. Sync/pure — edge-middleware-safe.
- **`signClientJwt(payload, secret, { expiresInSec? })`** — HS256 mint, the symmetric counterpart of `verifyClientJwt`, for `applicationTokenUrl` handlers that mint the app's agent tokens (pure JS, edge-safe).
- **`config.llmsTxt`** — local llms.txt override that wins over the platform-bundle content (mirrors the existing `authMd` convention).
- **MCP without lock-in:** `buildbase` is optional on `createMcpHandler` — omit it for a standalone MCP server exposing only your own tools (built-ins default off; `ctx.bb` throws a clear error if touched). New `context(auth, req)` factory injects your own per-request context (`ctx.custom`) into tool executions. Custom tools now override same-named built-ins instead of throwing.

### Changed

- **Clean split: the app owns discovery content, the platform owns auth.** `protectedResources` (RFC 9728) and `llms.txt` are now defined locally in `AgentReadyConfig` and served with no platform round-trip — `buildProtectedResourceMetadata(path, config)` builds the doc from `config.protectedResources` (deriving `authorization_servers` from `serverUrl`/`orgId`), and `buildLlmsTxt(config)` serves `config.llmsTxt`. Both lost their `bundle` parameter. `AgentReadinessBundle` is slimmed to `{ enabled, authorizationServer }` — the only thing the platform supplies. New config field: `AgentReadyConfig.protectedResources`.
- **`/.well-known/oauth-authorization-server` now serves the full RFC 8414 metadata** (cached, fail-soft proxy of the platform's canonical document) instead of a nonstandard pointer object; falls back to the pointer when the platform is unreachable. `clearAgentReadinessCache()` clears this cache too.
- **`AppTokenRequestClaims.sessionId`** — the platform now mints a per-user BuildBase session on every OAuth2 grant (including refresh) and sends it in the app-bridge mint claims. Embed it encrypted in the token you mint (never plaintext, never stored) so your MCP/agent endpoints can call BuildBase as the consenting user.

## [0.0.51] - 2026-07-08

### Fixed

- **Combobox dropdowns (language/country/currency/timezone) looked disabled and ignored clicks.** The shared `CommandItem` styled items with the presence-based `data-[disabled]:` selector, but cmdk ≥1.0 always renders `data-disabled="true|false"` — so every option got `opacity-50` + `pointer-events-none`. Selector now matches the value (`data-[disabled=true]:`).
- **Dropdown search matches visible labels**, not just option codes ("germ" now finds Germany, not only "de") via cmdk `keywords`; a search with no matches shows a translated "No results found" empty state (new `dropdowns.noResults` key in all 8 locales) instead of a blank panel.
- **Dropdown triggers now match the Input styling** (same `rounded-md` radius, height, border, and text size) instead of inheriting the pill-shaped button base — form screens look consistent.
- **Switch thumb mirrors correctly in RTL locales** (Arabic) — the checked state used a physical `translate-x` that moved the wrong way.
- `CommandInput` wrapper attribute aligned to the canonical `cmdk-input-wrapper` so `CommandDialog`'s scoped selectors apply.

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
