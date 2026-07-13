# SDK Fresh-Eye Review — Findings Backlog (2026-07-08)

Full-codebase review (core/API, state/providers/hooks, UI screens, packaging/types/i18n/docs).
43 verified findings. Status: **Batches 1–3, MCP hardening, Batch 2 (money & security), and the state-layer batch all done (last: 2026-07-10)** — check items off as they land.
Remaining (4, all behavior-changing by design — need explicit sign-off): selector `useSyncExternalStore` rework, `useSaaSWorkspaces` → real provider, hook return-shape renames, response-envelope unification (`selectFreePlan`/`requestAuth`). Plus 1 new 🟡 finding from wave 2 (displayCurrency cell divergence, below).

Legend: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low

---

## MCP hardening batch — done (2026-07-09, v0.0.53)

Separate review of the 0.0.52 MCP server (not covered above). All landed:

- [x] 🔴 **`builtinTools` defaulted to `'all'`** — any accepted token got destructive/billing built-ins. Default is now `'readonly'` (least privilege); writes are opt-in. (`mcp-server.ts`)
- [x] 🔴 **Scopeless tokens bypassed scope gating** — `visibleTools` returned all tools when `scopes` was `undefined`. Now `undefined`/`[]` are equivalent and a scoped tool needs all its scopes. (`mcp-server.ts`)
- [x] 🟠 **Mass-assignment in `update_workspace` / `update_user_profile`** — open `z.record` → backend `as any`. Replaced with `.strict()` field allowlists. (`mcp-tools.ts`)
- [x] 🟠 **`verifyClientJwt` didn't require `exp`** — non-expiring tokens accepted. `requireExp` (default true) + optional `issuer`/`audience`. (`agent-bridge.ts`)
- [x] 🟠 **No request-body cap / no rate-limit surface** — added `maxRequestBytes` (default 1 MiB, 413) + `Content-Length` pre-check on the fetch adapter, and a stateless `rateLimit` gate (fails closed, 429). (`mcp-server.ts`)
- [x] 🟡 **`tools/list` schema conversion unwrapped** — a bad zod schema threw an unhandled 500. Now caught, reported to `onError`, served a permissive object schema. (`mcp-server.ts`)
- [x] 🟡 **Bare `fetch` with no timeout in discovery** — `fetchAgentReadiness`/auth-server metadata now use `AbortController` + `fetchTimeoutMs` (default 5000), fail-soft. (`agent-discovery.ts`)
- [x] 🟡 **Unescaped interpolation** — `bearerChallenge` header values (quoted-string escape + CR/LF strip); robots.txt directive values (CR/LF strip); sitemap `changefreq` (XML-escape) / `priority` (clamp 0–1). (`agent-bridge.ts`, `agent-discovery.ts`)
- [x] 🟡 **`useConnectedAgents().refresh()` had no abort guard** — now `AbortSignal` + stale-response guard + unmount abort. (`connected-agents/hooks.ts`)

Follow-up (2026-07-09, same version): the deferred MCP items are now largely closed — **CORS/OPTIONS** added (driven by `allowedOrigins`), **tool-error redaction** via `formatToolError`. Still deferred: built-in `send_notification` fan-out has no rate limit of its own (mitigated by the `rateLimit` gate).

## Batch 3 (correctness / a11y) + types — done (2026-07-09, v0.0.53)

- [x] 🟡 **401 left auth context authenticated** — `useWorkspaceApiWithOs.onUnauthorized` now clears stored + redux session. (`use-workspace-api.ts`)
- [x] 🟡 **Permission overrides couldn't revoke; unknown roles got member perms** — presence-based tiers (explicit `[]` revokes); unknown roles denied unless a known `defaultRole` is configured. Doc corrected (`applySettingRestrictions` only handles `canInviteMembers`). (`permissions.ts`) ⚠️ behavior change.
- [x] 🟠 **Keyboard-inaccessible settings trigger** — `role=button`/`tabIndex`/Enter-Space/`aria-label`. (`workspace/provider.tsx`)
- [x] 🟠 **Forbidden palette class** `focus:ring-red-600` → `focus:ring-destructive`; `lint:tokens` regex widened (now catches `ring`/`outline`/`from`/`via`/`to`/`fill`/`stroke`/`shadow`).
- [x] 🟡 **ARIA tabs without tab semantics** — completed: ids, `aria-controls`, roving `tabIndex`, arrow keys, real `role=tabpanel` panels. (`SettingsSubscription.tsx`)
- [x] 🟠 **Hardcoded English strings** — subscription tabs label, "(ends {date})", "Version {n}", invite-email placeholder, logo / workspace-preview alt text → i18n keys in all 8 locales.
- [x] 🟡 **Public-signature types not exported** — `IUser`, `IWorkspace`, `ISettings`, `TranslationKey` now exported from core (both entries). (`WorkspaceContextValue` deferred — two definitions; needs disambiguation.)
- [x] 🟡 **Unbounded `lucide-react`** → `>=0.544.0 <1`.

Deferred from Batch 3 (larger, want tests first): `useSaaSWorkspaces` lifecycle into a real provider; selector `useSyncExternalStore` rework; `any`-index signatures; `SettingsSubscription.tsx` extraction.

## State-layer batch (async correctness) — done (2026-07-10, unreleased)

- [x] 🔴 **Stale-response races in gate-context fetch hooks** — new `useLatestRequest()` helper (`lib/use-latest-request.ts`, follows the `useConnectedAgents` pattern) applied to all 15 read hooks: subscription-hooks (usePublicPlans, usePublicPlanGroupVersion, useSubscription, usePlanGroup, usePlanGroupVersions, useInvoices, useInvoice, useQuotaUsageStatus, useAllQuotaUsage, useUsageLogs) + credit-hooks (useCreditBalance, useCreditPackages, useCreditTransactions, useExpiringCredits, usePublicCreditPackages). Superseded responses are dropped; only the latest request clears `loading`; unmount aborts.
- [x] 🔴 **`useSaaSSettings` StrictMode/shared-promise bug** — the deduped global fetch is now detached from any caller's AbortSignal (its result lands in the global store, so it must not die with a component). (`os/hooks.ts`)
- [x] 🟡 **`UserProvider` split** — per-resource `attributesLoading/featuresLoading` + `attributesError/featuresError` (combined `isLoading`/`error` kept for back-compat); stale errors cleared on new requests; `t` added to deps; `useUserFeatures` now reports features-only state as documented. (`user/provider.tsx`, `user/hooks.ts`)
- [x] ⚪ **`createWorkspace` 300ms timer** — tracked in a ref, cleared on unmount and re-invocation. (`workspace/hooks.ts`)
- [x] ⚪ **`settingsManager`** — `clearParams()` notifies subscribers (no-op when params already empty); `getState()` returns the stable internal snapshot (`useSyncExternalStore`-ready). (`settings-manager.ts`)

## Batch 4 wave 2 (pure structural extractions) — done (2026-07-10, unreleased)

Byte-identical-output refactors only; anything requiring a logic change was skipped and noted.

- [x] 🟠 **SettingsSubscription.tsx 1,473 → 1,040 lines** — extracted to `ui/subscription/`: `SubscriptionStatusBadge`, `TrialBanner`, ONE `SubscriptionNoticeBanner` primitive (replaces the 4 near-identical banners; call sites pass their original classes/icon/JSX verbatim), `PlanDetailsSection` (+`getPlanDetailsFromItems`), `CancelSubscriptionDialog`/`ResumeSubscriptionDialog`, shared `formatPeriodEndDate`. Left inline deliberately: the plan-header block (shares ~10 derived values with PlanDetailsSection — extraction would restructure the IIFE), the deprecation banner (different shape), the button-picker IIFE.
- [x] 🟡 **SubscriptionDialog.tsx 1,356 → 1,249 lines** — extracted to `ui/subscription-dialog/`: `utils.ts` (`getAllSubscriptionItems`, `getDisplayCurrency`, `getCreditRenewalModeKey`, `calculateSavings`, `INTERVAL_LABEL_KEYS`), `PlanTrialBadge`, `PlanPriceBlock`, `CreditGrantSummary` — only the byte-identical mobile/desktop pieces; divergent wrappers/savings-badge/seat-price left per-variant. 2 of 6 `displayCurrency` computations unified; the other 4 use a shorter expression (see new finding below).
- [x] ⚪ **Branding alias** — `BuildBaseProvider` (+`BuildBaseProviderProps`) exported from `/react` as an identical alias of `SaaSOSProvider`; docs mention it; no deprecation yet.
- [x] 🟡 (part of return-shape finding) **`useSaaSWorkspaces` return object memoized** — stable identity between renders; values unchanged. The naming-convention part of the finding (isLoading vs loading etc.) remains open — it's a breaking rename.

### New findings (from wave 2, not yet fixed)

- [ ] 🟡 **Possible latent bug: 4 `displayCurrency` table-cell computations skip the currency-match check.** `SubscriptionDialog.tsx` (features/limits/quotas/per-seat cells) use `pricingVariants?.length ? effectiveCurrency : …` without the `.some(v => v.currency === effectiveCurrency)` guard the card/header use — so when variants exist but none match the effective currency, cells assume `effectiveCurrency` while the card falls back to the plan's base currency. Verify intended behavior, then either unify on `getDisplayCurrency` or document why cells differ.

## Batch 4 wave 1 (mechanical polish) — done (2026-07-10, unreleased)

- [x] 🟡 **WorkspaceApi AbortSignal** — all 49 public methods take a trailing `signal?: AbortSignal` (UserApi/AuthApi convention).
- [x] 🟡 **Response-handling dedup** — `BaseApi.fetchUnwrapped<T>()` collapses 24 identical fetch→error→unwrap call sites. Left divergent on purpose: `consumeCredits` (custom 402→INSUFFICIENT_CREDITS mapping), `selectFreePlan` / `AuthApi.requestAuth` (raw `response.json()` — convention unification still open).
- [x] 🟡 **`<NoPermission/>` instead of blank pane** — SettingsSubscription renders it, and the permission check moved above the skeleton (no flash-then-blank).
- [x] 🟡 **`useTransientStatus()` hook** — replaces the ×4 copy-pasted message-timer blocks (SettingsSubscription ×3, SettingsUsers ×1); timer cleared on unmount and re-schedule.
- [x] 🟡 **Dead logic removed** — unused `hasNewerVersion`, the duplicated error StatusBanner (kept the top-level one; the inline slot now renders only the EmptyState when there is no error), unused required `WorkspaceItemProps.onClose`, `sortedPlans` no-op copy (and `getAllSubscriptionItems` is memoized now).
- [x] ⚪ **Formatter dedup** — new shared `formatMinorAmountIntl` (locale-aware Intl, zero-decimal-safe) replaces SettingsInvoices' local copy (which still had the JPY ÷100 bug); SettingsSubscription's `formatPeriodEndDate` and ConnectedAgents' date formatting delegate to `format-utils.formatDate`.
- [x] 🟡 **`any`-index signatures** — `ISettings` and `NotificationData` index signatures are `unknown` (⚠️ type-level change for consumers who read arbitrary keys without narrowing). `WebMcpTool` became generic (`<TInput = any>`) instead of `unknown` — plain `unknown` broke inline-typed `execute` handlers in the reference webapp (parameter contravariance); the generic keeps them working while enabling strict typing.

## Batch 2 (money & security) — done (2026-07-10, unreleased)

- [x] 🔴 **Retries replay non-idempotent POSTs** — retries now gated on RFC 9110 idempotent methods (GET/HEAD/OPTIONS/PUT/DELETE); POST/PATCH never replayed. Backoff sleep is abort-aware (caller abort or timeout ends it immediately). (`api-base.ts`) ⚠️ behavior change: POSTs no longer retry on 5xx/network error.
- [x] 🟠 **Open-redirect gaps** — `validateRedirectUrl` now accepts relative paths (rejects `//host` and `/\host` forms), takes `{ sameOrigin, allowedOrigins }`, and `safeRedirect` validates the fallback. Auth-intent return URLs are same-origin-only; Stripe/OAuth cross-origin https targets unchanged. Also fixed: the `http://[::1]` localhost check never matched (URL.hostname includes brackets). (`security.ts`, `auth-intent.ts`)
- [x] 🟡 **Zero-decimal currencies (JPY)** — `isZeroDecimalCurrency` + `minorAmountToDisplay` (exported); fixed `formatCents`, `formatOverageRate(-WithLabel)`, `formatQuotaWithPrice`, `getQuotaDisplayParts`. `formatCents(1000,'jpy')` → `¥1,000`. (`currency-utils.ts`, `quota-utils.ts`)
- [x] ⚪ **`createBBUrl` silent localhost fallback** — invalid explicit base now throws; the localhost default remains only for the no-argument server-side case. (`url-params.ts`)

Tests added (vitest, now 85 total): `permissions`, `security`, `url-params`, `api-base` retry/abort, `currency-utils`/`quota-utils` zero-decimal — plus the pre-existing `sha256`, `agent-auth`, `agent-stack` suites.

---

## Core / API layer

- [x] 🔴 **Retries replay non-idempotent POSTs — double-charge risk.** `src/lib/api-base.ts:208-243` retries any method on network error/5xx, including `consumeCredits`, `recordUsage`, `purchaseCredits`, `createCheckoutSession` (`workspace-api.ts:736,523,768,385`). Restrict retries to idempotent methods or auto-attach the backend-supported `idempotencyKey`.
- [x] 🟠 **User aborts misreported as timeouts.** `src/lib/api-base.ts:222-229` converts any `AbortError` into a fake "Request timeout" error whenever a timeout is configured (default 30s ⇒ always). Defeats `isAbortError()` (`error-handler.ts:75`); unmount cancellations surface as real errors. Convert only when the timeout controller actually fired (see `fetchWithTimeout`, `api-utils.ts:381`).
- [x] 🟠 **`validateRedirectUrl`/`safeRedirect` don't prevent open redirects.** `src/lib/security.ts:10-50`. Protocol-only check (`https://evil.com` passes); safe relative paths (`/dashboard`) throw in `new URL()` and silently fall back; `fallbackUrl` is never validated. Add same-origin/allowlist validation + relative-path support via `new URL(url, origin)`.
- [x] 🟡 **`unwrapResponse` uses `result.data || result`.** `src/lib/api-base.ts:325` — falsy payloads (`0`, `false`, `''`, `null`) return the whole envelope cast to `T`. Use `result.data !== undefined ? result.data : result`. (~25 call sites affected.)
- [x] 🟡 **Path params not URI-encoded.** `workspace-api.ts:137,175,263,374`, `user-api.ts:41` — IDs containing `/ ? # ../` retarget the request path; query params in the same file ARE encoded. Wrap path segments in `encodeURIComponent()`.
- [x] 🟡 **Permission overrides can't revoke; unknown roles gain member perms.** `src/lib/permissions.ts:164-184` — `length > 0` checks mean `[]` (explicit revoke) falls through to defaults; unknown roles fall back to `member` (grant-by-default). Also doc at :121 claims `applySettingRestrictions` handles `canCreateWorkspace` but it only handles `canInviteMembers` (:210-226). Distinguish "present but empty" from "absent"; deny unknown roles.
- [x] 🟡 **`formatCents` breaks zero-decimal currencies (JPY).** `src/api/billing/currency-utils.ts:95-97` — `formatCents(1000,'jpy')` → "¥10.00" instead of ¥1,000; `jpy` is in `PLAN_CURRENCY_CODES`. Same bug in `formatOverageRate`/`formatQuotaWithPrice`. Maintain a zero-decimal set or use `Intl.NumberFormat`.
- [x] 🟡 **~20× copy-pasted response handling + 3 divergent conventions.** `workspace-api.ts:278-865` repeats fetch→throwResponseError→unwrapResponse; others use `fetchJson`; `selectFreePlan` (:410) / `AuthApi.requestAuth` (auth-api.ts:45) return raw `response.json()` unchecked. Add `BaseApi.fetchUnwrapped<T>()`; one envelope convention.
- [x] 🟡 **WorkspaceApi methods can't be aborted.** All ~40 methods lack `AbortSignal` params (Auth/User/Settings APIs have them). Thread an optional `signal` through.
- [x] ⚪ **`createBBUrl` swaps invalid base for `https://localhost`.** `src/lib/url-params.ts:122-130` — a typo'd base yields Stripe return URLs pointing at localhost with no error. Throw/return null instead. Related: retry backoff (`api-base.ts:215,241`) ignores the abort signal during sleep.

## State / providers / hooks

- [x] 🔴 **Stale-response races in every gate-context fetch hook.** `subscription-hooks.ts:208-241` (`useSubscription`), `:1305-1338` (`useAllQuotaUsage`), `credit-hooks.ts` (`useCreditBalance`), `usePlanGroup`, `useInvoices`, `useUsageLogs`, `usePublicPlans` — `setState` after `await` with no abort/version guard. Workspace switch can render the previous workspace's subscription/quota/credits through `WhenSubscription` etc. Add abort signal or `versionRef` guard before each `setState`.
- [x] 🔴 **`useSaaSSettings` shared promise bound to first caller's AbortSignal; StrictMode kills settings for the session.** `src/providers/os/hooks.ts:38-85` — module-global `_settingsFetchPromise` uses a component signal; on abort all waiters get `null`, error is swallowed, effect deps never re-fire. Use a detached AbortController for the deduped fetch, or re-arm while `settings === null && !_settingsFetchPromise`.
- [ ] 🟠 **`useSaaSWorkspaces` singleton logic lives per hook instance.** `workspace/hooks.ts:202-220, 228-230, 233-273, 385-417` — init effect, dedup refs, auto-switch fallback are per-instance while the hook mounts in many components: double fetches, and `onWorkspaceChange` / `workspace:changed` can fire multiple times per switch (implementors mint tokens there). Move lifecycle into a real provider (`WorkspaceProvider` at provider.tsx:45-47 is currently an empty passthrough); keep the hook as selector/actions.
- [ ] 🟠 **Selector API doesn't bail out of re-renders.** `contexts/shared/createContext.tsx:73-102`, `useAppSelector.ts:35-56` — `useContext` on the whole state context means every dispatch re-renders every consumer of `useSaaSAuth`/`usePermissions`/`useUIVisibility`/`useSaaSWorkspaces`; docs claiming selector bailout are false; `useSelectWithEquality` writes refs during render. Rework with `useSyncExternalStore` over a mutable store (or `use-context-selector`).
- [x] 🟡 **401 leaves auth context authenticated.** `use-workspace-api.ts:20-22` — `onUnauthorized` never dispatches `removeSession()`; dead session keeps authenticated UI up. Also `session.expires` (auth/utils.ts:38-44) is stamped but never checked — dead field.
- [x] 🟡 **`UserProvider` shares `error`/`loading` across attributes+features pipelines.** `user/provider.tsx:38-158` — cross-stomping flags, stale error never cleared, mutation refetches have no abort signal, `t` missing from deps. Split per-resource state.
- [ ] 🟡 **Hook return shapes drift from `{ data, loading, error, refetch }` convention.** `useUserAttributes`/`useUserFeatures` → `isLoading`/`refreshX`; `useSaaSSettings` → no loading/error at all (WorkspaceSwitcher flashes wrong UI on `?? true` defaults until settings arrive); `useSaaSWorkspaces` returns an unmemoized ~25-key object every render (`hooks.ts:618-646`).
- [x] ⚪ **Un-cleared 300ms timer in `createWorkspace`.** `workspace/hooks.ts:308-310` — plan picker can open after navigate/sign-out. Clear on unmount or open after switch resolves.
- [x] ⚪ **`settingsManager.clearParams()` doesn't notify subscribers; `getState()` allocates per call.** `settings-manager.ts:35-37, 79-84` — diverges manager/React state; blocks `useSyncExternalStore` migration. Notify on clear; return internal immutable state.

## UI components / screens

- [x] 🟠 **Hardcoded English strings bypass i18n.** `SettingsSubscription.tsx:732` `(ends {date})`; `:830` `Version {n}`; `:465` `aria-label="Subscription tabs"`; `SettingsUsers.tsx:478` placeholder email; `provider.tsx:561` + `BetaForm.tsx:268,270` alt texts. Add keys to types.ts + all 8 locales.
- [x] 🟠 **Keyboard-inaccessible settings trigger in personal mode.** `provider.tsx:146` — plain `div onClick` with no role/tabIndex/key handler; keyboard/AT users can't open settings when `showSwitcher` is false. Use `DialogTrigger asChild`.
- [x] 🟠 **`SettingsSubscription.tsx` is 1,467 lines.** Extraction seams: `SubscriptionStatusBadge` (696-747), `TrialBanner` (645-686), one `SubscriptionNoticeBanner` primitive replacing 4 near-identical banners (905-1021), `PlanDetailsSection` (1023-1239), `CancelSubscriptionDialog`/`ResumeSubscriptionDialog` (1332-1462).
- [x] 🟠 **Forbidden palette class.** `SettingsSubscription.tsx:1450` `focus:ring-red-600` → `focus:ring-destructive`. (Note: current lint:tokens grep doesn't catch `ring-*` — consider widening the regex.)
- [x] 🟡 **Blank pane instead of `<NoPermission/>`.** `SettingsSubscription.tsx:415` `if (!canViewBilling) return null` (after the skeleton return → skeleton flash then nothing). Siblings do it right.
- [x] 🟡 **ARIA tabs without tab semantics.** `SettingsSubscription.tsx:465-493` — `role="tablist"/"tab"` but no `aria-controls`/ids/tabpanel/arrow-keys. Complete the pattern or drop the roles.
- [x] 🟡 **`hasActiveSubscription` wrong while loading.** `SettingsSubscription.tsx:1291` — `subscription?.subscription !== null` is `true` when `undefined`. Use `!= null`.
- [x] 🟡 **Paid plan with missing interval price renders "Free".** `SubscriptionDialog.tsx:609-613, 889-893` — dead ternary branch; `formatPrice(null)` → `'' || t('pricing.free')`. Show `'—'` for `price === null`.
- [x] 🟡 **Mobile/desktop plan rendering duplicated.** `SubscriptionDialog.tsx:543-800` vs `827-1350` (+ third credits copy in `SettingsSubscription.tsx:1196-1235`); `displayCurrency` recomputed inline 6×. Extract `PlanTrialBadge`, `PlanPriceBlock`, `CreditGrantSummary`, `getDisplayCurrency()`.
- [x] 🟡 **Transient-message timer boilerplate ×4.** `SettingsSubscription.tsx:350-357, 376-383, 401-408`, `SettingsUsers.tsx:451-458`. Extract `useTransientStatus()`.
- [x] 🟡 **Dead/contradictory logic.** Unused `hasNewerVersion` (`SettingsSubscription.tsx:187-200`); double error banners (`:430-440` + `:1260-1270`); unused required `WorkspaceItemProps.onClose` (`provider.tsx:286`); `sortedPlans` no-op copy + unmemoized `getAllSubscriptionItems` (`SubscriptionDialog.tsx:197-201`).
- [x] ⚪ **Local formatters duplicate shared utils.** `SettingsInvoices.tsx:16-24` re-implements `fmtCents` (hardcodes `en-US` default); `SettingsSubscription.tsx:70-83` + ConnectedAgents re-implement `format-utils.formatDate`.

## Packaging / types / i18n / docs

- [x] 🔴 **`/react` d.ts declares ~60 runtime values that don't exist.** `src/react.ts:19` `export type * from './core'` → `rollup-plugin-dts` flattens to value exports in `dist/react/index.d.ts`; runtime bundle has none (verified: `Permission`, `formatCents` missing). README (incl. the UI-config `useUIVisibility`+`Permission` example) and JSDoc teach the broken import. Fix: `export * from './core'` (values) — matches docs/intent.
- [x] 🟡 **`@hookform/resolvers` is a runtime import but devDependency-only.** Imported in 4 shipped files; silently bundled (contradicts 0.0.50 externalization claim), version-skew risk vs external `zod`/`react-hook-form`. Move to `dependencies`.
- [x] 🟡 **Public-signature types not exported.** `IWorkspace`, `ISettings`, `IUser`, `WorkspaceContextValue`, `TranslationKey` appear in exported signatures but aren't name-exported from `/react`. Add to exports.
- [x] 🟡 **`any`-index signatures defeat typing.** `ISettings` (`providers/types.ts:29`) and `NotificationData` (`workspace-api.ts:92`) — use `unknown` index or dedicated `extensions`/`mergeTags` fields. Also `WebMcpTool.execute(input: any)` (`agent-discovery.ts:625`).
- [x] 🟡 **AGENTS.md still says webhook verification is "Node only".** `AGENTS.md:72` — contradicts 0.0.50 runtime-agnostic fix (README was updated, AGENTS.md missed).
- [x] 🟡 **Unbounded `lucide-react >=0.544.0`.** package.json:100 — 0.x releases rename/remove icons; now externalized so consumers get newest. Bound it (`>=0.544.0 <1`).
- [x] ⚪ **Branding split.** `@buildbase/sdk` + `BuildBase()` vs `SaaSOSProvider`/`useSaaS*`/`saas-os-` CSS scope. Consider `BuildBaseProvider` alias + deprecation before the API calcifies.
- [x] ⚪ **Stale i18n comment.** `i18n/types.ts:612` says "3 levels" but `Level4` exists and depth-4 keys are real. (Locale files themselves verified healthy: 8×527 identical keys, compiler-enforced.)
- [x] ⚪ **Zero test infrastructure.** Done (2026-07-10): vitest, 113 tests — `permissions`, `url-params`, `security`, `sha256`, `api-base` retry/abort, `currency-utils`/`quota-utils`, `agent-auth`, `agent-stack`, `webhook-verification`, `agent-bridge` JWT vectors, and `packaging.test.ts` (asserts every d.ts value exists in the runtime bundle — auto-catches the 🔴 export bug class; requires a fresh `npm run build`). `@types/node` added; tests are typechecked via `tsconfig.json` (build excludes them via `tsconfig.build.json`).

---

## Recommended fix order

1. **Batch 1 — correctness, small diffs (~1 day):** react.ts value exports · abort-vs-timeout · `unwrapResponse` falsy · path encoding · `hasActiveSubscription != null` · "Free" ternary · `@hookform/resolvers` to deps · AGENTS.md webhook line · stale i18n comment.
2. **Batch 2 — money & security:** retry idempotency · redirect validation · JPY zero-decimal · permission revoke/unknown-role semantics · `createBBUrl` invalid-base throw.
3. **Batch 3 — async correctness (needs webapp re-verification):** race guards in gate hooks · settings fetch detached abort · workspace lifecycle into provider · 401 session clearing · UserProvider split.
4. **Batch 4 — structure & polish:** selector `useSyncExternalStore` rework · SettingsSubscription/SubscriptionDialog extractions · i18n hardcoded strings · a11y (trigger, tabs) · type exports/`any` cleanup · branding alias · test setup.
