# SDK UI Conventions

Rules for keeping every component, screen, and page visually and structurally consistent. When adding a new screen, copy the patterns below — don't hand-roll markup that a shared primitive already covers.

## Shared primitives (`src/components/ui/`)

Always use these instead of ad-hoc markup:

| Primitive                                        | Use for                                                        | Never hand-write                        |
| ------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------- |
| `SectionHeader`                                  | Screen/section title + muted description                       | `<h3 className="text-sm font-medium">…` |
| `EmptyState`                                     | "Nothing here yet" placeholders                                | dashed-border divs with centered icon   |
| `SidebarNavSection` / `SidebarNavItem`           | Sidebar menus                                                  | custom nav buttons                      |
| `StatusBanner`                                   | Error/success/warning/info feedback, with Retry/Dismiss action | `bg-red-50 border-red-200…` divs        |
| `LoadingState`                                   | Inline "Loading…" bar during refreshes                         | gray boxes with `Loader2`               |
| `Skeleton` (+ `SettingSkeleton` in workspace/ui) | Loading placeholders                                           | pulse divs                              |
| `NoPermission` (workspace/ui)                    | Permission-gated screens                                       | amber warning cards                     |
| `Button`, `Dialog`, `Form`, `Input`, …           | Everything interactive                                         | raw `<button>`/`<input>`                |

## Component tiers

- **Public components** (`src/components/<feature>/`): named exports, `index.ts` barrel, PascalCase files inside kebab-case folders. Labels default to `useTranslation()` keys but are overrideable via props (`title?: string | null` — `null` hides, `undefined` uses the translated default). Example: `ConnectedAgents`.
- **Settings screens** (`src/providers/<name>/ui/`): default export of `WorkspaceSettingsX: React.FC` from a `SettingsX.tsx` file. The dialog renders the screen title — screens must not render their own top-level title.
- **When a settings screen reuses a public component**, wrap it in a thin `SettingsX.tsx` default-export screen (see `SettingsConnectedAgents.tsx`) so `SettingsDialog` always imports screens the same way — never import from `components/*` directly in the dialog.

## Screen skeleton (canonical shape)

```tsx
const WorkspaceSettingsX: React.FC<Props> = ({ workspace }) => {
  const { t, formattingLocale } = useTranslation();
  // useState + useCallback + useEffect for data (no react-query/SWR)

  if (loading) return <SettingSkeleton />;
  if (!hasPermission) return <NoPermission descriptionKey="x.adminOnly" />;

  return (
    <div className="space-y-4">
      <SectionHeader title={t('x.title')} description={t('x.description')} />
      {items.length === 0 ? (
        <EmptyState
          icon={<Icon className="h-5 w-5 text-muted-foreground" />}
          description={t('x.empty')}
        />
      ) : (
        <div className="space-y-2">{/* rows: rounded-md border p-3 */}</div>
      )}
    </div>
  );
};
export default WorkspaceSettingsX;
```

## Hard rules

- **i18n**: no hard-coded user-facing strings. Add keys to `src/i18n/types.ts` **and all 8 locale files** in `src/i18n/messages/`. Format dates with `Intl.DateTimeFormat(formattingLocale, …)`, numbers with `fmtNum`, money with `fmtCents`.
- **Hooks** expose `{ data, loading, error, refetch }`; report errors through `handleError` / `handleErrorUnlessAborted` with `{ component, action }`.
- **Providers** live in `src/providers/<kebab-name>/` with `api.ts`, `hooks.ts`, `types.ts` (and `provider.tsx` only when context is needed).
- **Styling**: semantic theme tokens ONLY — `foreground`, `muted`, `border`, `primary`, `destructive`, `success`, `warning`, `info` (see `docs/THEMING.md`). Tailwind palette classes (`gray-*`, `blue-*`, `red-*`, `green-*`, `amber-*`, `slate-*`, `bg-white`, `text-white`) and hex colors are forbidden — they break implementer theming. Soft status fills are alpha tints: `bg-success/10`, `border-success/20`, `text-success`.
- **Exports**: new public components/primitives must be re-exported from `src/react.ts`.
