# UI Configuration (`ui` prop)

Control which parts of the SDK UI are shown and override individual UI strings — without forking components or abusing the permission system.

Everything is driven by a single optional `ui` prop on `SaaSOSProvider`:

```tsx
<SaaSOSProvider serverUrl="..." version="v1" orgId="..." ui={{ ... }}>
```

## Principles

1. **Everything defaults to visible.** The `ui` prop is never required; an empty or missing config means current behavior. Only an explicit `false` hides something.
2. **Config can only hide, never force-show.** A visible flag never bypasses platform permissions — a user without `WORKSPACE_BILLING_VIEW` won't see the Subscription section no matter what the config says. Permissions remain the security floor.
3. **One decision, one call.** Internally every gated surface resolves through `useUIVisibility()`, which combines the config flag and the permission check in a single call. Your own components can use the same hook.

## How visibility is decided

A piece of SDK UI is shown when **all** of these pass:

| Layer               | Source                                | Example                                      |
| ------------------- | ------------------------------------- | -------------------------------------------- |
| Implementor config  | `ui` prop (this doc)                  | `settings.sections.credits !== false`        |
| Platform permission | user's role, resolved per workspace   | `can(Permission.WORKSPACE_BILLING_VIEW)`     |
| Workspace mode      | server settings (`personal/platform`) | personal mode hides Users/Permissions/Danger |
| Server settings     | org settings from the backend         | `settings.workspace.showSwitcher`            |

## Settings dialog sections

`ui.settings.sections` hides whole sections of the workspace settings dialog. Keys match the `SettingsScreen` values:

`profile` · `security` · `connected-agents` · `general` · `users` · `subscription` · `usage` · `credits` · `features` · `notifications` · `permissions` · `danger`

```tsx
ui={{
  settings: {
    sections: { credits: false, notifications: false, 'connected-agents': false },
  },
}}
```

Hiding a section removes it from the sidebar (a fully-empty group collapses, including its header), and makes the screen unreachable via deep links, `defaultSection`, or the settings-manager — the dialog falls back to the first enabled section. If every section is hidden, the dialog renders nothing.

## Per-screen toggles

Fine-grained switches inside each settings screen. All default to `true`.

| Config key                            | Hides                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `settings.profile.language`           | Language dropdown                                                        |
| `settings.profile.country`            | Country dropdown                                                         |
| `settings.profile.currency`           | Currency dropdown                                                        |
| `settings.profile.timezone`           | Timezone dropdown                                                        |
| `settings.security.passkeyRename`     | Rename action on passkey rows                                            |
| `settings.security.passkeyDelete`     | Delete action on passkey rows                                            |
| `settings.general.nameEdit`           | Workspace name field                                                     |
| `settings.general.iconEditor`         | Emoji/image icon editor                                                  |
| `settings.users.invite`               | Invite-member form                                                       |
| `settings.users.roleChange`           | Per-member role selector                                                 |
| `settings.users.remove`               | Remove-member button                                                     |
| `settings.users.seatPricing`          | Seat usage card + extra-seat cost warnings                               |
| `settings.subscription.changePlan`    | Every plan-picker entry point (change plan, view plans, upgrade banners) |
| `settings.subscription.cancel`        | Cancel-subscription button (Resume stays available)                      |
| `settings.subscription.managePayment` | Stripe billing-portal button                                             |
| `settings.subscription.invoicesTab`   | Invoices tab (tab bar collapses; past-due "view invoices" links too)     |
| `settings.subscription.planDetails`   | Features/limits/quotas breakdown on the plan card                        |
| `settings.credits.buyButton`          | Buy-credits button + packages dialog                                     |
| `settings.credits.transactions`       | Recent-transactions list                                                 |
| `settings.notifications.push`         | Browser push-notification block                                          |
| `settings.notifications.emailToggles` | Per-event email preference column                                        |
| `settings.notifications.pushToggles`  | Per-event push preference column                                         |

```tsx
ui={{
  settings: {
    subscription: { cancel: false, invoicesTab: false },
    users: { invite: false, seatPricing: false },
  },
}}
```

## Workspace switcher

Client-side switcher control, ANDed with the server settings (`showSwitcher`, `canCreateWorkspace`):

| Config key                       | Hides                                        |
| -------------------------------- | -------------------------------------------- |
| `workspaceSwitcher.show`         | The switcher dialog (trigger opens settings) |
| `workspaceSwitcher.createButton` | "Create workspace" button                    |
| `workspaceSwitcher.planBadge`    | Subscription-plan badge on workspace rows    |
| `workspaceSwitcher.memberCount`  | Member count on workspace rows               |

## Behavior

| Config key                    | Effect                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `behavior.autoOpenPlanDialog` | `false` disables the automatic plan-picker popup when a workspace has no subscription. Explicit `selectPlan` deep links (e.g. from `PricingPage`) still open it. |
| `behavior.trialEndingDays`    | Global default threshold for `<WhenTrialEnding>` (default 3). A `daysThreshold` prop still wins per usage.                                                       |

## String overrides (`messages`)

Override any SDK UI string per key — deep-merged over the active locale bundle. Ideal for rebranding terms without forking the 8 locale files:

```tsx
ui={{
  messages: {
    settings: { sidebar: { credits: 'Tokens', subscription: 'Billing' } },
    credits: { buyCredits: 'Buy Tokens' },
  },
}}
```

- Keys/shape mirror `SDKMessages` (see `src/i18n/types.ts`); the type is `PartialSDKMessages`.
- Overrides apply on top of whichever locale is active.
- Missing keys in a locale (or in your overrides) fall back to English before falling back to the raw key.

## Error boundary

The top-level error boundary renders even when the i18n layer has crashed, so its strings are plain values, not translation keys:

```tsx
ui={{ errorBoundary: { title: 'Oops, something broke', retryLabel: 'Retry' } }}
```

## Date formats

`ui.formats.date` takes `Intl.DateTimeFormatOptions` and applies to dates the SDK renders (passkey activity, connected-agent grants). Default: `{ dateStyle: 'medium' }`.

```tsx
ui={{ formats: { date: { dateStyle: 'short' } } }}
```

## Per-dialog override

`WorkspaceSettingsDialog` accepts its own `ui` prop, deep-merged over the provider-global config — so one app can render differently-configured dialogs:

```tsx
// Global config hides credits everywhere…
<SaaSOSProvider ui={{ settings: { sections: { credits: false } } }}>

// …but this admin-only dialog shows everything except Danger
<WorkspaceSettingsDialog
  workspace={ws}
  ui={{ settings: { sections: { credits: true, danger: false } } }}
/>
```

## Using the same gating in your own UI

```tsx
import { useUIVisibility, useUIConfig, Permission } from '@buildbase/sdk/react';

function MembersPanel() {
  const { visible } = useUIVisibility();

  // Config flag AND permission — one line decides show/hide
  if (!visible(ui => ui.settings?.users?.invite, Permission.WORKSPACE_MEMBERS_INVITE)) {
    return null;
  }
  return <InviteForm />;
}
```

- `visible(select, permission?)` — `true` unless the selected flag is explicitly `false`, and (when given) the permission check passes. Works with app permissions too: `visible(ui => ui.settings?.sections?.usage, 'reports:view')`.
- `useUIConfig()` — the raw `ui` object when you only need config values (e.g. `formats`, `behavior`).
- `mergeUIConfig(base, override)` — the deep-merge used for per-dialog overrides, exported for custom composition.

## Recipes

**Single-tenant app (no workspaces UX):**

```tsx
ui={{
  workspaceSwitcher: { show: false, createButton: false },
  settings: { sections: { users: false, permissions: false, danger: false } },
}}
```

**Billing handled outside the SDK:**

```tsx
ui={{
  settings: { sections: { subscription: false, credits: false, usage: false } },
  behavior: { autoOpenPlanDialog: false },
}}
```

**White-label rename:**

```tsx
ui={{
  messages: { settings: { sidebar: { credits: 'Tokens' }, titles: { credits: 'Tokens' } } },
  errorBoundary: { title: 'Something went wrong at Acme' },
}}
```

**Read-only member view (UI-level; permissions still enforce server-side):**

```tsx
ui={{
  settings: {
    users: { invite: false, roleChange: false, remove: false },
    general: { nameEdit: false, iconEditor: false },
    security: { passkeyRename: false, passkeyDelete: false },
  },
}}
```
