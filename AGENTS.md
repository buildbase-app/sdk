# AGENTS.md — `@buildbase/sdk`

Machine-friendly reference for AI coding agents working **with** this SDK (in a consumer app) or **on** this repo. Dense by design. For prose, examples, and props tables see [README.md](./README.md); for internals see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [docs/ERROR_CODES.md](./docs/ERROR_CODES.md).

BuildBase is a multi-tenant SaaS platform SDK: auth, workspaces, subscriptions/billing (Stripe), quotas/usage, credits, feature flags, RBAC, notifications, i18n, and server-side agent (OAuth2 / discovery) tooling.

## The one rule: two entry points, pick by runtime

| Import                 | Runtime          | Contains                                                                                                                       |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `@buildbase/sdk`       | **Server** / any | Zero React. `BuildBase()` factory, API classes, webhooks, agent tooling, pure utils, enums, types.                             |
| `@buildbase/sdk/react` | **Client**       | Everything in core **re-exported** + React providers, hooks, gate components.                                                  |
| `@buildbase/sdk/data`  | any              | Static datasets: `countries`, `currencies`, `languages`, `timezones`, `betaFormSchema`.                                        |
| `@buildbase/sdk/mcp`   | **Server** / any | MCP server toolkit: `createMcpHandler`, `defineMcpTool`, built-in BuildBase tools. Uses zod at runtime (why it's not in core). |
| `@buildbase/sdk/css`   | build            | `import '@buildbase/sdk/css'` — required once for component styling.                                                           |

- **In a React component / client hook → import from `@buildbase/sdk/react`.** It contains the whole core surface too, so you rarely need both.
- **In an API route, server action, webhook, cron, or Node/edge → import from `@buildbase/sdk`.** Never import `/react` on the server.
- Default export of both `@buildbase/sdk` and `@buildbase/sdk/react` is the `BuildBase` server factory.
- ESM + CJS dual-published; peer dep React 18 or 19; Node ≥ 18.

## Client setup (React)

```tsx
import '@buildbase/sdk/css';
import { SaaSOSProvider } from '@buildbase/sdk/react';

<SaaSOSProvider
  serverUrl={process.env.NEXT_PUBLIC_BUILDBASE_URL!}
  orgId={process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID!}
  locale="en"
>
  {children}
</SaaSOSProvider>;
```

`BuildBaseProvider` is the brand-aligned alias of `SaaSOSProvider` (same component/props; prefer it in new code).

Everything below `SaaSOSProvider` can use the hooks and gate components. **Prefer SDK hooks over reaching into internal context/Redux.**

## Server setup

```ts
import BuildBase from '@buildbase/sdk';
export const {
  auth,
  workspace,
  subscription,
  usage,
  credits,
  plans,
  invoices,
  users,
  features,
  settings,
  notification,
  permissions,
  withSession,
  client,
} = BuildBase({
  serverUrl: process.env.BUILDBASE_URL!,
  orgId: process.env.BUILDBASE_ORG_ID!,
  getSessionId: async () => (await cookies()).get('bb-session-id')?.value ?? null, // Next.js
});
```

Express / no cookie context: omit `getSessionId`, call `withSession(sessionId)` per request.
Config also accepts: `timeout`, `maxRetries`, `debug`, `headers`, `onError(err, ctx)`, `fetch`.

## Export map (what lives where)

### `@buildbase/sdk` (core / server) — non-React

- **Factory:** `BuildBase` (also default export) → `{ auth, workspace, subscription, usage, credits, plans, invoices, users, features, settings, notification, permissions, withSession, client }`.
- **API classes:** `BaseApi` (extend for custom APIs), `AuthApi`, `UserApi`, `WorkspaceApi`, `SettingsApi`, `PushApi`.
- **Webhook verification (runtime-agnostic — Node, edge, Deno, Bun, browsers):** `verifyWebhookSignature`, `parseWebhookEvent`. Verify against the **raw** request body (`await req.text()`), not the parsed JSON.
- **Agent readiness (framework-agnostic, returns plain `DiscoveryDocument`):** **App owns discovery content, platform owns auth.** All content — `llms.txt`, `robots.txt`, `sitemap`, `protectedResources` (RFC 9728), API catalog, skills — is defined locally in `AgentReadyConfig` and served with no platform round-trip. The platform bundle (`fetchAgentReadiness`, fail-soft/cached) supplies ONLY `{ enabled, authorizationServer }` (the OAuth AS pointer). Functions: `resolveAgentPath` (dispatch ALL agent paths — root docs + `.well-known/*`; prefer for new wiring), `resolveWellKnown` (`.well-known/*` only), `clearAgentReadinessCache`, `buildAgentCard`, `buildA2AAgentCard` (A2A card at `/.well-known/agent-card.json`; served by DEFAULT, derived from `site`+`skills`; `a2aCard: false` disables, object overrides), `buildProtectedResourceMetadata(path, config)` (local), `buildAgentSkillsIndex`, `buildSkillMd`, `buildSecurityTxt`, `buildLlmsTxt(config)` (from `config.llmsTxt`), `buildLlmsFullTxt` (from `config.llmsFullTxt`), `buildRobotsTxt`, `buildSitemap`, `buildApiCatalog`, `buildMcpServerCard`, `buildAuthMd`, `buildWebBotAuthDirectory` (JWKS at `/.well-known/http-message-signatures-directory` from `config.webBotAuth.keys`; opt-in), `buildDnsAidRecords` (suggested `_agents` DNS records — publish at your DNS provider, can't be served over HTTP), `buildDiscoveryLinkHeader`, `wantsMarkdown`/`negotiateMarkdown`, `sha256Digest`, `AI_BOT_USER_AGENTS`. `config.extraPaths` serves ANY literal document by exact path (commerce discovery: x402/UCP/ACP/MPP, `/openapi.json`, future `.well-known` docs) and takes precedence over built-ins. Types: `AgentReadyConfig`, `AgentReadinessBundle`, `AgentSkill`, `ApiCatalogApi`, `A2ACardConfig`, `A2ACardSkill`, `DnsAidRecord`, `McpServerCard`, `RobotsConfig`, `RobotsPolicy`, `ContentSignals`, `SitemapUrl`, `DiscoveryDocument`.
- **OAuth2 app-bridge:** `handleAppTokenRequest`, `handleAppRevokeRequest` (one-call handlers), `bearerChallenge` (RFC 9728/6750 401; header values are quoted-string-escaped + CR/LF-stripped), `verifyAppTokenRequest`, `verifyAppRevokeRequest`, `verifyClientJwt`, `signClientJwt` (HS256 mint — symmetric counterpart of verify), `extractBearerToken`, `appTokenSuccess`, `appTokenFailure`, `AppBridgeError`. Types: `AppTokenRequestClaims`, `AppRevokeRequestClaims`, `AppTokenResult`, `AppTokenResponseBody`, `HandlerResult`, `VerifyClientJwtOptions`. `verifyClientJwt(token, secret, opts?: VerifyClientJwtOptions)` **requires a numeric `exp` by default** (`requireExp: false` to allow non-expiring tokens); optional `clockToleranceSec` / `issuer` / `audience`. **Presets** (also in core): `mintAgentToken` (the whole mint in one call — HS256 with the app's secret, `aud` from the grant's resource, encrypted `sid`) + `buildbaseAuth` (the whole verify) + `createSessionRefCrypto`. Security invariant: the platform relays the minted token but never sees the app secret — it can neither forge nor decode app tokens, and the BuildBase session is never stored and never plaintext in a token.
- **Currency & pricing utils (pure):** `formatCents`, `formatOverageRate`, `formatOverageRateWithLabel`, `formatQuotaIncludedOverage`, `formatQuotaWithPrice`, `getCurrencySymbol`, `getCurrencyFlag`, `getQuotaUnitLabelFromName`, `getQuotaDisplayValue`, `CURRENCY_DISPLAY`, `CURRENCY_FLAG`, `PLAN_CURRENCY_CODES`, `PLAN_CURRENCY_OPTIONS`.
- **Pricing variants (multi-currency):** `getPricingVariant`, `getBasePriceCents`, `getStripePriceIdForInterval`, `getQuotaOverageCents`, `getQuotaDisplayWithVariant`, `getAvailableCurrenciesFromPlans`, `getDisplayCurrency`, `getBillingIntervalAndCurrencyFromPriceId`.
- **Seat pricing:** `calculateBillableSeats`, `calculateSeatOverageCents`, `calculateTotalSubscriptionCents`, `getPerSeatPriceCents`, `getSeatPricing`.
- **RBAC (pure):** `hasPermission`, `resolvePermissions`, `resolveMaxUsers`, `validateInvite`, `DEFAULT_ROLE_PERMISSIONS`, `Permission` (enum).
- **URL / auth-intent / redirects:** `BB_PARAM`, `BBAction`, `BBScreen`, `BBStatus`, `createBBUrl`, `readBBParams`, `cleanBBParams`, `createCheckoutRedirectUrls`, `createCreditPurchaseRedirectUrls`, `safeRedirect`, `validateRedirectUrl`, `saveAuthIntent`, `consumeAuthIntent`, `clearAuthIntent`.
- **Context invalidation (call after server mutations to refetch client contexts):** `invalidateSubscription`, `invalidateQuotaUsage`, `invalidateCreditBalance`.
- **Events:** `EventEmitter`, `eventEmitter` (singleton), `SDKEvent` (enum).
- **Push:** `PushApi`, `PUSH_SERVICE_WORKER_SCRIPT`.
- **Enums:** `ApiVersion`, `AuthStatus`, `BillingIntervals`, `CreditBucketSource`, `CreditBucketStatus`, `CreditTransactionType`, `DunningState`, `InvoiceStatuses`, `SubscriptionItemType`, `SubscriptionStatus`.

### `@buildbase/sdk/react` — client-only additions (core is re-exported here too)

- **Providers:** `SaaSOSProvider` (root), `SubscriptionContextProvider`, `QuotaUsageContextProvider`, `CreditBalanceContextProvider`, `PushNotificationProvider`.
- **State hooks:** `useSaaSAuth`, `useSaaSWorkspaces`, `useSaaSOs`, `useSaaSSettings`, `useUserAttributes`, `useUserFeatures`, `useTranslation`, `usePermissions`, `useSeatStatus`, `useTrialStatus`, `useFullScreenLoader`.
- **Subscription/billing hooks:** `usePublicPlans`, `useSubscription`, `useSubscriptionContext`, `useSubscriptionManagement`, `usePlanGroup`, `usePlanGroupVersions`, `usePublicPlanGroupVersion`, `useCreateCheckoutSession`, `useUpdateSubscription`, `useCancelSubscription`, `useResumeSubscription`, `useBillingPortal`, `useInvoices`, `useInvoice`.
- **Quota hooks:** `useQuotaUsageContext`, `useRecordUsage`, `useQuotaUsageStatus`, `useAllQuotaUsage`, `useUsageLogs`.
- **Credit hooks:** `useCreditBalance`, `useCreditBalanceContext`, `useConsumeCredits`, `usePurchaseCredits`, `useCreditPackages`, `usePublicCreditPackages`, `useCreditTransactions`, `useExpiringCredits`.
- **Push hooks:** `usePushNotifications`.
- **Gate components (conditional render by state):**
  - Auth: `WhenAuthenticated`, `WhenUnauthenticated`
  - Roles: `WhenRoles`, `WhenWorkspaceRoles`, `WhenPermission`
  - Features: `WhenUserFeatureEnabled`, `WhenUserFeatureDisabled`, `WhenWorkspaceFeatureEnabled`, `WhenWorkspaceFeatureDisabled`
  - Subscription: `WhenSubscription`, `WhenNoSubscription`, `WhenSubscriptionToPlans`
  - Trial: `WhenTrialing`, `WhenNotTrialing`, `WhenTrialEnding`
  - Quota: `WhenQuotaAvailable`, `WhenQuotaExhausted`, `WhenQuotaOverage`, `WhenQuotaThreshold`
  - Credits: `WhenCreditsAvailable`, `WhenCreditsExhausted`, `WhenCreditsLow`
- **UI components:** `WorkspaceSwitcher`, `PricingPage`, `CreditStorePage`, `CreditBalance`, `CreditActionsProvider`, `BetaForm`, `FullScreenLoader`.
- **Misc:** `SUPPORTED_LOCALES`, `SETTINGS_SCREENS`, `SettingsScreen`, `workspaceSettingsManager`.

### `@buildbase/sdk/data`

`countries`, `currencies`, `languages`, `timezones`, `betaFormSchema` (Zod), type `BetaFormValues`.

### `@buildbase/sdk/mcp` — MCP server (server-only, zero React)

**Full guide: `docs/MCP-AND-AGENT-READINESS.md`** (mental model, fast path, auth, scope/resource customization).

Expose a live MCP server (stateless Streamable HTTP; Node 18+/edge) with built-in BuildBase tools + custom zod-schema tools, plus opt-in **resources** and **prompts**. **Spec-compliant to MCP 2025-11-25** (negotiates down to 2024-11-05; invalid tool args → `isError` tool results per SEP-1303; optional `icons` per SEP-973): server card SEP-1649 v1.0 (`$schema`, `version:"1.0"`, `protocolVersion`, `transport:{type,url}`, boolean caps), discovery manifest SEP-1960, auth via RFC 9728→8414→8707+PKCE. The platform issues **public clients** (RFC 7591 `token_endpoint_auth_method:"none"`, no secret, PKCE-only) so Claude Desktop/Cursor/ChatGPT/Inspector connect with zero manual config.

- **Handler:** `createMcpHandler({ buildbase?, auth, tools?, resources?, resourceTemplates?, builtinResources?, prompts?, builtinTools?, context?, serverInfo?, instructions?, allowedOrigins?, cors?, maxRequestBytes?, rateLimit?, formatToolError?, onError? })` → `{ handle(McpHttpRequest), fetch(Request), listTools(), serverCard({ endpoint }) }`. `fetch(Request)` is the Web adapter (Next.js App Router, Hono, Bun, Deno, Cloudflare Workers, edge); `handle({method,headers,body})` is the pure form (Express, Fastify, Next.js Pages Router, Node http). Per-framework copy-paste recipes + mint route + production checklist in `docs/MCP-AND-AGENT-READINESS.md`. `auth.verify(token) → McpAuthInfo { sessionId, userId?, workspaceId?, scopes? }` maps the app's Bearer token (any format) to the BuildBase session tools run under; `auth.resourceMetadataUrl` makes 401s carry the RFC 9728 challenge. `auth: false` = dev only. **Hardening:** `maxRequestBytes` (default 1 MiB → 413), `rateLimit(auth, req)` gate (after auth; `false`/`{ok:false,retryAfter}` → 429, fails closed), `allowedOrigins` (non-matching browser Origin → 403; also drives CORS — `OPTIONS` preflight → 204 + `Access-Control-*`, matching Origin echoed on responses), `formatToolError(err, {tool})` (redact client-facing tool-error text; full error still hits `onError`). **No lock-in:** `buildbase` is optional (standalone server, only your tools); `context(auth, req)` injects your own per-request context as `ctx.custom`; custom tools override same-named built-ins; raw JSON Schema tools skip zod.
- **Tool results:** return anything (string → text block; object → JSON text + `structuredContent`) or a wire-shaped `McpToolResult` for full control — mixed content blocks (`text`/`image`/`audio`/`resource_link`/embedded `resource`) + `isError`; helpers `mcpText`/`mcpImage`/`mcpAudio`/`mcpResourceLink`/`mcpEmbeddedResource`.
- **Resources & prompts (opt-in; capabilities advertised only when configured):** `builtinResources: true` = lean context catalog (`buildbase://profile`, `buildbase://workspaces`, `buildbase://workspace/{workspaceId}` template; richer data stays tools-only); custom via `defineMcpResource`/`defineMcpResourceTemplate` (`read` → string | object (JSON) | `{text}`/`{blob}`; level-1 `{var}` URI templates) and `defineMcpPrompt` (`get` → string | `McpPromptMessage[]`; required-arg validation). `requiredScopes` gates all three primitives identically; under-scoped = not-found (`-32002`). Not implemented by design (stateless transport, no push channel): subscriptions, `listChanged`, sampling, elicitation.
- **Tools:** `defineMcpTool` (typed custom tools), `builtinMcpTools`, `selectBuiltinTools`. Built-ins cover the **full BuildBase surface** (42 tools: workspaces/users/subscription/plans/invoices/usage/credits/features/permissions/settings — reads + writes + destructive). **Default `builtinTools: 'readonly'`** (least privilege) — reads only until you opt into `'all'` (or `{ include }`); narrow further with `false` | `{ exclude }`. Every tool runs under the user's session → platform enforces the user's real permissions (agent can't exceed the user). Built-ins carry **no** scope requirement (agent = authenticated app user; read/write boundary is `builtinTools`, not agent scopes). Per-scope gating is opt-in on custom tools via `requiredScopes` + the `scopes` returned from `auth.verify` (your scope names); a token with no scopes sees only tools that require none.
- **One-config stack:** `createAgentStack({ serverUrl, orgId, siteUrl, site, secret, mcp?, discovery? })` → `{ mcp, mcpEndpoint, config, linkHeader, resolvePath, serveAgentPath, routes }` — derives the MCP endpoint, server card, RFC 9728 protected resource, API catalog entry, BuildBase client, `buildbaseAuth`, and CORS from ONE object. Next.js wiring: `export const { GET, POST, DELETE, OPTIONS } = agent.routes` for `/api/mcp`, `export const GET = agent.serveAgentPath` for discovery routes. Everything derived is overridable via `mcp.*` / `discovery.*`.
- **BuildBase auth presets** (pure local crypto — the app's secret and tokens NEVER reach the platform): `mintAgentToken({ claims, secret, expiresInSec?, extraClaims? })` (drop into `handleAppTokenRequest.mintToken`; signs HS256 with YOUR secret, binds `aud` to the RFC 8707 resource, embeds the per-user session as an encrypted `sid` claim) and `buildbaseAuth({ secret, resource?, resourceMetadataUrl?, requireAudience?, verify? })` (the `auth` config for `createMcpHandler`: verify + RFC 8707 audience binding + `sid` decryption + derived `resourceMetadataUrl`; `resource` accepts `string|string[]`; `MCP_AUTH_DEBUG=1` logs received-vs-expected `aud` on rejection). `createSessionRefCrypto(secret)` exposes the underlying AES-256-GCM `sid` crypto (WebCrypto; wire format `base64url(iv|tag|ciphertext)`, key `SHA-256(secret+":bb-session")` — byte-compatible with Node `createCipheriv` implementations of the same layout).
- **Scopes & resources (restrict or open up) — ALL app-owned; the shared AS is scope/resource-agnostic:** THREE scope levers — (1) declare a catalog `scopes:[{name,description}]` on `AgentReadyConfig`/`createAgentStack` → `scopes_supported` in the app's OWN RFC 9728 protected-resource metadata (served from the app origin); (2) gate per custom tool via `requiredScopes` (hidden/refused unless the token carries all — YOUR scope names); (3) the floor — every tool runs under the user's session so the platform enforces the user's real permissions (agent ⊆ user). Built-ins are restricted by `builtinTools`, not scopes. TWO resource levers — declare `protectedResources` (RFC 9728: stack derives root + `<host>/mcp` + endpoint) and bind the token `aud` via `buildbaseAuth({ resource, requireAudience })` (RFC 8707) — the audience check at YOUR resource is the whole gate (token for A rejected at B); the AS just passes `resource` through opaquely (no per-org scope/resource lists, no `invalid_target`). Defaults are least-privilege; widen deliberately. RFC 9728 convention: canonical MCP resource is `<host>/mcp` (metadata at `/.well-known/oauth-protected-resource/mcp`), 401 `WWW-Authenticate` points there.
- **CORS:** on by default (`Access-Control-Allow-Origin: *` — safe for a Bearer-token API; reflects `allowedOrigins` when set). Narrow with `cors: [origins]` or disable with `cors: false`. Preflight answered automatically — never wrap the route in your own CORS.
- **Auth helpers re-exported:** `signClientJwt`, `verifyClientJwt`, `extractBearerToken`, `bearerChallenge`, `AppBridgeError`.
- Types: `CreateMcpHandlerConfig`, `McpHandler`, `McpToolDefinition`, `AnyMcpTool`, `McpToolContext`, `McpToolResult`, `McpContentBlock` (+ per-block types), `McpIcon`, `McpResourceDefinition`, `McpResourceTemplateDefinition`, `McpResourceReadResult`, `McpPromptDefinition`, `McpPromptMessage`, `McpPromptContent`, `McpAuthInfo`, `McpHttpRequest`, `McpHttpResponse`, `McpToolAnnotations`, `McpBuildBaseClient`, `BuiltinMcpToolName`, `AgentStack`, `AgentStackConfig`, `BuildBaseAuthOptions`, `MintAgentTokenOptions`, `SessionRefCrypto`, `VerifiedJwtPayload`.

## Server actions cheat-sheet

`workspace`: `list get create update delete` · `users`: `list invite remove updateRole getProfile updateProfile` · `subscription`: `get checkout update cancel resume getBillingPortalUrl` · `plans`: `getGroup getVersions getPublic getVersion` · `invoices`: `list get` · `usage`: `record recordBatch getQuota getAll getLogs` · `credits`: `getBalance consume purchase getPackages getTransactions getExpiring getBuckets getPublicPackages` · `settings`: `get` · `features`: `list update` · `notification`: `send(workspaceId, event, userId?, data?)` · `permissions`: `check(workspaceId, userId, permission) resolve(workspaceId, userId)`.

## Internationalization (i18n)

- 8 locales: `en es fr de ja zh hi ar`. English is bundled; others lazy-load. `SUPPORTED_LOCALES` lists them.
- All message catalogs are typed `: SDKMessages` (see `src/i18n/types.ts`) — **the type system guarantees every locale has the complete key set**; a missing/extra key fails `tsc`.
- Client: `const { t, locale, dir, fmtNum, fmtCents } = useTranslation()`. `t('a.b.c', { count })` is ICU MessageFormat with compile-time-checked keys. `dir` is `'rtl'` for Arabic. Hindi/Arabic render native numerals.
- Set the active locale via `SaaSOSProvider locale="…"` (accepts regional tags like `zh-TW`, resolved to the nearest supported locale).
- Only **user-facing UI strings** are translated. Server/machine output (JWT error codes, discovery JSON, webhook codes) is intentionally **not** localized.

## Gotchas (read before you touch)

- **Server vs client imports** — importing `@buildbase/sdk/react` on the server pulls React in; keep server code on `@buildbase/sdk`.
- **Webhooks** — always `verifyWebhookSignature`/`parseWebhookEvent` against the raw body string. In Next.js App Router use `await req.text()`, not `req.json()`.
- **After a server-side mutation** that changes subscription/quota/credits, call the matching `invalidate*` helper so client contexts refetch.
- **Agent-readiness fetches are fail-soft** — a platform outage yields `{ enabled: false }`, never a 500. Don't add your own error handling expecting throws.
- **New crypto is dependency-free pure JS** (`src/lib/sha256.ts`) so it behaves identically on browser/edge/Node — don't swap in Web Crypto / Node `crypto` without matching outputs.
- **Prefer SDK hooks** (`useSaaS*`, `useSubscription*`, etc.) over `useAppSelector`/internal context so consumer code stays stable across internal refactors.

## Working on this repo

- `npm run build` — rollup build of all entry points into `dist/` (also runs on `prepublishOnly`).
- `npx tsc --noEmit` — typecheck (also the i18n completeness guarantee).
- `npm run format` — Prettier + organize-imports.
- `npm run dev` / `npm run watch:push` — watch build (+ `yalc push` for local consumers).
- No test runner is configured; verify changes via `tsc`, `build`, and a consumer app.
- Source layout: `src/api` (API clients + pure billing utils), `src/contexts` + `src/providers` (React state), `src/hooks`, `src/components` (incl. `ui/` primitives), `src/lib` (framework-agnostic utils, webhooks, agent tooling, crypto), `src/i18n` (catalogs + `useTranslation`).
