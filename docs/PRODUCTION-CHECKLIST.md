# Production-Readiness Checklist

The gate for every new component, screen, module, hook, or API method — and for reviewing existing ones. Work through the sections that match what you're adding; every unchecked box is either a fix or a written justification. `CONVENTIONS.md` explains the _patterns_; this file is the _audit list_. Each rule earned its place — most trace back to a shipped bug or a review finding (see `REVIEW-FINDINGS.md`).

**Automated checks** (run all before considering anything done):

```bash
npm run lint          # tsc --noEmit + hard-coded color scan (lint:tokens)
npx vitest run        # full suite, including packaging + currency sweeps
npm run build         # rollup all 4 entries + d.ts bundling
```

---

## 1. Every change (universal gate)

- [ ] `npm run lint`, `npx vitest run`, and `npm run build` all pass.
- [ ] Reference webapp still typechecks: `npm run build && npx yalc push`, then `npx tsc --noEmit` in `webapp-codebase-next`.
- [ ] CHANGELOG.md entry under the unreleased block — flag any behavior/type-level change with ⚠️.
- [ ] Backward compatible? New params are trailing + optional; new exports don't rename old ones (alias instead — see `BuildBaseProvider`); type tightening (`any` → `unknown`) is called out in the CHANGELOG.
- [ ] No dead code left behind: unused props, params, helpers, imports removed (not commented out).

## 2. New UI component or settings screen

- [ ] Built from shared primitives (`src/components/ui/` — 22 of them: `SectionHeader`, `EmptyState`, `StatusBanner`, `LoadingState`, `Skeleton`, `Button`, `Dialog`, …). No hand-rolled markup a primitive covers (table in `CONVENTIONS.md`).
- [ ] Correct tier: public component in `src/components/<feature>/` (named export, barrel `index.ts`) vs settings screen in `src/providers/<name>/ui/SettingsX.tsx` (default export; no top-level title — the dialog renders it).
- [ ] Visibility gated through `useUIVisibility()` (config + permission in one call) — never inline `can() && config.show` checks.
- [ ] Permission check renders `<NoPermission/>` and runs **before** the loading skeleton (no flash-then-blank).
- [ ] Loading: `<SettingSkeleton/>` initial, `LoadingState` for refreshes; error: `StatusBanner` with retry.
- [ ] Responsive at 360 / 768 / 1280 / 1920 (rules in `CONVENTIONS.md`): mobile-first classes, dialogs full-screen on mobile, tables in `overflow-x-auto`, text containers `min-w-0` + `truncate`.
- [ ] Heavy dialogs/screens are `lazy()`-loaded (pattern: `SubscriptionDialog`, `SettingsDialog`) so they land in their own chunk.
- [ ] Transient success/error messages use `useTransientStatus()` — no raw `setTimeout` (leaks on unmount).
- [ ] Labels overridable via props: `label?: string | null` — `null` hides, `undefined` uses the translation default.

## 3. New provider / module

- [ ] Lives in `src/providers/<kebab-name>/` with `api.ts`, `hooks.ts`, `types.ts` (+ `provider.tsx` only if context is genuinely needed).
- [ ] Module-level fetches that feed a global store are **detached** from any single caller's abort signal (the `useSaaSSettings` StrictMode bug).
- [ ] Objects returned from context/hooks are memoized (`useMemo`) — a fresh object every render defeats every consumer's memo/effect deps.
- [ ] Any singleton/manager exposes `subscribe` + stable `getState()` snapshots (`useSyncExternalStore`-compatible), and mutations notify subscribers.

## 4. New API method (any `*Api` class)

- [ ] Extends `BaseApi`; uses `fetchJson` / `fetchUnwrapped` / `fetchResponse` — never raw `fetch`.
- [ ] Trailing `signal?: AbortSignal` parameter, threaded into the request (all 49 WorkspaceApi methods follow this).
- [ ] Non-idempotent (POST/PATCH) endpoints: remember they are **never retried** — if the operation needs retry safety, it needs a dedupe key server-side.
- [ ] Response types have no `any`: index signatures are `unknown`, payload shapes are interfaces in `api/types.ts`.
- [ ] Error path throws through `handleApiResponse`/`throwResponseError` so consumers get coded errors (`docs/ERROR_CODES.md`).

## 5. New data hook

- [ ] Returns `{ data, loading, error, refetch }` — the convention landed 2026-07-14 (`useUserAttributes`/`useUserFeatures`/`useSaaSSettings`); old `isLoading`/`refreshX` names exist only as `@deprecated` aliases, never in new hooks.
- [ ] Stale-response safe: uses `useLatestRequest()` (`src/lib/use-latest-request.ts`) so a workspace switch can't render the previous workspace's data; only the latest request clears `loading`; unmount aborts.
- [ ] Errors reported via `handleError` / `handleErrorUnlessAborted` with `{ component, action }`.
- [ ] Timers/deferred actions tracked in refs and cleared on unmount (the `createWorkspace` 300ms plan-picker bug).

## 6. Money, dates, numbers

- [ ] **Never** write `amount / 100`, `.toFixed(2)`, or paste a currency symbol onto a number. All money display goes through `currency-utils`: `formatMinorAmountIntl` (locale-aware), `formatCents` (symbol table), or `useTranslation().fmtCents` in components.
- [ ] Minor-unit divisor comes from `getCurrencyDecimals()` — currencies are 0-decimal (JPY, KRW…), 3-decimal (KWD, BHD…), or CLDR-resolved; assuming ÷100 shipped the ¥10.00-instead-of-¥1,000 bug.
- [ ] Amounts in APIs/types are documented as **minor units** (`1299` = $12.99). A decimal in the DB is a data bug, not a formatter bug.
- [ ] Dates: `Intl.DateTimeFormat(formattingLocale, …)` via `format-utils.formatDate` — no locale-less `toLocaleDateString`, no per-component date formatters.
- [ ] Numbers: `fmtNum` (locale digits — Hindi/Arabic numerals matter).
- [ ] New formatting logic gets round-trip tests in the sweep suite (`currency-utils.sweep.test.ts` pattern: parse the output back, compare to input).

## 7. Multi-language (i18n)

- [ ] Zero hard-coded user-facing strings — every label through `t('key')`.
- [ ] New keys added to `src/i18n/types.ts` **and all 8 locale files** (`en es fr de ja zh hi ar` in `src/i18n/messages/`). English fallback is automatic but a missing translation is a bug, not a fallback.
- [ ] Interpolation via ICU messages (`t('key', { count })`) — never string concatenation (word order differs across languages).
- [ ] RTL-safe: `ar` sets `dir="rtl"` — use logical properties/classes (`me-`/`ms-`/`start`/`end`), never `ml-`/`mr-` for directional spacing; icons that imply direction flip.
- [ ] Non-English message files stay lazy-loaded (they're separate chunks — don't import them statically).

## 8. Styling / CSS

- [ ] Semantic theme tokens ONLY: `foreground`, `muted`, `border`, `primary`, `destructive`, `success`, `warning`, `info` (`docs/THEMING.md`). Palette classes (`gray-*`, `red-*`, `bg-white`…) and hex values are forbidden — `npm run lint:tokens` enforces this.
- [ ] Soft status fills are alpha tints (`bg-success/10`, `border-success/20`) — not lighter palette shades.
- [ ] No inline `style={{}}` for anything a Tailwind token covers.
- [ ] New global CSS goes through the single stylesheet pipeline (ships as `dist/css/styles.css`); component styles are utility classes, not CSS files.

## 9. Accessibility

- [ ] Everything clickable is a `Button` or has `role` + `tabIndex` + key handlers — no bare `div onClick` (the personal-mode settings-trigger bug; use `DialogTrigger asChild`).
- [ ] Focus states visible (`focus-visible:ring` comes free with the primitives — another reason not to hand-roll).
- [ ] Icons-only buttons have `aria-label`; decorative icons are hidden from AT.
- [ ] Dialogs trap focus and close on Escape (free via the `Dialog` primitive).
- [ ] Interactive flows work keyboard-only — tab through the new screen once before shipping.

## 10. Exports & packaging

- [ ] New public API exported from the right entry: framework-free utilities → `src/core.ts`; components/hooks/providers → `src/react.ts`; data layer → `src/data.ts`; MCP → `src/mcp.ts`. "Documented as exported" ≠ exported — `formatMinorAmountIntl` shipped missing from `/core`; the packaging test now catches d.ts/runtime drift.
- [ ] `src/core.ts` and `/data` stay React-free (no JSX, no react imports — they're consumed server-side).
- [ ] No new runtime dependency without discussion — deps are externalized, so every one becomes the consumer's install burden. Prefer `Intl`/platform APIs (see the no-money-library decision).
- [ ] Nothing test-only or dev-only reachable from an entry point (test files never imported by `src/core|react|data|mcp`).
- [ ] After build: `npm pack --dry-run` shows no new unexpected files; heavy UI landed in a chunk, not the entry bundle.
- [ ] No real product domains or internal codenames anywhere that ships — JSDoc examples land in the published `.d.ts` (editor hover docs), and README/docs go to npm. Use RFC 2606 examples only (`example.com`, "Acme"). Sweep: `grep -ri "imejis\|ord/server" src docs README.md AGENTS.md dist`.

## 11. Tests

- [ ] Pure logic (formatters, validators, utils) gets unit tests next to the file (`x.test.ts`).
- [ ] Bug fixes get a regression test that fails on the old code.
- [ ] Formatting/parsing logic uses the round-trip oracle pattern, not expected-string tables that mirror the implementation.
- [ ] Security-relevant code (redirects, tokens, JWT, webhooks) always has tests for the hostile inputs (`security.test.ts`, `webhook-verification.test.ts` patterns).

## 12. Security

- [ ] Redirect targets validated through `validateRedirectUrl`/`safeRedirect` — never `window.location = userValue`.
- [ ] MCP tool inputs are `.strict()` zod schemas with field allowlists — no open `z.record` passed to the backend (mass-assignment finding).
- [ ] Anything from an agent or URL param is untrusted: validate before use, including `WebMcpTool.execute` inputs.
- [ ] No secrets/tokens in logs, error messages, or thrown Error strings.

---

## When reviewing an existing module

Run sections 2–12 against it as an audit. Log findings in `REVIEW-FINDINGS.md` with 🔴/🟠/🟡/⚪ severity, fix in batches (correctness first, structure second), and mark items done with the commit that shipped them.
