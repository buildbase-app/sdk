# SDK Fresh-Eye Review — Findings Backlog (2026-07-08)

Full-codebase review (core/API, state/providers/hooks, UI screens, packaging/types/i18n/docs).
43 verified findings. Status: **Batch 1 done (2026-07-08)** — check items off as they land.
Recommended order: Batch 1 → 4 (see bottom).

Legend: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low

---

## Core / API layer

- [ ] 🔴 **Retries replay non-idempotent POSTs — double-charge risk.** `src/lib/api-base.ts:208-243` retries any method on network error/5xx, including `consumeCredits`, `recordUsage`, `purchaseCredits`, `createCheckoutSession` (`workspace-api.ts:736,523,768,385`). Restrict retries to idempotent methods or auto-attach the backend-supported `idempotencyKey`.
- [x] 🟠 **User aborts misreported as timeouts.** `src/lib/api-base.ts:222-229` converts any `AbortError` into a fake "Request timeout" error whenever a timeout is configured (default 30s ⇒ always). Defeats `isAbortError()` (`error-handler.ts:75`); unmount cancellations surface as real errors. Convert only when the timeout controller actually fired (see `fetchWithTimeout`, `api-utils.ts:381`).
- [ ] 🟠 **`validateRedirectUrl`/`safeRedirect` don't prevent open redirects.** `src/lib/security.ts:10-50`. Protocol-only check (`https://evil.com` passes); safe relative paths (`/dashboard`) throw in `new URL()` and silently fall back; `fallbackUrl` is never validated. Add same-origin/allowlist validation + relative-path support via `new URL(url, origin)`.
- [x] 🟡 **`unwrapResponse` uses `result.data || result`.** `src/lib/api-base.ts:325` — falsy payloads (`0`, `false`, `''`, `null`) return the whole envelope cast to `T`. Use `result.data !== undefined ? result.data : result`. (~25 call sites affected.)
- [x] 🟡 **Path params not URI-encoded.** `workspace-api.ts:137,175,263,374`, `user-api.ts:41` — IDs containing `/ ? # ../` retarget the request path; query params in the same file ARE encoded. Wrap path segments in `encodeURIComponent()`.
- [ ] 🟡 **Permission overrides can't revoke; unknown roles gain member perms.** `src/lib/permissions.ts:164-184` — `length > 0` checks mean `[]` (explicit revoke) falls through to defaults; unknown roles fall back to `member` (grant-by-default). Also doc at :121 claims `applySettingRestrictions` handles `canCreateWorkspace` but it only handles `canInviteMembers` (:210-226). Distinguish "present but empty" from "absent"; deny unknown roles.
- [ ] 🟡 **`formatCents` breaks zero-decimal currencies (JPY).** `src/api/billing/currency-utils.ts:95-97` — `formatCents(1000,'jpy')` → "¥10.00" instead of ¥1,000; `jpy` is in `PLAN_CURRENCY_CODES`. Same bug in `formatOverageRate`/`formatQuotaWithPrice`. Maintain a zero-decimal set or use `Intl.NumberFormat`.
- [ ] 🟡 **~20× copy-pasted response handling + 3 divergent conventions.** `workspace-api.ts:278-865` repeats fetch→throwResponseError→unwrapResponse; others use `fetchJson`; `selectFreePlan` (:410) / `AuthApi.requestAuth` (auth-api.ts:45) return raw `response.json()` unchecked. Add `BaseApi.fetchUnwrapped<T>()`; one envelope convention.
- [ ] 🟡 **WorkspaceApi methods can't be aborted.** All ~40 methods lack `AbortSignal` params (Auth/User/Settings APIs have them). Thread an optional `signal` through.
- [ ] ⚪ **`createBBUrl` swaps invalid base for `https://localhost`.** `src/lib/url-params.ts:122-130` — a typo'd base yields Stripe return URLs pointing at localhost with no error. Throw/return null instead. Related: retry backoff (`api-base.ts:215,241`) ignores the abort signal during sleep.

## State / providers / hooks

- [ ] 🔴 **Stale-response races in every gate-context fetch hook.** `subscription-hooks.ts:208-241` (`useSubscription`), `:1305-1338` (`useAllQuotaUsage`), `credit-hooks.ts` (`useCreditBalance`), `usePlanGroup`, `useInvoices`, `useUsageLogs`, `usePublicPlans` — `setState` after `await` with no abort/version guard. Workspace switch can render the previous workspace's subscription/quota/credits through `WhenSubscription` etc. Add abort signal or `versionRef` guard before each `setState`.
- [ ] 🔴 **`useSaaSSettings` shared promise bound to first caller's AbortSignal; StrictMode kills settings for the session.** `src/providers/os/hooks.ts:38-85` — module-global `_settingsFetchPromise` uses a component signal; on abort all waiters get `null`, error is swallowed, effect deps never re-fire. Use a detached AbortController for the deduped fetch, or re-arm while `settings === null && !_settingsFetchPromise`.
- [ ] 🟠 **`useSaaSWorkspaces` singleton logic lives per hook instance.** `workspace/hooks.ts:202-220, 228-230, 233-273, 385-417` — init effect, dedup refs, auto-switch fallback are per-instance while the hook mounts in many components: double fetches, and `onWorkspaceChange` / `workspace:changed` can fire multiple times per switch (implementors mint tokens there). Move lifecycle into a real provider (`WorkspaceProvider` at provider.tsx:45-47 is currently an empty passthrough); keep the hook as selector/actions.
- [ ] 🟠 **Selector API doesn't bail out of re-renders.** `contexts/shared/createContext.tsx:73-102`, `useAppSelector.ts:35-56` — `useContext` on the whole state context means every dispatch re-renders every consumer of `useSaaSAuth`/`usePermissions`/`useUIVisibility`/`useSaaSWorkspaces`; docs claiming selector bailout are false; `useSelectWithEquality` writes refs during render. Rework with `useSyncExternalStore` over a mutable store (or `use-context-selector`).
- [ ] 🟡 **401 leaves auth context authenticated.** `use-workspace-api.ts:20-22` — `onUnauthorized` never dispatches `removeSession()`; dead session keeps authenticated UI up. Also `session.expires` (auth/utils.ts:38-44) is stamped but never checked — dead field.
- [ ] 🟡 **`UserProvider` shares `error`/`loading` across attributes+features pipelines.** `user/provider.tsx:38-158` — cross-stomping flags, stale error never cleared, mutation refetches have no abort signal, `t` missing from deps. Split per-resource state.
- [ ] 🟡 **Hook return shapes drift from `{ data, loading, error, refetch }` convention.** `useUserAttributes`/`useUserFeatures` → `isLoading`/`refreshX`; `useSaaSSettings` → no loading/error at all (WorkspaceSwitcher flashes wrong UI on `?? true` defaults until settings arrive); `useSaaSWorkspaces` returns an unmemoized ~25-key object every render (`hooks.ts:618-646`).
- [ ] ⚪ **Un-cleared 300ms timer in `createWorkspace`.** `workspace/hooks.ts:308-310` — plan picker can open after navigate/sign-out. Clear on unmount or open after switch resolves.
- [ ] ⚪ **`settingsManager.clearParams()` doesn't notify subscribers; `getState()` allocates per call.** `settings-manager.ts:35-37, 79-84` — diverges manager/React state; blocks `useSyncExternalStore` migration. Notify on clear; return internal immutable state.

## UI components / screens

- [ ] 🟠 **Hardcoded English strings bypass i18n.** `SettingsSubscription.tsx:732` `(ends {date})`; `:830` `Version {n}`; `:465` `aria-label="Subscription tabs"`; `SettingsUsers.tsx:478` placeholder email; `provider.tsx:561` + `BetaForm.tsx:268,270` alt texts. Add keys to types.ts + all 8 locales.
- [ ] 🟠 **Keyboard-inaccessible settings trigger in personal mode.** `provider.tsx:146` — plain `div onClick` with no role/tabIndex/key handler; keyboard/AT users can't open settings when `showSwitcher` is false. Use `DialogTrigger asChild`.
- [ ] 🟠 **`SettingsSubscription.tsx` is 1,467 lines.** Extraction seams: `SubscriptionStatusBadge` (696-747), `TrialBanner` (645-686), one `SubscriptionNoticeBanner` primitive replacing 4 near-identical banners (905-1021), `PlanDetailsSection` (1023-1239), `CancelSubscriptionDialog`/`ResumeSubscriptionDialog` (1332-1462).
- [ ] 🟠 **Forbidden palette class.** `SettingsSubscription.tsx:1450` `focus:ring-red-600` → `focus:ring-destructive`. (Note: current lint:tokens grep doesn't catch `ring-*` — consider widening the regex.)
- [ ] 🟡 **Blank pane instead of `<NoPermission/>`.** `SettingsSubscription.tsx:415` `if (!canViewBilling) return null` (after the skeleton return → skeleton flash then nothing). Siblings do it right.
- [ ] 🟡 **ARIA tabs without tab semantics.** `SettingsSubscription.tsx:465-493` — `role="tablist"/"tab"` but no `aria-controls`/ids/tabpanel/arrow-keys. Complete the pattern or drop the roles.
- [x] 🟡 **`hasActiveSubscription` wrong while loading.** `SettingsSubscription.tsx:1291` — `subscription?.subscription !== null` is `true` when `undefined`. Use `!= null`.
- [x] 🟡 **Paid plan with missing interval price renders "Free".** `SubscriptionDialog.tsx:609-613, 889-893` — dead ternary branch; `formatPrice(null)` → `'' || t('pricing.free')`. Show `'—'` for `price === null`.
- [ ] 🟡 **Mobile/desktop plan rendering duplicated.** `SubscriptionDialog.tsx:543-800` vs `827-1350` (+ third credits copy in `SettingsSubscription.tsx:1196-1235`); `displayCurrency` recomputed inline 6×. Extract `PlanTrialBadge`, `PlanPriceBlock`, `CreditGrantSummary`, `getDisplayCurrency()`.
- [ ] 🟡 **Transient-message timer boilerplate ×4.** `SettingsSubscription.tsx:350-357, 376-383, 401-408`, `SettingsUsers.tsx:451-458`. Extract `useTransientStatus()`.
- [ ] 🟡 **Dead/contradictory logic.** Unused `hasNewerVersion` (`SettingsSubscription.tsx:187-200`); double error banners (`:430-440` + `:1260-1270`); unused required `WorkspaceItemProps.onClose` (`provider.tsx:286`); `sortedPlans` no-op copy + unmemoized `getAllSubscriptionItems` (`SubscriptionDialog.tsx:197-201`).
- [ ] ⚪ **Local formatters duplicate shared utils.** `SettingsInvoices.tsx:16-24` re-implements `fmtCents` (hardcodes `en-US` default); `SettingsSubscription.tsx:70-83` + ConnectedAgents re-implement `format-utils.formatDate`.

## Packaging / types / i18n / docs

- [x] 🔴 **`/react` d.ts declares ~60 runtime values that don't exist.** `src/react.ts:19` `export type * from './core'` → `rollup-plugin-dts` flattens to value exports in `dist/react/index.d.ts`; runtime bundle has none (verified: `Permission`, `formatCents` missing). README (incl. the UI-config `useUIVisibility`+`Permission` example) and JSDoc teach the broken import. Fix: `export * from './core'` (values) — matches docs/intent.
- [x] 🟡 **`@hookform/resolvers` is a runtime import but devDependency-only.** Imported in 4 shipped files; silently bundled (contradicts 0.0.50 externalization claim), version-skew risk vs external `zod`/`react-hook-form`. Move to `dependencies`.
- [ ] 🟡 **Public-signature types not exported.** `IWorkspace`, `ISettings`, `IUser`, `WorkspaceContextValue`, `TranslationKey` appear in exported signatures but aren't name-exported from `/react`. Add to exports.
- [ ] 🟡 **`any`-index signatures defeat typing.** `ISettings` (`providers/types.ts:29`) and `NotificationData` (`workspace-api.ts:92`) — use `unknown` index or dedicated `extensions`/`mergeTags` fields. Also `WebMcpTool.execute(input: any)` (`agent-discovery.ts:625`).
- [x] 🟡 **AGENTS.md still says webhook verification is "Node only".** `AGENTS.md:72` — contradicts 0.0.50 runtime-agnostic fix (README was updated, AGENTS.md missed).
- [ ] 🟡 **Unbounded `lucide-react >=0.544.0`.** package.json:100 — 0.x releases rename/remove icons; now externalized so consumers get newest. Bound it (`>=0.544.0 <1`).
- [ ] ⚪ **Branding split.** `@buildbase/sdk` + `BuildBase()` vs `SaaSOSProvider`/`useSaaS*`/`saas-os-` CSS scope. Consider `BuildBaseProvider` alias + deprecation before the API calcifies.
- [x] ⚪ **Stale i18n comment.** `i18n/types.ts:612` says "3 levels" but `Level4` exists and depth-4 keys are real. (Locale files themselves verified healthy: 8×527 identical keys, compiler-enforced.)
- [ ] ⚪ **Zero test infrastructure.** Highest-value minimal setup: vitest over `lib/permissions`, `lib/url-params`, `lib/security`, `lib/sha256` + webhook verification, `api/billing/*` pricing math, agent-bridge JWT — plus one packaging test asserting runtime exports match the d.ts (would have caught the 🔴 export bug automatically).

---

## Recommended fix order

1. **Batch 1 — correctness, small diffs (~1 day):** react.ts value exports · abort-vs-timeout · `unwrapResponse` falsy · path encoding · `hasActiveSubscription != null` · "Free" ternary · `@hookform/resolvers` to deps · AGENTS.md webhook line · stale i18n comment.
2. **Batch 2 — money & security:** retry idempotency · redirect validation · JPY zero-decimal · permission revoke/unknown-role semantics · `createBBUrl` invalid-base throw.
3. **Batch 3 — async correctness (needs webapp re-verification):** race guards in gate hooks · settings fetch detached abort · workspace lifecycle into provider · 401 session clearing · UserProvider split.
4. **Batch 4 — structure & polish:** selector `useSyncExternalStore` rework · SettingsSubscription/SubscriptionDialog extractions · i18n hardcoded strings · a11y (trigger, tabs) · type exports/`any` cleanup · branding alias · test setup.
