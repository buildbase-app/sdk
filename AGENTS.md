# AGENTS.md — `@buildbase/sdk`

Machine-friendly reference for AI coding agents working **with** this SDK (in a consumer app) or **on** this repo. Dense by design. For prose, examples, and props tables see [README.md](./README.md); for internals see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [docs/ERROR_CODES.md](./docs/ERROR_CODES.md).

BuildBase is a multi-tenant SaaS platform SDK: auth, workspaces, subscriptions/billing (Stripe), quotas/usage, credits, feature flags, RBAC, notifications, i18n, and server-side agent (OAuth2 / discovery) tooling.

## The one rule: two entry points, pick by runtime

| Import                  | Runtime          | Contains                                                                 |
| ----------------------- | ---------------- | ----------------------------------------------------------------------- |
| `@buildbase/sdk`        | **Server** / any | Zero React. `BuildBase()` factory, API classes, webhooks, agent tooling, pure utils, enums, types. |
| `@buildbase/sdk/react`  | **Client**       | Everything in core **re-exported** + React providers, hooks, gate components. |
| `@buildbase/sdk/data`   | any              | Static datasets: `countries`, `currencies`, `languages`, `timezones`, `betaFormSchema`. |
| `@buildbase/sdk/css`    | build            | `import '@buildbase/sdk/css'` — required once for component styling.     |

- **In a React component / client hook → import from `@buildbase/sdk/react`.** It contains the whole core surface too, so you rarely need both.
- **In an API route, server action, webhook, cron, or Node/edge → import from `@buildbase/sdk`.** Never import `/react` on the server.
- Default export of both `@buildbase/sdk` and `@buildbase/sdk/react` is the `BuildBase` server factory.
- ESM + CJS dual-published; peer dep React 18 or 19; Node ≥ 18.

## Client setup (React)

```tsx
import '@buildbase/sdk/css';
import { SaaSOSProvider } from '@buildbase/sdk/react';

<SaaSOSProvider serverUrl={process.env.NEXT_PUBLIC_BUILDBASE_URL!} orgId={process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID!} locale="en">
  {children}
</SaaSOSProvider>
```

Everything below `SaaSOSProvider` can use the hooks and gate components. **Prefer SDK hooks over reaching into internal context/Redux.**

## Server setup

```ts
import BuildBase from '@buildbase/sdk';
export const { auth, workspace, subscription, usage, credits, plans, invoices,
  users, features, settings, notification, permissions, withSession, client } = BuildBase({
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
- **Webhook verification (Node only):** `verifyWebhookSignature`, `parseWebhookEvent`. Verify against the **raw** request body (`await req.text()`), not the parsed JSON.
- **Agent readiness (framework-agnostic, returns plain `DiscoveryDocument`):** `resolveWellKnown` (dispatch all `.well-known/*`), `fetchAgentReadiness` (fail-soft, cached), `clearAgentReadinessCache`, `buildAgentCard`, `buildProtectedResourceMetadata`, `buildAgentSkillsIndex`, `buildSkillMd`, `buildSecurityTxt`, `buildLlmsTxt`, `sha256Digest`. Types: `AgentReadyConfig`, `AgentReadinessBundle`, `AgentSkill`, `DiscoveryDocument`.
- **OAuth2 app-bridge:** `handleAppTokenRequest`, `handleAppRevokeRequest` (one-call handlers), `bearerChallenge` (RFC 9728/6750 401), `verifyAppTokenRequest`, `verifyAppRevokeRequest`, `verifyClientJwt`, `extractBearerToken`, `appTokenSuccess`, `appTokenFailure`, `AppBridgeError`. Types: `AppTokenRequestClaims`, `AppRevokeRequestClaims`, `AppTokenResult`, `AppTokenResponseBody`, `HandlerResult`.
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
