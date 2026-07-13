# @buildbase/sdk

A React SDK for [BuildBase](https://www.buildbase.app/) that provides essential components to build SaaS applications faster. Skip the plumbing and focus on your core product with built-in authentication, workspace management, billing, and more.

Also works server-side (Next.js API routes, Express, Hono) — see [Server-Side Usage](#server-side-usage) below.

## 📑 Table of Contents

- [Features](#-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [UI Configuration](#️-ui-configuration)
- [Authentication](#-authentication)
- [Redirect Preservation](#redirect-preservation)
- [Affiliate / Referral Tracking](#affiliate--referral-tracking)
- [Role-Based Access Control](#-role-based-access-control)
- [Feature Flags](#️-feature-flags)
- [Subscription Gates](#-subscription-gates)
- [Trial Gates](#-trial-gates)
- [Push Notifications](#-push-notifications)
- [Notifications](#-notifications)
- [User Management](#-user-management)
- [Workspace Management](#-complete-workspace-management)
- [Public Pricing (No Login)](#-public-pricing-no-login)
- [Multi-Currency & Pricing Utilities](#-multi-currency--pricing-utilities)
- [Quota Usage Tracking](#-quota-usage-tracking)
- [Quota Gates](#-quota-gates)
- [Credit System](#-credit-system)
- [Credit Gates](#-credit-gates)
- [Beta Form Component](#-beta-form-component)
- [Event System](#-event-system)
- [Error Handling](#️-error-handling)
- [Settings](#️-settings)
- [Configuration Reference](#️-configuration-reference)
- [Common Patterns](#-common-patterns)
- [Troubleshooting](#-troubleshooting)
- [API Reference](#-api-reference)
- [Best Practices](#-best-practices)
- [Server-Side Usage](#server-side-usage)
- [Webhook Verification](#webhook-verification)
- [Agent Readiness (Discovery)](#agent-readiness-discovery)
- [MCP Server](#mcp-server-buildbasesdkmcp)
- [OAuth2 App Bridge](#oauth2-app-bridge)

## 🚀 Features

- **🔐 Authentication System** - Complete auth flow with sign-in/sign-out and redirect preservation
- **🏢 Workspace Management** - Multi-workspace support with switching capabilities
- **👥 Role-Based Access Control** - User roles and workspace-specific permissions
- **🎯 Feature Flags** - Workspace-level and user-level feature toggles
- **📋 Subscription Gates** - Show or hide UI based on current workspace subscription (plan)
- **⏳ Trial Gates** - `WhenTrialing`, `WhenNotTrialing`, `WhenTrialEnding` components + `useTrialStatus` hook
- **🔔 Push Notifications** - Browser push notifications with `usePushNotifications` hook, auto-triggers for billing events, and campaign management
- **📬 Notifications** - Email + push notification system with per-event channel control, workspace preferences, and server-side `notification.send()` API
- **💺 Seat-Based Pricing** - Per-seat billing with included seats, billable seat tracking, and seat limit enforcement
- **💱 Multi-Currency** - Per-currency pricing variants with workspace billing currency lock
- **🤝 Affiliate Tracking** - Pass referral data to Stripe checkout via `getCheckoutStripeParams` prop (Rewardful, Endorsely, FirstPromoter, etc.)
- **📊 Quota Usage Tracking** - Record and monitor metered usage (API calls, storage, etc.) with real-time status
- **📈 Usage Dashboard** - Built-in workspace settings page showing quota consumption, overage billing breakdowns, and billing period info
- **👤 User Management** - User attributes and feature flags management
- **📝 Beta Form** - Pre-built signup/waitlist form component
- **📡 Event System** - Subscribe to user and workspace events
- **🛡️ Error Handling** - Centralized error handling with error boundaries
- **💳 Credit System** - Prepaid credit balances with consume, credit gate components, and built-in workspace settings for purchasing and transaction history
- **🖥️ Server-Side SDK** - `BuildBase()` factory for API routes, background jobs, Express, Hono — zero React dependency
- **🌐 Internationalization (i18n)** - 8 locales (en, es, fr, de, ja, zh, hi, ar), ICU MessageFormat, RTL support, native numerals
- **🏠 Workspace Modes** - Personal (solo B2C) or Platform (multi-user B2B), configured from admin dashboard

## Installation

```bash
npm install @buildbase/sdk react@^19.0.0 react-dom@^19.0.0
```

## Quick Start

### 1. Import CSS

```tsx
// app/layout.tsx (or your root layout)
import '@buildbase/sdk/css';
```

### 2. Create Provider

```tsx
// components/provider.tsx
'use client';

// BuildBaseProvider is an identical brand-aligned alias — prefer it in new code
import { SaaSOSProvider } from '@buildbase/sdk/react';
import { ApiVersion } from '@buildbase/sdk';

export default function SaaSProvider({ children }: { children: React.ReactNode }) {
  return (
    <SaaSOSProvider
      serverUrl="https://api.buildbase.app"
      version={ApiVersion.V1}
      orgId="your-org-id"
      auth={{
        clientId: 'your-client-id',
        redirectUrl: 'http://localhost:3000',
        callbacks: {
          // Called on page refresh to restore session from httpOnly cookie
          getSession: async () => {
            const res = await fetch('/api/auth/session');
            const data = await res.json();
            return data.sessionId ?? null;
          },

          // Called after OAuth redirect to exchange code for sessionId
          handleAuthentication: async code => {
            const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            const data = await res.json();
            return { sessionId: data.sessionId };
          },

          // Called on sign out to clear the httpOnly cookie
          onSignOut: async () => {
            await fetch('/api/auth/signout', { method: 'POST' });
            window.location.reload();
          },

          handleEvent: (eventType, data) => {
            console.log('SDK Event:', eventType, data);
          },
          onWorkspaceChange: async ({ workspace, user, role }) => {
            console.log('Switching to:', workspace.name, 'as', role);
          },
        },
      }}
    >
      {children}
    </SaaSOSProvider>
  );
}
```

The SDK uses the same session pattern as next-auth: the session token lives in an httpOnly cookie (set by your server), and the SDK calls `getSession()` on page refresh to restore it. You need three server endpoints:

- **`/api/auth/verify`** — exchanges OAuth code for sessionId, sets httpOnly cookie
- **`/api/auth/session`** — reads httpOnly cookie, returns `{ sessionId }` (called on page refresh)
- **`/api/auth/signout`** — clears the httpOnly cookie

### 3. Wrap Your App

```tsx
// app/layout.tsx
import SaaSProvider from '@/components/provider';
import '@buildbase/sdk/css';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SaaSProvider>{children}</SaaSProvider>
      </body>
    </html>
  );
}
```

### 4. Workspace Switcher

The WorkspaceSwitcher component uses a render prop pattern, giving you full control over the UI. Configure `onWorkspaceChange` in `auth.callbacks` (SaaSOSProvider) to handle workspace switches—used when clicking "Switch to" and when restoring from storage on page refresh. The callback receives `{ workspace, user, role }` so you don't need to look up the user's role:

```tsx
import React from 'react';
import { WorkspaceSwitcher } from '@buildbase/sdk/react';

function WorkspaceExample() {
  return (
    <WorkspaceSwitcher
      trigger={(isLoading, currentWorkspace) => {
        if (isLoading) {
          return <div>Loading...</div>;
        }

        if (!currentWorkspace) {
          return (
            <div className="flex items-center gap-2 min-w-40 border rounded-md p-2 hover:bg-muted cursor-pointer">
              <div className="bg-gray-200 flex aspect-square size-8 items-center justify-center rounded-lg"></div>
              <div className="grid flex-1 text-left text-sm leading-tight">Choose a workspace</div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 min-w-40 border rounded-md p-2 hover:bg-muted cursor-pointer">
            <div className="flex items-center justify-center h-full w-full bg-muted rounded-lg max-h-8 max-w-8">
              {currentWorkspace?.image && (
                <img src={currentWorkspace?.image} alt={currentWorkspace?.name} />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{currentWorkspace?.name}</span>
            </div>
          </div>
        );
      }}
    />
  );
}
```

## 🎛️ UI Configuration

The optional `ui` prop on `SaaSOSProvider` controls which parts of the SDK UI are shown and lets you override individual UI strings. Everything defaults to visible/current behavior — the config can only **hide** UI and never bypasses platform permissions, which remain the security floor.

```tsx
<SaaSOSProvider
  serverUrl="..."
  version="v1"
  orgId="..."
  ui={{
    settings: {
      // Hide whole sections of the workspace settings dialog.
      // Hidden sections are also unreachable via deep links / defaultSection.
      sections: { credits: false, notifications: false, 'connected-agents': false },

      // Per-screen feature toggles
      profile: { currency: false, timezone: false },
      security: { passkeyDelete: false },
      general: { iconEditor: false },
      users: { invite: false, seatPricing: false },
      subscription: { cancel: false, invoicesTab: false, planDetails: false },
      credits: { buyButton: false, transactions: false },
      notifications: { push: false, emailToggles: false, pushToggles: false },
    },

    // Workspace switcher (client-side; ANDed with server settings)
    workspaceSwitcher: { createButton: false, planBadge: false, memberCount: false },

    // Behaviors that are otherwise automatic
    behavior: {
      autoOpenPlanDialog: false, // don't auto-open the plan picker when no subscription
      trialEndingDays: 7, // global default for <WhenTrialEnding>
    },

    // Per-key string overrides, deep-merged over the active locale bundle
    messages: {
      settings: { sidebar: { credits: 'Tokens', subscription: 'Billing' } },
    },

    // Default fallback strings for the top-level error boundary
    errorBoundary: { title: 'Oops!', retryLabel: 'Retry' },

    // Date formatting for SDK-rendered dates (passkeys, connected agents)
    formats: { date: { dateStyle: 'short' } },
  }}
>
```

Section keys match the `SettingsScreen` values: `profile`, `security`, `connected-agents`, `general`, `users`, `subscription`, `usage`, `credits`, `features`, `notifications`, `permissions`, `danger`. Hidden sections are removed from the sidebar (empty groups collapse) and unreachable via deep links or `defaultSection` — the dialog falls back to the first enabled section.

**Per-dialog override** — `WorkspaceSettingsDialog` accepts its own `ui` prop, deep-merged over the global config, so one app can render differently-configured dialogs:

```tsx
<WorkspaceSettingsDialog
  workspace={ws}
  ui={{ settings: { sections: { credits: true, danger: false } } }}
/>
```

In your own components, use the same single-call helper the SDK uses internally — it combines the `ui` config flag with a permission check:

```tsx
import { useUIVisibility, Permission } from '@buildbase/sdk/react';

function MembersPanel() {
  const { visible } = useUIVisibility();

  // Config flag AND permission in one decision
  if (!visible(ui => ui.settings?.users?.invite, Permission.WORKSPACE_MEMBERS_INVITE)) {
    return null;
  }
  return <InviteForm />;
}
```

`useUIConfig()` gives you the raw `ui` object if you only need the config values; `mergeUIConfig(base, override)` is the deep-merge used for per-dialog overrides.

📖 **Full guide with the complete toggle reference, precedence rules, and recipes (single-tenant, external billing, white-label, read-only): [docs/UI-CONFIG.md](./docs/UI-CONFIG.md)**

## 🔐 Authentication

### Authentication Hook

Use the `useSaaSAuth` hook to manage authentication state and actions:

```tsx
import { useSaaSAuth } from '@buildbase/sdk/react';

function AuthExample() {
  const { user, isAuthenticated, signIn, signOut, status } = useSaaSAuth();

  return (
    <div>
      {!isAuthenticated ? (
        <div>
          <h1>Welcome! Please sign in</h1>
          <button onClick={() => signIn()} disabled={status === 'loading'}>
            {status === 'loading' ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      ) : (
        <div>
          <h1>Welcome back, {user?.name}!</h1>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      )}
    </div>
  );
}
```

### Authentication Hook Properties

```tsx
const {
  user, // Current user object (null if not authenticated)
  session, // Full session object with user and sessionId
  isAuthenticated, // Boolean: true if user is authenticated
  isLoading, // Boolean: true when checking authentication status
  isRedirecting, // Boolean: true when redirecting for OAuth
  status, // AuthStatus: 'loading' | 'redirecting' | 'authenticating' | 'authenticated' | 'unauthenticated' (use AuthStatus enum for type-safe checks)
  signIn, // Function: initiates sign-in flow. Accepts optional returnUrl to redirect back after login.
  signOut, // Function: signs out the user
  openWorkspaceSettings, // Function: opens workspace settings dialog to a specific section
} = useSaaSAuth();
```

#### Workspace Settings Sections

Open the workspace settings dialog to a specific section:

```tsx
openWorkspaceSettings('profile'); // Account profile
openWorkspaceSettings('general'); // Workspace name, icon
openWorkspaceSettings('users'); // Workspace members
openWorkspaceSettings('subscription'); // Plan & Billing
openWorkspaceSettings('usage'); // Quota usage dashboard
openWorkspaceSettings('features'); // Feature toggles
openWorkspaceSettings('danger'); // Delete workspace (owner only)
```

### Authentication Components

For declarative rendering, use the conditional components:

```tsx
import { WhenAuthenticated, WhenUnauthenticated } from '@buildbase/sdk/react';

function App() {
  return (
    <div>
      <WhenUnauthenticated>
        <LoginPage />
      </WhenUnauthenticated>

      <WhenAuthenticated>
        <Dashboard />
      </WhenAuthenticated>
    </div>
  );
}
```

### Redirect Preservation

The SDK automatically preserves the URL when `signIn()` is called. After login, the user is redirected back to the page they were on.

```tsx
// Automatic — just call signIn(), the current URL is saved
signIn();

// Custom — pass a specific URL to redirect to after login
signIn('https://app.com/dashboard?bb=action:selectPlan,plan:abc');
```

This works across the full OAuth round-trip via localStorage (10-minute TTL, validated with `validateRedirectUrl()`).

For advanced use cases, the low-level helpers are also exported:

```tsx
import { saveAuthIntent, consumeAuthIntent, clearAuthIntent } from '@buildbase/sdk';
```

### Affiliate / Referral Tracking

Pass affiliate/referral data to Stripe checkout sessions via the `getCheckoutStripeParams` prop on `SaaSOSProvider`. This async callback is called before every checkout session is created, so you can fetch referral IDs, read cookies, or call any async API:

```tsx
<SaaSOSProvider
  serverUrl="https://api.buildbase.app"
  version={ApiVersion.V1}
  orgId="your-org-id"
  auth={authConfig}
  getCheckoutStripeParams={async request => {
    // Rewardful, FirstPromoter, PartnerStack — read client_reference_id
    const referralId = await getRewardfulReferralId();

    return {
      clientReferenceId: referralId,

      // Endorsely — reads subscription metadata
      subscriptionMetadata: { endorsely_referral: window.endorsely_referral },

      // Custom tracking on the checkout session
      metadata: { campaign: 'summer-sale' },
    };
  }}
>
  <App />
</SaaSOSProvider>
```

The returned object is merged into the Stripe checkout session. You can return any combination of the fields below, or `undefined` to proceed without extra options:

| Field                  | Stripe mapping                | Use case                               |
| ---------------------- | ----------------------------- | -------------------------------------- |
| `clientReferenceId`    | `client_reference_id`         | Rewardful, FirstPromoter, etc.         |
| `metadata`             | `metadata` (checkout session) | Custom tracking, Endorsely             |
| `subscriptionMetadata` | `subscription_data.metadata`  | Data that persists on the subscription |

## 👥 Role-Based Access Control

### Role Components

Control access based on user roles:

```tsx
import { WhenRoles, WhenWorkspaceRoles } from '@buildbase/sdk/react';

function AdminPanel() {
  return (
    <div>
      {/* Global user roles */}
      <WhenRoles roles={['admin', 'super-admin']}>
        <AdminControls />
      </WhenRoles>

      {/* Workspace-specific roles */}
      <WhenWorkspaceRoles roles={['owner', 'admin']}>
        <WorkspaceSettings />
      </WhenWorkspaceRoles>

      {/* With fallback content */}
      <WhenRoles roles={['admin']} fallback={<p>You need admin access to view this content</p>}>
        <SensitiveData />
      </WhenRoles>
    </div>
  );
}
```

## 🎛️ Feature Flags

Control feature visibility based on workspace and user settings:

```tsx
import {
  WhenWorkspaceFeatureEnabled,
  WhenWorkspaceFeatureDisabled,
  WhenUserFeatureEnabled,
  WhenUserFeatureDisabled,
} from '@buildbase/sdk/react';

function FeatureExample() {
  return (
    <div>
      {/* Workspace-level features */}
      <WhenWorkspaceFeatureEnabled slug="advanced-analytics">
        <AdvancedAnalytics />
      </WhenWorkspaceFeatureEnabled>

      <WhenWorkspaceFeatureDisabled slug="beta-features">
        <p>Beta features are not enabled for this workspace</p>
      </WhenWorkspaceFeatureDisabled>

      {/* User-level features */}
      <WhenUserFeatureEnabled slug="premium-features">
        <PremiumDashboard />
      </WhenUserFeatureEnabled>

      <WhenUserFeatureDisabled slug="trial-mode">
        <UpgradePrompt />
      </WhenUserFeatureDisabled>
    </div>
  );
}
```

### Feature Flags Hook

Use the `useUserFeatures` hook to check feature flags programmatically:

```tsx
import { useUserFeatures } from '@buildbase/sdk/react';

function FeatureCheck() {
  const { features, isFeatureEnabled, refreshFeatures } = useUserFeatures();

  return (
    <div>{isFeatureEnabled('premium-features') ? <PremiumContent /> : <StandardContent />}</div>
  );
}
```

## 📋 Subscription Gates

Control UI visibility based on the current workspace’s subscription. Subscription data is loaded once per workspace and refetched when the workspace changes or when the subscription is updated (e.g. upgrade, cancel, resume).

**SubscriptionContextProvider** is included in **SaaSOSProvider** by default, so subscription gates work without extra setup.

### Subscription Gate Components

```tsx
import {
  WhenSubscription,
  WhenNoSubscription,
  WhenSubscriptionToPlans,
} from '@buildbase/sdk/react';

function BillingExample() {
  return (
    <div>
      {/* Show when workspace has any active subscription */}
      <WhenSubscription>
        <BillingSettings />
      </WhenSubscription>

      {/* Show when workspace has no subscription */}
      <WhenNoSubscription>
        <UpgradePrompt />
      </WhenNoSubscription>

      {/* Show only when subscribed to specific plans (by slug, case-insensitive) */}
      <WhenSubscriptionToPlans plans={['pro', 'enterprise']}>
        <AdvancedAnalytics />
      </WhenSubscriptionToPlans>
    </div>
  );
}
```

| Component                 | Renders when                                                         |
| ------------------------- | -------------------------------------------------------------------- |
| `WhenSubscription`        | Current workspace has an active subscription (any plan); not loading |
| `WhenNoSubscription`      | Current workspace has no subscription (or no workspace); not loading |
| `WhenSubscriptionToPlans` | Current workspace is subscribed to one of the given plan slugs       |

All gates must be used inside **SubscriptionContextProvider** (included in SaaSOSProvider). By default they return `null` while loading or when the condition is not met. You can pass optional **loadingComponent** (component/element to show while loading) and **fallbackComponent** (component/element to show when condition is not met):

```tsx
<WhenSubscription
  loadingComponent={<Skeleton className="h-20" />}
  fallbackComponent={<UpgradePrompt />}
>
  <BillingSettings />
</WhenSubscription>

<WhenSubscriptionToPlans
  plans={['pro', 'enterprise']}
  loadingComponent={<Spinner />}
  fallbackComponent={<p>Upgrade to Pro or Enterprise to access this feature.</p>}
>
  <AdvancedAnalytics />
</WhenSubscriptionToPlans>
```

### useSubscriptionContext

Use the hook when you need subscription data or a manual refetch (e.g. after returning from Stripe checkout):

```tsx
import { useSubscriptionContext } from '@buildbase/sdk/react';

function SubscriptionStatus() {
  const { response, loading, refetch } = useSubscriptionContext();

  if (loading) return <Spinner />;
  if (!response?.subscription) return <p>No active subscription</p>;

  const plan = response.plan ?? response.subscription?.plan;
  return (
    <div>
      <p>Plan: {plan?.name ?? plan?.slug}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

| Property   | Type                            | Description                                            |
| ---------- | ------------------------------- | ------------------------------------------------------ |
| `response` | `ISubscriptionResponse \| null` | Current subscription data for the current workspace    |
| `loading`  | `boolean`                       | True while subscription is being fetched               |
| `refetch`  | `() => Promise<void>`           | Manually refetch subscription (e.g. after plan change) |

#### When subscription refetches

- When the current workspace changes (automatic).
- When subscription is updated via SDK (e.g. `useUpdateSubscription`, cancel, resume) — refetch is triggered automatically.
- When you call `refetch()` (e.g. after redirect from checkout).

## ⏳ Trial Gates

Control UI based on trial state. Works with Stripe-native trials (both card-required and no-card).

### Trial Gate Components

```tsx
import { WhenTrialing, WhenNotTrialing, WhenTrialEnding } from '@buildbase/sdk/react';

function TrialExample() {
  return (
    <div>
      {/* Show only during active trial */}
      <WhenTrialing>
        <TrialBanner />
      </WhenTrialing>

      {/* Show when NOT trialing (active, canceled, or no subscription) */}
      <WhenNotTrialing>
        <RegularContent />
      </WhenNotTrialing>

      {/* Show when trial ends within N days (default: 3) */}
      <WhenTrialEnding daysThreshold={7}>
        <UpgradeUrgentBanner />
      </WhenTrialEnding>
    </div>
  );
}
```

| Component         | Renders when                                                    |
| ----------------- | --------------------------------------------------------------- |
| `WhenTrialing`    | Subscription status is `trialing`                               |
| `WhenNotTrialing` | Subscription status is NOT `trialing`                           |
| `WhenTrialEnding` | Trialing AND trial ends within `daysThreshold` days (default 3) |

All trial gates support `loadingComponent` and `fallbackComponent` props.

### useTrialStatus

Hook that computes trial information from the subscription context:

```tsx
import { useTrialStatus } from '@buildbase/sdk/react';

function TrialInfo() {
  const { isTrialing, daysRemaining, trialEndsAt, isTrialEnding } = useTrialStatus();

  if (!isTrialing) return null;

  return (
    <div>
      <p>Trial ends in {daysRemaining} days</p>
      {isTrialEnding && <p>Upgrade now to keep access!</p>}
    </div>
  );
}
```

| Property         | Type           | Description                                       |
| ---------------- | -------------- | ------------------------------------------------- |
| `isTrialing`     | `boolean`      | Whether subscription is in trial                  |
| `daysRemaining`  | `number`       | Days left in trial (0 if not trialing or expired) |
| `trialEndsAt`    | `Date \| null` | Trial end date                                    |
| `trialStartedAt` | `Date \| null` | Trial start date                                  |
| `isTrialEnding`  | `boolean`      | True when 3 or fewer days remaining               |

## 🔔 Push Notifications

Browser push notifications — built into the SDK. Users can enable/disable from the **Notifications** tab in workspace settings. Billing events (payment failed, trial ending) auto-send push notifications.

**Only setup required:** Create `public/push-sw.js` in your app:

```js
self.addEventListener('push', function (event) {
  if (!event.data) return;
  try {
    var payload = event.data.json();
    var options = {
      body: payload.body || '',
      icon: payload.icon || undefined,
      badge: payload.badge || payload.icon || undefined,
      image: payload.image || undefined,
      tag: payload.tag || undefined,
      actions: payload.actions || undefined,
      silent: payload.silent || false,
      requireInteraction: payload.requireInteraction || false,
      renotify: payload.renotify || false,
      timestamp: payload.timestamp || undefined,
      dir: payload.dir || 'auto',
      data: { url: payload.url, ...(payload.data || {}) },
    };
    event.waitUntil(self.registration.showNotification(payload.title || 'Notification', options));
  } catch (e) {
    console.error('[PushSW]', e);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url;
  if (url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].url === url && 'focus' in list[i]) return list[i].focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
    );
  }
});
```

Everything else is built-in — permission handling, subscribe/unsubscribe, settings UI, billing auto-triggers, and browser-specific unblock instructions.

## 📬 Notifications

Send email and push notifications to workspace members. The system has three layers:

- **System notifications** — Automatically triggered by platform events (workspace invite, payment failed, trial ending, etc.). Managed by the developer in the admin dashboard.
- **Custom notifications** — Defined by the developer, triggered from app code via SDK. Can be made user-configurable.
- **Ad-hoc notifications** — Send push notifications with any event slug without pre-registering it. No event setup needed — just pass `title`, `message`, and optionally `icon`, `image`, `url`. Email requires a registered event with a linked template.

### Sending Notifications (Server-Side)

```ts
import { notification } from '@/lib/buildbase';

// Notify a specific user
await notification.send(workspaceId, 'comment_added', userId, {
  title: 'New Comment', // Push title (falls back to event name)
  message: 'Alice commented on your project', // Push body + email {{message}}
  icon: 'https://example.com/comment-icon.png', // Custom push icon (falls back to org icon)
  image: 'https://example.com/screenshot.jpg', // Large image in push notification body
  url: 'https://app.example.com/projects/123#comments', // Opens on push click + {{url}} in email
});

// Notify all workspace members (omit userId)
await notification.send(workspaceId, 'new_release', undefined, {
  title: 'New Release',
  message: 'Version 2.0 is now available with dark mode and API v2!',
  image: 'https://example.com/release-banner.jpg',
  url: 'https://app.example.com/changelog',
});
```

### Ad-hoc Notifications

Send push notifications without creating a custom event first — any event slug works:

```ts
// No need to register 'deployment_success' as a custom event
await notification.send(workspaceId, 'deployment_success', userId, {
  title: 'Deployment Complete',
  message: 'v2.1.0 deployed to production',
  icon: 'https://example.com/deploy-icon.png',
  url: '/deployments/latest',
  channels: { push: true },
});
```

> **Note:** Ad-hoc events support push only. Email requires a registered event with a linked email template.

### Push Options

Fine-grained control over push notification behavior:

```ts
// Action buttons — user can tap "Reply" or "Dismiss" directly on the notification
await notification.send(workspaceId, 'new_message', userId, {
  title: 'New message from Alice',
  message: 'Hey, are you free for a call?',
  actions: [
    { action: 'reply', title: 'Reply', icon: 'https://example.com/reply.png' },
    { action: 'dismiss', title: 'Dismiss' },
  ],
  tag: 'chat-alice', // Replaces previous "chat-alice" notification instead of stacking
  renotify: true, // Still vibrate/sound when replacing
  channels: { push: true },
});

// Critical alert — stays visible until user interacts
await notification.send(workspaceId, 'payment_failed', userId, {
  title: 'Payment Failed',
  message: 'Your subscription will be suspended in 3 days',
  badge: 'https://example.com/alert-badge.png',
  requireInteraction: true, // No auto-dismiss
  urgency: 'high', // Prioritized delivery on mobile
  channels: { push: true },
});

// Silent notification — no sound or vibration
await notification.send(workspaceId, 'sync_complete', userId, {
  title: 'Sync Complete',
  message: '1,234 records synced',
  silent: true,
  urgency: 'low',
  channels: { push: true },
});
```

| Option               | Type                            | Description                                                      |
| -------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `badge`              | `string`                        | Small monochrome icon for status bar (Android/ChromeOS)          |
| `tag`                | `string`                        | Replaces existing notification with same tag instead of stacking |
| `actions`            | `Array<{action, title, icon?}>` | Up to 2 action buttons on the notification                       |
| `silent`             | `boolean`                       | No sound or vibration                                            |
| `requireInteraction` | `boolean`                       | Stays visible until user interacts                               |
| `renotify`           | `boolean`                       | Sound/vibrate again when replacing via `tag`                     |
| `timestamp`          | `number`                        | Custom timestamp (ms since epoch) shown on notification          |
| `dir`                | `'ltr' \| 'rtl' \| 'auto'`      | Text direction for title/body                                    |

### Delivery Options

Control how and when the push service delivers the notification:

```ts
// Schedule for later
await notification.send(workspaceId, 'daily_digest', undefined, {
  title: 'Your Daily Digest',
  message: '12 new updates in your workspace',
  scheduledAt: '2026-04-16T09:00:00Z', // Deliver at 9am UTC tomorrow
  channels: { push: true },
});

// Short-lived notification — discard if not delivered in 1 hour
await notification.send(workspaceId, 'flash_sale', undefined, {
  title: 'Flash Sale — 50% off!',
  message: 'Ends in 1 hour',
  image: 'https://example.com/sale-banner.jpg',
  ttl: 3600, // Expires after 1 hour (seconds)
  urgency: 'high', // Deliver ASAP
  channels: { push: true },
});
```

| Option        | Type                                        | Description                                                                                   |
| ------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `scheduledAt` | `string`                                    | ISO 8601 date. Delays delivery until the specified time                                       |
| `ttl`         | `number`                                    | Time-to-live in seconds. Push service discards if not delivered in time. Default: 86400 (24h) |
| `urgency`     | `'very-low' \| 'low' \| 'normal' \| 'high'` | Delivery priority hint. Affects battery usage on mobile                                       |

### Channel Control

By default, both email and push are sent (based on event config). Override per-send with `channels`:

```ts
// Only push — real-time alert, no email
await notification.send(workspaceId, 'typing_indicator', userId, {
  message: 'Alice is typing...',
  channels: { push: true },
});

// Only email — digest or report, no push
await notification.send(workspaceId, 'weekly_report', undefined, {
  message: 'Your weekly activity report is ready',
  channels: { email: true },
});

// Both channels explicitly
await notification.send(workspaceId, 'comment_added', userId, {
  message: 'New comment on your project',
  channels: { email: true, push: true },
});
```

> **Note:** Even with `channels` override, the 4-layer gate still applies. If the admin disabled push globally, `channels: { push: true }` won't send push.

### Merge Tags

Both email and push support merge tags with `{{tag}}` syntax:

```ts
await notification.send(workspaceId, 'export_ready', userId, {
  title: '{{workspaceName}} — Export Ready', // → "Acme Corp — Export Ready"
  message: 'Hi {{name}}, your export is ready', // → "Hi Alice, your export is ready"
  downloadUrl: 'https://example.com/exports/123',
  fileName: 'report.csv',
});
```

| Tag                 | Resolves to              | Available in                       |
| ------------------- | ------------------------ | ---------------------------------- |
| `{{name}}`          | Recipient's name         | Email + Push                       |
| `{{email}}`         | Recipient's email        | Email + Push                       |
| `{{workspaceName}}` | Workspace name           | Email + Push                       |
| `{{message}}`       | The `message` field      | Email template                     |
| `{{url}}`           | The `url` field          | Email template + Push click target |
| `{{anyKey}}`        | Value from `data` object | Email + Push                       |

### Response

```ts
{
  sent: true,
  channels: { email: true, push: true },
  notifiedCount: 5  // Number of users notified (1 for single user, N for workspace)
}
```

### How It Works

When `notification.send()` is called, the system checks 4 layers before delivering:

1. **Org global settings** — Developer can disable all email or all push notifications globally
2. **Event config** — Per-event enabled/disabled and per-channel (email/push) toggles
3. **Workspace preferences** — End-user overrides (only for events marked `userManaged`)
4. **User unsubscribe** — Per-user email unsubscribe preferences (checked at delivery time)

### Creating Custom Events

Custom notification events are created in the admin dashboard under **Notifications > Custom**:

- **Name** — Display name (e.g., "Comment Added")
- **Slug** — Used in code (e.g., `comment_added`)
- **Category** — Grouping in settings UI (e.g., "Activity")
- **Channels** — Enable/disable email and push per event
- **User Control** — If enabled, workspace members can toggle this notification in their settings

An email template is auto-created for each custom event. Edit it in **Email Templates** to customize the content and add merge tags like `{{downloadUrl}}`, `{{commentText}}`, etc.

### Notification Settings (End-User UI)

The workspace settings panel shows notification preferences automatically — **only for events where the developer enabled "User Control"**. System notifications are never shown to end users.

```tsx
import { SaaSOSProvider } from '@buildbase/sdk/react';

// The Notifications tab in workspace settings shows:
// - Browser push toggle (subscribe/unsubscribe)
// - Per-event email/push toggles (only user-manageable custom events)
```

### Notification Types

```ts
import type { NotificationData, NotificationResult, NotificationEvent } from '@buildbase/sdk';

interface NotificationData {
  title?: string; // Push title (falls back to event name)
  message?: string; // Push body + email {{message}}
  icon?: string; // Custom push icon URL (falls back to org icon)
  image?: string; // Large image in push notification body
  badge?: string; // Small monochrome status bar icon
  url?: string; // Opens on push click + {{url}} in email
  tag?: string; // Replace instead of stack notifications
  actions?: Array<{ action; title; icon? }>; // Action buttons (max 2)
  silent?: boolean; // No sound/vibration
  requireInteraction?: boolean; // No auto-dismiss
  renotify?: boolean; // Re-alert on tag replace
  timestamp?: number; // Custom timestamp (ms)
  dir?: 'ltr' | 'rtl' | 'auto'; // Text direction
  ttl?: number; // Time-to-live (seconds)
  urgency?: 'very-low' | 'low' | 'normal' | 'high'; // Delivery priority
  scheduledAt?: string; // ISO 8601 delayed delivery
  channels?: { email?: boolean; push?: boolean }; // Override which channels to use
  [key: string]: any; // Custom merge tags for email + push
}

interface NotificationResult {
  sent: boolean;
  channels: { email: boolean; push: boolean };
  notifiedCount?: number;
  reason?: string; // Only when sent=false
}

interface NotificationEvent {
  slug: string;
  name: string;
  description: string;
  category: string;
  channels: { email: boolean; push: boolean };
}
```

## 🌐 Internationalization (i18n)

The SDK supports 8 locales with ICU MessageFormat for plurals, selects, and number formatting.

### Setup

```tsx
<SaaSOSProvider locale="hi">{/* All SDK UI renders in Hindi */}</SaaSOSProvider>
```

### Supported Locales

| Code | Language | Numerals                  | Direction |
| ---- | -------- | ------------------------- | --------- |
| `en` | English  | 1,234.56                  | LTR       |
| `es` | Spanish  | 1.234,56                  | LTR       |
| `fr` | French   | 1 234,56                  | LTR       |
| `de` | German   | 1.234,56                  | LTR       |
| `ja` | Japanese | 1,234.56                  | LTR       |
| `zh` | Chinese  | 1,234.56                  | LTR       |
| `hi` | Hindi    | Devanagari (e.g. 1,234)   | LTR       |
| `ar` | Arabic   | Arabic-Indic (e.g. 1,234) | RTL       |

### useTranslation Hook

```tsx
import { useTranslation } from '@buildbase/sdk/react';

function MyComponent() {
  const { t, locale, dir, fmtNum, fmtCents } = useTranslation();

  return (
    <div dir={dir}>
      <p>{t('subscription.currentPlan')}</p> {/* Type-safe key lookup */}
      <p>{t('users.memberCount', { count: 5 })}</p> {/* ICU plural: "5 members" */}
      <p>{fmtNum(1234)}</p> {/* Locale-aware: "1,234" or "1,234" */}
      <p>{fmtCents(1999, 'usd')}</p> {/* "$19.99" or "19.99 US$" */}
    </div>
  );
}
```

### Features

- **ICU MessageFormat** — plurals (`{count, plural, one {# item} other {# items}}`), selects, number formatting
- **Type-safe keys** — `TranslationKey` union type with autocomplete, catches typos at compile time
- **Native numerals** — Hindi uses Devanagari digits, Arabic uses Arabic-Indic digits
- **RTL support** — `dir` attribute on all dialogs, logical CSS properties (start/end instead of left/right)
- **Locale-aware formatting** — dates, currencies, and numbers formatted per locale
- **Memoized Intl formatters** — shared `Intl.NumberFormat`/`DateTimeFormat`/`PluralRules` instances for performance
- **Lazy-loaded translations** — non-English locales loaded on demand, English always bundled

## 🏠 Workspace Modes

The SDK supports two workspace modes, configured from the admin dashboard (no code changes needed):

### Personal Mode

For B2C solo tools (Todoist, Grammarly, personal dashboards):

- 1 user = 1 auto-created workspace
- No team invites, no workspace switcher
- Clicking workspace trigger opens Settings directly
- Seats, members, roles sections hidden in UI
- Enforced at API level — workspace creation and invites blocked

### Platform Mode (Default)

For full SaaS platforms (Slack, GitHub, Discord):

- Multi-workspace, multi-user
- Create workspaces, invite members, switch between them
- Full settings UI with members, roles, billing, seats

### Advanced Overrides

Platform mode supports granular overrides from the admin dashboard:

| Setting                     | Options                          | Default  |
| --------------------------- | -------------------------------- | -------- |
| Can Create Workspace        | Everyone / Owner Only / Disabled | Everyone |
| Can Invite Members          | Everyone / Admin Only / Disabled | Everyone |
| Show Workspace Switcher     | On / Off                         | On       |
| Max Workspaces Per User     | 0 (unlimited) or a number        | 0        |
| Auto-Create First Workspace | On / Off                         | On       |

These let you achieve team-like, managed, or enterprise-like behavior without a separate mode.

## 👤 User Management

### User Attributes

Manage custom user attributes (key-value pairs):

```tsx
import { useUserAttributes } from '@buildbase/sdk/react';

function UserProfile() {
  const { attributes, isLoading, updateAttribute, updateAttributes, refreshAttributes } =
    useUserAttributes();

  const handleUpdate = async () => {
    // Update single attribute
    await updateAttribute('theme', 'dark');

    // Or update multiple attributes
    await updateAttributes({
      theme: 'dark',
      notifications: true,
      language: 'en',
    });
  };

  return (
    <div>
      <p>Theme: {attributes.theme}</p>
      <button onClick={handleUpdate}>Update Preferences</button>
    </div>
  );
}
```

## 🏢 Complete Workspace Management

The `useSaaSWorkspaces` hook provides comprehensive workspace management:

```tsx
import { useSaaSWorkspaces } from '@buildbase/sdk/react';

function WorkspaceManager() {
  const {
    workspaces, // Array of all workspaces
    currentWorkspace, // Currently selected workspace
    loading, // Loading state
    refreshing, // Refreshing state
    switching, // True when a workspace switch is in progress
    switchingToId, // Workspace ID currently being switched to (null when not switching)
    error, // Error message
    fetchWorkspaces, // Fetch all workspaces
    refreshWorkspaces, // Background refresh
    setCurrentWorkspace, // Direct workspace set (bypasses onWorkspaceChange)
    switchToWorkspace, // Full switch flow: onWorkspaceChange first, then set workspace
    createWorkspace, // Create new workspace
    updateWorkspace, // Update workspace
    deleteWorkspace, // Delete workspace
    getUsers, // Get workspace users
    addUser, // Add user to workspace
    removeUser, // Remove user from workspace
    updateUser, // Update user role/permissions
    getFeatures, // Get all available features
    updateFeature, // Toggle workspace feature
    getProfile, // Get current user profile
    updateUserProfile, // Update user profile
    updateWorkspaceSettings, // Update workspace settings
    updateWorkspacePermissions, // Update workspace permissions
  } = useSaaSWorkspaces();

  // Example: Create a workspace
  const handleCreate = async () => {
    await createWorkspace('My Workspace', 'https://example.com/logo.png');
  };

  // Example: Add user to workspace
  const handleAddUser = async () => {
    await addUser(currentWorkspace._id, 'user@example.com', 'member');
  };

  return <div>{/* Your workspace UI */}</div>;
}
```

## 💰 Public Pricing (No Login)

Display subscription plans and pricing on public pages (e.g. marketing site, pricing page) without requiring users to log in.

### usePublicPlans

Fetches public plans by slug. Returns `items` (features, limits, quotas) and `plans` (with pricing). You construct the layout from this data:

```tsx
import { usePublicPlans } from '@buildbase/sdk/react';

function PublicPricingPage() {
  const { items, plans, loading, error } = usePublicPlans('main-pricing');

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  return (
    <div>
      {plans.map(plan => (
        <PlanCard key={plan._id} plan={plan} items={items} />
      ))}
    </div>
  );
}
```

### PricingPage Component

Use the `PricingPage` component with a render-prop pattern:

```tsx
import { PricingPage } from '@buildbase/sdk/react';

function PublicPricingPage() {
  return (
    <PricingPage slug="main-pricing" redirectBaseUrl="https://app.com/dashboard">
      {({ loading, error, items, plans, selectPlan, refetch }) => {
        if (loading) return <Loading />;
        if (error) return <Error message={error} />;

        return (
          <div>
            {plans.map(plan => (
              <div key={plan._id}>
                <PlanCard plan={plan} items={items} />
                <button onClick={() => selectPlan(plan._id, 'monthly', 'usd')}>
                  {plan.trial?.enabled
                    ? `Start ${plan.trial.durationDays}-Day Trial`
                    : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        );
      }}
    </PricingPage>
  );
}
```

`selectPlan()` handles everything automatically:

- **Authenticated** → opens the "Choose Your Plan" dialog
- **Not authenticated** → saves a redirect URL, triggers sign-in, and after login the user lands on the dashboard with the plan picker dialog open

| Prop              | Type                           | Description                                                                                                               |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `slug`            | `string`                       | Plan group slug (e.g. 'main-pricing', 'enterprise')                                                                       |
| `children`        | `(details) => ReactNode`       | Render prop receiving plan details (see below)                                                                            |
| `redirectBaseUrl` | `string`                       | Base URL for post-login redirects (e.g. `"https://app.com/dashboard"`). Enables `selectPlan()` for unauthenticated users. |
| `loadingFallback` | `ReactNode`                    | Custom loading UI (defaults to skeleton)                                                                                  |
| `errorFallback`   | `(error: string) => ReactNode` | Custom error UI                                                                                                           |

**Render prop details**: `{ loading, error, items, plans, notes, refetch, selectPlan }`

- `selectPlan(planVersionId, interval, currency)` — One-call plan selection (handles auth + dialog automatically)

**Response shape**: `items` = subscription item definitions (features, limits, quotas with category); `plans` = plan versions with `pricing`, `quotas`, `features`, `limits`.

**Backend requirement**: `GET /api/v1/public/{orgId}/plans/{groupSlug}` must be implemented and allow unauthenticated access.

## 💱 Multi-Currency & Pricing Utilities

Plans support **pricing variants** (multi-currency). Use these utilities for display and lookup.

### Currency utilities

| Export                               | Purpose                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| `CURRENCY_DISPLAY`                   | Map of currency code → symbol (e.g. `usd` → `$`)          |
| `CURRENCY_FLAG`                      | Map of currency code → flag emoji                         |
| `PLAN_CURRENCY_CODES`                | Allowed billing currency codes (for dropdowns/validation) |
| `PLAN_CURRENCY_OPTIONS`              | Options array for plan currency selects                   |
| `getCurrencySymbol(currency)`        | Symbol for a Stripe currency code                         |
| `getCurrencyFlag(currency)`          | Flag emoji for a currency code                            |
| `formatCents(cents, currency)`       | Format cents as localized price string                    |
| `formatOverageRate(cents, currency)` | Format overage rate for display                           |
| `formatOverageRateWithLabel(...)`    | Overage rate with optional unit label                     |
| `formatQuotaIncludedOverage(...)`    | "X included, then $Y / unit" style text                   |
| `getQuotaUnitLabelFromName(name)`    | Human-readable unit label from quota name                 |

### Pricing variant utilities

| Export                                                                   | Purpose                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `getPricingVariant(planVersion, currency)`                               | Get variant for a currency, or `null`                        |
| `getBasePriceCents(planVersion, currency, interval)`                     | Base price in cents for currency/interval                    |
| `getStripePriceIdForInterval(planVersion, currency, interval)`           | Stripe price ID for checkout                                 |
| `getQuotaOverageCents(planVersion, currency, quotaSlug, interval)`       | Overage cents for a quota                                    |
| `getQuotaDisplayWithVariant(planVersion, currency, quotaSlug, interval)` | Display value with overage for a variant                     |
| `getAvailableCurrenciesFromPlans(plans)`                                 | Unique currency codes across plan versions                   |
| `getDisplayCurrency(planVersion, currency)`                              | Display currency (variant exists ? currency : plan.currency) |
| `getBillingIntervalAndCurrencyFromPriceId(planVersions, priceId)`        | Resolve price ID to interval + currency                      |

Types: `IPricingVariant`, `PlanVersionWithPricingVariants`, `QuotaDisplayWithOverage`.

### Quota utilities

| Export                                             | Purpose                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `getQuotaDisplayValue(quotaByInterval, interval?)` | Normalize `IQuotaByInterval` to `{ included, overage?, unitSize? }` |
| `formatQuotaWithPrice(value, unitName, options?)`  | Format as "X included, then $Y.YY / unit"                           |

Types: `QuotaDisplayValue`, `FormatQuotaWithPriceOptions`. Plan/subscription types use `IQuotaByInterval` and `IQuotaIntervalValue` for per-interval quotas and overages.

```tsx
import {
  getCurrencySymbol,
  formatCents,
  getPricingVariant,
  getBasePriceCents,
  getQuotaDisplayValue,
  formatQuotaWithPrice,
} from '@buildbase/sdk/react';

// Display price for a plan version in a currency
const variant = getPricingVariant(planVersion, 'usd');
const cents = getBasePriceCents(planVersion, 'usd', 'monthly');
if (cents != null) {
  console.log(getCurrencySymbol('usd') + (cents / 100).toFixed(2));
}

// Quota display with overage
const display = getQuotaDisplayValue(planVersion.quotas?.videos, 'monthly');
const text = formatQuotaWithPrice(display, 'video', { currency: 'usd' });
```

## 📊 Quota Usage Tracking

Track and monitor metered usage for subscription quotas (e.g., API calls, emails, storage). Usage can be recorded from both the **client-side** (React app) and **server-side** (your backend).

### When to use which?

| Scenario                        | Where to record        | Why                                          |
| ------------------------------- | ---------------------- | -------------------------------------------- |
| User clicks "Send Email" button | Client-side (SDK hook) | User-initiated, immediate UI feedback needed |
| API request hits your backend   | Server-side (REST API) | Backend controls the resource, more secure   |
| Background job processes data   | Server-side (REST API) | No browser context available                 |
| File upload completes           | Either                 | Depends on where validation happens          |

As a general rule: **record usage where the resource is consumed**. If your backend processes the work, record from the backend. If it's a client-side action, record from the client.

---

### Client-Side (React SDK)

Use the SDK hooks inside your React app. Quota gate components (see [Quota Gates](#-quota-gates)) automatically refresh after recording.

#### Record Usage

```tsx
import { useRecordUsage, useSaaSWorkspaces } from '@buildbase/sdk/react';

function SendEmailButton() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { recordUsage, loading, error } = useRecordUsage(currentWorkspace?._id);

  const handleSend = async () => {
    try {
      const result = await recordUsage({
        quotaSlug: 'emails',
        quantity: 1,
        source: 'web-app', // optional: track where usage came from
        idempotencyKey: 'email-abc', // optional: prevent duplicate recordings
      });
      console.log(`Used: ${result.consumed}/${result.included}, Available: ${result.available}`);
      if (result.overage > 0) {
        console.warn(`Overage: ${result.overage} units`);
      }
    } catch (err) {
      console.error('Failed to record usage:', err);
    }
  };

  return (
    <button onClick={handleSend} disabled={loading}>
      Send Email
    </button>
  );
}
```

#### Check Single Quota Status

```tsx
import { useQuotaUsageStatus, useSaaSWorkspaces } from '@buildbase/sdk/react';

function QuotaStatusBar({ quotaSlug }: { quotaSlug: string }) {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { status, loading, refetch } = useQuotaUsageStatus(currentWorkspace?._id, quotaSlug);

  if (loading) return <Spinner />;
  if (!status) return null;

  const usagePercent = Math.round((status.consumed / status.included) * 100);

  return (
    <div>
      <p>
        {quotaSlug}: {status.consumed} / {status.included} ({usagePercent}%)
      </p>
      <p>Available: {status.available}</p>
      {status.hasOverage && <p>Overage: {status.overage} units</p>}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

#### Check All Quotas

```tsx
import { useAllQuotaUsage, useSaaSWorkspaces } from '@buildbase/sdk/react';

function QuotaDashboard() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { quotas, loading, refetch } = useAllQuotaUsage(currentWorkspace?._id);

  if (loading) return <Spinner />;
  if (!quotas) return <p>No quota data available</p>;

  return (
    <div>
      {Object.entries(quotas).map(([slug, usage]) => (
        <div key={slug}>
          <strong>{slug}</strong>: {usage.consumed} / {usage.included}
          {usage.hasOverage && <span> (overage: {usage.overage})</span>}
        </div>
      ))}
    </div>
  );
}
```

#### Usage Logs

```tsx
import { useUsageLogs, useSaaSWorkspaces } from '@buildbase/sdk/react';

function UsageLogsTable() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { logs, totalDocs, totalPages, page, hasNextPage, loading, refetch } = useUsageLogs(
    currentWorkspace?._id,
    'api_calls', // optional: filter by quota slug
    { limit: 20, page: 1 } // optional: pagination and filters
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Quota</th>
            <th>Quantity</th>
            <th>Source</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log._id}>
              <td>{log.quotaSlug}</td>
              <td>{log.quantity}</td>
              <td>{log.source ?? '-'}</td>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Page {page} of {totalPages} ({totalDocs} total)
      </p>
    </div>
  );
}
```

**`useUsageLogs` parameters:**

| Parameter        | Type                          | Required | Description                                     |
| ---------------- | ----------------------------- | -------- | ----------------------------------------------- |
| `workspaceId`    | `string \| null \| undefined` | Yes      | Workspace ID (null/undefined disables fetching) |
| `quotaSlug`      | `string`                      | No       | Filter logs by quota slug                       |
| `options.from`   | `string`                      | No       | ISO date string — filter logs from this date    |
| `options.to`     | `string`                      | No       | ISO date string — filter logs until this date   |
| `options.source` | `string`                      | No       | Filter logs by source                           |
| `options.page`   | `number`                      | No       | Page number (default: 1)                        |
| `options.limit`  | `number`                      | No       | Results per page (default: 20)                  |

#### Client-Side Hooks Summary

| Hook                                              | Purpose                                    |
| ------------------------------------------------- | ------------------------------------------ |
| `useRecordUsage(workspaceId)`                     | Record quota consumption (mutation)        |
| `useQuotaUsageStatus(workspaceId, quotaSlug)`     | Get single quota status (auto-fetches)     |
| `useAllQuotaUsage(workspaceId)`                   | Get all quotas status (auto-fetches)       |
| `useUsageLogs(workspaceId, quotaSlug?, options?)` | Get paginated usage history (auto-fetches) |

---

### Server-Side (REST API)

For backend services, background jobs, or API routes — call the BuildBase API directly. This is the recommended approach when usage happens on your server (e.g., processing an API request, running a cron job, handling webhooks).

#### Step 1: Get a Session ID

Exchange your org API token for a session ID. You can do this once and reuse the session for multiple requests (default expiry: 30 days).

```ts
// Do this once at startup or cache the result
const TOKEN = 'your-org-id:your-api-secret'; // from BuildBase dashboard

async function getSessionId(): Promise<string> {
  const response = await fetch('https://your-server.buildbase.app/api/v1/public/token/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: TOKEN,
      expiresIn: 2592000, // 30 days (optional, default is 30 days)
    }),
  });
  const data = await response.json();
  return data.sessionId;
}
```

#### Step 2: Record Usage

```ts
const SESSION_ID = await getSessionId();
const BASE_URL = 'https://your-server.buildbase.app/api/v1/public';

async function recordUsage(workspaceId: string, quotaSlug: string, quantity: number) {
  const response = await fetch(`${BASE_URL}/workspaces/${workspaceId}/subscription/usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': SESSION_ID,
    },
    body: JSON.stringify({
      quotaSlug,
      quantity,
      source: 'backend', // optional: helps distinguish from client-side usage
      metadata: {}, // optional: attach custom data
      idempotencyKey: undefined, // optional: prevent duplicate recordings
    }),
  });
  return response.json();
}

// Example: Record usage in an Express route handler
app.post('/api/generate-report', async (req, res) => {
  const { workspaceId } = req.user; // your auth

  // Record quota usage BEFORE or AFTER doing the work
  const usage = await recordUsage(workspaceId, 'reports', 1);

  if (usage.available <= 0 && !usage.hasOverage) {
    return res.status(429).json({ error: 'Report quota exceeded' });
  }

  // ... generate the report ...
  res.json({ success: true, quotaRemaining: usage.available });
});
```

#### Step 3: Check Usage Status (Optional)

```ts
// Get status for a single quota
async function getQuotaStatus(workspaceId: string, quotaSlug: string) {
  const response = await fetch(
    `${BASE_URL}/workspaces/${workspaceId}/subscription/usage/status?quotaSlug=${quotaSlug}`,
    { headers: { 'x-session-id': SESSION_ID } }
  );
  return response.json();
  // Returns: { quotaSlug, consumed, included, available, overage, hasOverage }
}

// Get status for ALL quotas
async function getAllQuotaStatus(workspaceId: string) {
  const response = await fetch(`${BASE_URL}/workspaces/${workspaceId}/subscription/usage/all`, {
    headers: { 'x-session-id': SESSION_ID },
  });
  return response.json();
  // Returns: { quotas: { [slug]: { consumed, included, available, overage, hasOverage } } }
}

// Example: Check before allowing an action
app.post('/api/send-email', async (req, res) => {
  const status = await getQuotaStatus(req.user.workspaceId, 'emails');

  if (status.available <= 0) {
    return res.status(429).json({
      error: 'Email quota exceeded',
      consumed: status.consumed,
      included: status.included,
    });
  }

  await recordUsage(req.user.workspaceId, 'emails', 1);
  // ... send the email ...
});
```

#### Batch Usage Recording (High-Volume)

For bulk operations (batch exports, cron jobs, webhooks) that process hundreds or thousands of items, use the batch endpoint to record all usage in a single request instead of calling the API per-item.

```ts
// Using BuildBase SDK (recommended)
import { BuildBase } from '@buildbase/sdk';

const bb = BuildBase({ serverUrl: BASE_URL, version: 'v1', orgId: ORG_ID, token: TOKEN });

await bb.usage.recordBatch(workspaceId, {
  items: [
    { quotaSlug: 'images', quantity: 500, source: 'batch-export-job' },
    { quotaSlug: 'videos', quantity: 10, source: 'batch-export-job' },
    { quotaSlug: 'images', quantity: 200, metadata: { jobId: 'abc123' } },
  ],
});
// Returns: { success, total: 3, succeeded: 3, failed: 0, results: [...] }
```

```ts
// Using REST API directly
const response = await fetch(`${BASE_URL}/workspaces/${workspaceId}/subscription/usage/batch`, {
  method: 'POST',
  headers: { 'x-session-id': SESSION_ID, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      { quotaSlug: 'images', quantity: 500, source: 'batch-export' },
      { quotaSlug: 'videos', quantity: 10 },
    ],
  }),
});
```

- Max **100 items** per request
- Each item is processed independently — a single failure doesn't fail the batch
- Supports `metadata`, `source`, and `idempotencyKey` per item
- Returns per-item results with `success` or `error` for each

#### Server-Side API Reference

| Endpoint                                                              | Method | Description                       |
| --------------------------------------------------------------------- | ------ | --------------------------------- |
| `/api/v1/public/token/exchange`                                       | POST   | Exchange API token for session ID |
| `/api/v1/public/workspaces/:id/subscription/usage`                    | POST   | Record quota usage                |
| `/api/v1/public/workspaces/:id/subscription/usage/status?quotaSlug=X` | GET    | Get single quota status           |
| `/api/v1/public/workspaces/:id/subscription/usage/all`                | GET    | Get all quotas status             |
| `/api/v1/public/workspaces/:id/subscription/usage/logs`               | GET    | Get paginated usage logs          |

All endpoints (except `/token/exchange`) require the `x-session-id` header.

**Record usage request body:**

| Field            | Type     | Required | Description                                                    |
| ---------------- | -------- | -------- | -------------------------------------------------------------- |
| `quotaSlug`      | `string` | Yes      | Quota identifier (e.g. `'api_calls'`, `'emails'`, `'storage'`) |
| `quantity`       | `number` | Yes      | Units to consume (minimum 1)                                   |
| `metadata`       | `object` | No       | Custom metadata to attach to the usage record                  |
| `source`         | `string` | No       | Source identifier (e.g. `'backend'`, `'worker'`, `'cron'`)     |
| `idempotencyKey` | `string` | No       | Unique key for deduplication                                   |

**Record usage response:**

| Field         | Type      | Description                                  |
| ------------- | --------- | -------------------------------------------- |
| `used`        | `number`  | Quantity recorded in this request            |
| `consumed`    | `number`  | Total usage in the current billing period    |
| `included`    | `number`  | Total units included in the plan             |
| `available`   | `number`  | Remaining units before overage               |
| `overage`     | `number`  | Units used beyond the included amount        |
| `billedAsync` | `boolean` | Whether overage billing was queued to Stripe |

## 🚦 Quota Gates

Control UI visibility based on quota usage status. Quota data is loaded once per workspace via `QuotaUsageContextProvider` (included in `SaaSOSProvider` by default) and refetched automatically after recording usage.

### Gate Components

```tsx
import {
  WhenQuotaAvailable,
  WhenQuotaExhausted,
  WhenQuotaOverage,
  WhenQuotaThreshold,
} from '@buildbase/sdk/react';

function Dashboard() {
  return (
    <div>
      {/* Show action button only when quota has remaining units */}
      <WhenQuotaAvailable slug="api_calls">
        <MakeApiCallButton />
      </WhenQuotaAvailable>

      {/* Show upgrade prompt when quota is fully consumed */}
      <WhenQuotaExhausted slug="api_calls">
        <UpgradePrompt message="You've used all your API calls this month." />
      </WhenQuotaExhausted>

      {/* Show warning when usage exceeds included amount (overage billing active) */}
      <WhenQuotaOverage slug="api_calls">
        <OverageBillingWarning />
      </WhenQuotaOverage>

      {/* Show warning when usage reaches 80% of included amount */}
      <WhenQuotaThreshold slug="api_calls" threshold={80}>
        <p>Warning: You've used over 80% of your API calls.</p>
      </WhenQuotaThreshold>
    </div>
  );
}
```

### With Loading and Fallback

All quota gate components support optional `loadingComponent` and `fallbackComponent` props:

```tsx
<WhenQuotaAvailable
  slug="emails"
  loadingComponent={<Skeleton className="h-10" />}
  fallbackComponent={<p>Email quota exhausted. <a href="/upgrade">Upgrade now</a></p>}
>
  <SendEmailButton />
</WhenQuotaAvailable>

<WhenQuotaThreshold
  slug="storage"
  threshold={90}
  loadingComponent={<Spinner />}
  fallbackComponent={null}
>
  <StorageWarningBanner />
</WhenQuotaThreshold>
```

### Quota Gate Components Reference

| Component            | Renders children when                        | Props                                                                              |
| -------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `WhenQuotaAvailable` | Quota has remaining units (`available > 0`)  | `slug`, `children`, `loadingComponent?`, `fallbackComponent?`                      |
| `WhenQuotaExhausted` | Quota is fully consumed (`available <= 0`)   | `slug`, `children`, `loadingComponent?`, `fallbackComponent?`                      |
| `WhenQuotaOverage`   | Usage exceeds included amount (`hasOverage`) | `slug`, `children`, `loadingComponent?`, `fallbackComponent?`                      |
| `WhenQuotaThreshold` | Usage percentage >= threshold                | `slug`, `threshold` (0-100), `children`, `loadingComponent?`, `fallbackComponent?` |

All gates must be used inside `QuotaUsageContextProvider` (included in `SaaSOSProvider`). By default they return `null` while loading or when the condition is not met.

### useQuotaUsageContext

Use the hook when you need raw quota data or a manual refetch (e.g. after a bulk operation):

```tsx
import { useQuotaUsageContext } from '@buildbase/sdk/react';

function QuotaDebug() {
  const { quotas, loading, refetch } = useQuotaUsageContext();

  if (loading) return <Spinner />;
  if (!quotas) return <p>No quota data</p>;

  return (
    <div>
      {Object.entries(quotas).map(([slug, usage]) => (
        <p key={slug}>
          {slug}: {usage.consumed}/{usage.included}
        </p>
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

| Property  | Type                                        | Description                            |
| --------- | ------------------------------------------- | -------------------------------------- |
| `quotas`  | `Record<string, IQuotaUsageStatus> \| null` | Current quota usage data keyed by slug |
| `loading` | `boolean`                                   | True while quota data is being fetched |
| `refetch` | `() => Promise<void>`                       | Manually refetch all quota usage       |

**When quota usage refetches:**

- When the current workspace changes (automatic).
- When usage is recorded via `useRecordUsage` — refetch is triggered automatically.
- When you call `refetch()` manually.

## 💳 Credit System

Manage prepaid credit balances for your workspace — purchase credit packages, consume credits for actions, and track transactions. Credit data is loaded once per workspace via `CreditBalanceContextProvider` (included in `SaaSOSProvider` by default) and refetched automatically after consuming or purchasing credits.

### Credit Hooks

#### useCreditBalance

```tsx
import { useCreditBalance, useSaaSWorkspaces } from '@buildbase/sdk/react';

function CreditDisplay() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { balance, loading, error, refetch } = useCreditBalance(currentWorkspace?._id);

  if (loading) return <Spinner />;
  if (!balance) return <p>No credit data</p>;

  return (
    <div>
      <p>Available: {balance.available} credits</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

#### useConsumeCredits

Consume credits for an action. Throws with `code: 'INSUFFICIENT_CREDITS'` on 402 response. Automatically invalidates the credit balance cache on success.

```tsx
import { useConsumeCredits, useSaaSWorkspaces } from '@buildbase/sdk/react';

function GenerateButton() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { consumeCredits, loading, error } = useConsumeCredits(currentWorkspace?._id);

  const handleGenerate = async () => {
    try {
      const result = await consumeCredits({
        quantity: 5,
        metadata: { action: 'image-generation' },
        idempotencyKey: 'gen-abc-123', // optional: prevent duplicate consumption
      });
      console.log(`Remaining: ${result.remaining}`);
    } catch (err: any) {
      if (err.code === 'INSUFFICIENT_CREDITS') {
        console.warn(`Need ${err.requested}, only ${err.available} available`);
      }
    }
  };

  return (
    <button onClick={handleGenerate} disabled={loading}>
      Generate (5 credits)
    </button>
  );
}
```

#### usePublicCreditPackages

Fetch credit packages publicly (no authentication required) — for marketing/pricing pages:

```tsx
import { usePublicCreditPackages } from '@buildbase/sdk/react';

function PublicCreditsPage() {
  const { packages, notes, loading } = usePublicCreditPackages();

  if (loading) return <Spinner />;

  return (
    <div>
      {notes && <p>{notes}</p>}
      {packages.map(pkg => (
        <div key={pkg._id}>
          {pkg.name}: {pkg.credits} credits
        </div>
      ))}
    </div>
  );
}
```

### Credit Components

#### CreditBalance

Render-prop component for displaying credit balance:

```tsx
import { CreditBalance } from '@buildbase/sdk/react';

function MyCredits() {
  return (
    <CreditBalance>
      {({ balance, loading, refetch }) => {
        if (loading) return <Spinner />;
        if (!balance) return null;
        return <p>{balance.available} credits available</p>;
      }}
    </CreditBalance>
  );
}
```

#### CreditActionsProvider

Render-prop component that combines balance, packages, consume, and purchase in one:

```tsx
import { CreditActionsProvider } from '@buildbase/sdk/react';

function CreditDashboard() {
  return (
    <CreditActionsProvider>
      {({ balance, packages, consume, consuming, purchase, purchasing, error }) => (
        <div>
          <p>Balance: {balance?.available ?? 0} credits</p>

          <button onClick={() => consume({ quantity: 1 })} disabled={consuming}>
            Use 1 Credit
          </button>

          <h3>Buy More</h3>
          {packages.map(pkg => (
            <button key={pkg._id} onClick={() => purchase(pkg)} disabled={purchasing}>
              {pkg.name} — {pkg.credits} credits
            </button>
          ))}

          {error && <p className="text-red-500">{error}</p>}
        </div>
      )}
    </CreditActionsProvider>
  );
}
```

### Credit Hooks Summary

| Hook                             | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `useCreditBalance(workspaceId)`  | Get current credit balance (auto-fetches)      |
| `useConsumeCredits(workspaceId)` | Consume credits (mutation)                     |
| `usePublicCreditPackages()`      | List public credit packages (no auth required) |

> **Note:** Credit purchasing, packages, transactions, and expiring credits are managed automatically by the built-in workspace settings dialog.

### Server-Side Credits

```ts
import { credits } from '@/lib/buildbase';

// Get balance
const balance = await credits.getBalance(workspaceId);

// Consume credits
const result = await credits.consume(workspaceId, {
  quantity: 10,
  metadata: { action: 'generate-report' },
});

// Public packages (no auth required)
const publicPackages = await credits.getPublicPackages();
```

## 🔖 Credit Gates

Control UI visibility based on credit balance. Credit data is loaded via `CreditBalanceContextProvider` (included in `SaaSOSProvider` by default).

### Credit Gate Components

```tsx
import { WhenCreditsAvailable, WhenCreditsExhausted, WhenCreditsLow } from '@buildbase/sdk/react';

function CreditGatedUI() {
  return (
    <div>
      {/* Show when credits are available (default: min 1) */}
      <WhenCreditsAvailable>
        <GenerateButton />
      </WhenCreditsAvailable>

      {/* Show when at least 10 credits are available */}
      <WhenCreditsAvailable min={10}>
        <BulkGenerateButton />
      </WhenCreditsAvailable>

      {/* Show when credits are fully exhausted */}
      <WhenCreditsExhausted>
        <p>No credits remaining. Purchase more to continue.</p>
      </WhenCreditsExhausted>

      {/* Show when credits fall below a threshold */}
      <WhenCreditsLow threshold={50}>
        <p>Running low on credits — only {balance} left.</p>
      </WhenCreditsLow>
    </div>
  );
}
```

### Credit Gates with Loading and Fallback

```tsx
<WhenCreditsAvailable
  loadingComponent={<Skeleton className="h-10" />}
  fallbackComponent={
    <p>
      No credits available. <a href="/buy">Buy credits</a>
    </p>
  }
>
  <ActionButton />
</WhenCreditsAvailable>
```

### Credit Gate Components Reference

| Component              | Renders children when                  | Props                                                                         |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| `WhenCreditsAvailable` | `balance.available >= min` (default 1) | `min?`, `children`, `loadingComponent?`, `fallbackComponent?`                 |
| `WhenCreditsExhausted` | `balance.available === 0`              | `children`, `loadingComponent?`, `fallbackComponent?`                         |
| `WhenCreditsLow`       | `balance.available <= threshold`       | `threshold` (required), `children`, `loadingComponent?`, `fallbackComponent?` |

All gates must be used inside `CreditBalanceContextProvider` (included in `SaaSOSProvider`). By default they return `null` while loading or when the condition is not met.

## 📝 Beta Form Component

Use the pre-built `BetaForm` component for signup/waitlist forms:

```tsx
import { BetaForm } from '@buildbase/sdk/react';

function SignupPage() {
  return (
    <BetaForm
      onSuccess={() => console.log('Form submitted!')}
      onError={error => console.error(error)}
      showSuccessMessage={true}
      hideLogo={false}
      hideTitles={false}
    />
  );
}
```

## 📡 Event System

Subscribe to SDK events for user and workspace changes:

```tsx
import { SaaSOSProvider } from '@buildbase/sdk/react';
import { eventEmitter } from '@buildbase/sdk';

// In your provider configuration
<SaaSOSProvider
  auth={{
    callbacks: {
      handleEvent: async (eventType, data) => {
        switch (eventType) {
          case 'user:created':
            console.log('User created:', data.user);
            break;
          case 'workspace:changed':
            console.log('Workspace changed:', data.workspace);
            break;
          case 'workspace:user-added':
            console.log('User added to workspace:', data.userId);
            break;
          // ... handle other events
        }
      },
    },
  }}
>
  {children}
</SaaSOSProvider>;
```

### Available Events

- `user:created` - User account created
- `user:updated` - User profile updated
- `workspace:changed` - Workspace switched (fires after switch completes; use `onWorkspaceChange` for prep before switch)
- `workspace:created` - New workspace created
- `workspace:updated` - Workspace updated
- `workspace:deleted` - Workspace deleted
- `workspace:user-added` - User added to workspace
- `workspace:user-removed` - User removed from workspace
- `workspace:user-role-changed` - User role changed

## 🛡️ Error Handling

The SDK handles errors internally: API failures, auth errors, and component errors are logged and surfaced through hook states (e.g. `error` from `useSaaSWorkspaces`) and callbacks. **SaaSOSProvider** wraps its children in an internal **SDKErrorBoundary** to catch React render errors inside the SDK tree. For app-level errors, wrap your app (or routes) in your own error boundary (e.g. React’s `ErrorBoundary` or your framework’s error UI). For failed async operations, check the `error` property on hooks and show user feedback (e.g. toast or inline message). See [Error codes](docs/ERROR_CODES.md) for SDK error codes and HTTP mappings.

## ⚙️ Settings

Access OS-level settings:

```tsx
import { useSaaSSettings } from '@buildbase/sdk/react';

function SettingsExample() {
  const { settings, getSettings } = useSaaSSettings();

  return (
    <div>
      <p>Max Workspaces: {settings?.workspace.maxWorkspaces}</p>
    </div>
  );
}
```

## 📚 API Reference

### Central APIs

All SDK API clients extend a shared base class and are exported from the package:

| Export           | Purpose                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| `BaseApi`        | Abstract base (URL, auth, `fetchJson`/`fetchResponse`) – extend for custom APIs |
| `IBaseApiConfig` | Config type: `serverUrl`, `version`, optional `orgId`                           |
| `UserApi`        | User attributes and features                                                    |
| `WorkspaceApi`   | Workspaces, subscription, invoices, quota usage, users                          |
| `SettingsApi`    | Organization settings                                                           |

Server-only toolkits (framework-agnostic, zero React) are exported from `@buildbase/sdk`:

| Export group          | Purpose                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `BuildBase()` factory | Session-scoped server actions — see [Server-Side Usage](#server-side-usage)                                                            |
| Webhook verification  | `verifyWebhookSignature`, `parseWebhookEvent` — see [Webhook Verification](#webhook-verification)                                      |
| Agent readiness       | `resolveAgentPath`, `buildRobotsTxt`, `buildAgentCard`, `buildLlmsTxt`, … — see [Agent Readiness](#agent-readiness-discovery)          |
| OAuth2 app bridge     | `handleAppTokenRequest`, `handleAppRevokeRequest`, `signClientJwt`, `bearerChallenge`, … — see [OAuth2 App Bridge](#oauth2-app-bridge) |
| MCP server            | `createMcpHandler`, `defineMcpTool`, … from **`@buildbase/sdk/mcp`** — see [MCP Server](#mcp-server-buildbasesdkmcp)                   |

### Components

| Component                                                           | Purpose                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `SubscriptionContextProvider`                                       | Provides subscription data to children (included in SaaSOSProvider)   |
| `WhenSubscription`, `WhenNoSubscription`, `WhenSubscriptionToPlans` | Subscription gate components                                          |
| `WhenTrialing`, `WhenNotTrialing`, `WhenTrialEnding`                | Trial gate components                                                 |
| `WhenQuotaAvailable`, `WhenQuotaExhausted`, `WhenQuotaOverage`      | Quota gate components                                                 |
| `CreditBalanceContextProvider`                                      | Provides credit balance data to children (included in SaaSOSProvider) |
| `WhenCreditsAvailable`, `WhenCreditsExhausted`, `WhenCreditsLow`    | Credit gate components                                                |
| `CreditBalance`, `CreditActionsProvider`                            | Credit display and action components (render-prop pattern)            |

### Currency, pricing variant & quota utilities

| Category             | Exports                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Currency**         | `CURRENCY_DISPLAY`, `CURRENCY_FLAG`, `PLAN_CURRENCY_CODES`, `PLAN_CURRENCY_OPTIONS`, `getCurrencySymbol`, `getCurrencyFlag`, `formatCents`, `formatOverageRate`, `formatOverageRateWithLabel`, `formatQuotaIncludedOverage`, `getQuotaUnitLabelFromName`                                                                  |
| **Pricing variants** | `getPricingVariant`, `getBasePriceCents`, `getStripePriceIdForInterval`, `getQuotaOverageCents`, `getQuotaDisplayWithVariant`, `getAvailableCurrenciesFromPlans`, `getDisplayCurrency`, `getBillingIntervalAndCurrencyFromPriceId`; types: `IPricingVariant`, `PlanVersionWithPricingVariants`, `QuotaDisplayWithOverage` |
| **Quota**            | `getQuotaDisplayValue`, `formatQuotaWithPrice`; types: `QuotaDisplayValue`, `FormatQuotaWithPriceOptions`. Plan types use `IQuotaByInterval`, `IQuotaIntervalValue` for per-interval quotas.                                                                                                                              |

Get OS config from `useSaaSOs()` and instantiate API classes when you need low-level access; otherwise prefer the high-level hooks (`useSaaSWorkspaces`, `useUserAttributes`, `useSaaSSettings`, etc.):

```tsx
import { useSaaSOs } from '@buildbase/sdk/react';
import { UserApi, WorkspaceApi, SettingsApi } from '@buildbase/sdk';

const os = useSaaSOs();
const workspaceApi = new WorkspaceApi({
  serverUrl: os.serverUrl,
  version: os.version,
  orgId: os.orgId,
});
// Similarly: new UserApi({ ... }), new SettingsApi({ ... })
```

### Hooks

Prefer these SDK hooks for state and operations instead of `useAppSelector`:

| Hook                        | Purpose                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSaaSAuth()`             | Auth state (user, session, status), signIn(returnUrl?), signOut, openWorkspaceSettings                                                                                                                                                                                    |
| `useSaaSWorkspaces()`       | Workspaces, currentWorkspace, loading, switching/switchingToId, CRUD and switch actions                                                                                                                                                                                   |
| `useSaaSOs()`               | OS config (serverUrl, version, orgId, auth, settings) when you need the full config object                                                                                                                                                                                |
| `useSaaSSettings()`         | Organization settings and getSettings (prefer this when you only need settings)                                                                                                                                                                                           |
| `useUserAttributes()`       | User attributes and update/refresh                                                                                                                                                                                                                                        |
| `useUserFeatures()`         | User feature flags                                                                                                                                                                                                                                                        |
| `useSubscriptionContext()`  | Subscription for current workspace (response, loading, refetch); use inside SubscriptionContextProvider                                                                                                                                                                   |
| `useTrialStatus()`          | Trial state: `isTrialing`, `daysRemaining`, `trialEndsAt`, `isTrialEnding`                                                                                                                                                                                                |
| `usePushNotifications()`    | Push notification state and actions: `isSubscribed`, `subscribe()`, `unsubscribe()`                                                                                                                                                                                       |
| Subscription hooks          | `usePublicPlans`, `useSubscription`, `useSubscriptionManagement`, `usePlanGroup`, `usePlanGroupVersions`, `usePublicPlanGroupVersion`, `useCreateCheckoutSession`, `useUpdateSubscription`, `useCancelSubscription`, `useResumeSubscription`, `useInvoices`, `useInvoice` |
| `useQuotaUsageContext()`    | Quota usage for current workspace (quotas, loading, refetch); use inside QuotaUsageContextProvider                                                                                                                                                                        |
| Quota usage hooks           | `useRecordUsage`, `useQuotaUsageStatus`, `useAllQuotaUsage`, `useUsageLogs`                                                                                                                                                                                               |
| `useCreditBalanceContext()` | Credit balance for current workspace (balance, loading, refetch); use inside CreditBalanceContextProvider                                                                                                                                                                 |
| Credit hooks                | `useCreditBalance`, `useConsumeCredits`, `usePublicCreditPackages`                                                                                                                                                                                                        |
| Invalidation helpers        | `invalidateSubscription()`, `invalidateQuotaUsage()`, `invalidateCreditBalance()` — trigger context refetch after server-side mutations                                                                                                                                   |

Using hooks keeps your code stable if internal state shape changes and avoids direct Redux/context coupling.

### Enums

- `ApiVersion` - API version enum (currently only `V1`)
- `AuthStatus` - Auth status enum: `loading` \| `redirecting` \| `authenticating` \| `authenticated` \| `unauthenticated`. Use with `useSaaSAuth().status`; `isLoading`, `isAuthenticated`, and `isRedirecting` are derived from it.

### Types

All TypeScript types are exported for type safety. See the [TypeScript definitions](./dist/index.d.ts) for complete type information.

### Further documentation

- [Architecture](docs/ARCHITECTURE.md) – Layers, providers, APIs (BaseApi, UserApi, WorkspaceApi, SettingsApi), state, auth flow
- [Error codes](docs/ERROR_CODES.md) – SDK error codes and HTTP status mappings

## ⚙️ Configuration Reference

### SaaSOSProvider Props

| Prop                      | Type                       | Required | Description                                                                               |
| ------------------------- | -------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `serverUrl`               | `string`                   | ✅       | API server URL (must be valid URL)                                                        |
| `version`                 | `ApiVersion`               | ✅       | API version (currently only `'v1'`)                                                       |
| `orgId`                   | `string`                   | ✅       | Organization ID (must be valid MongoDB ObjectId - 24 hex characters)                      |
| `auth`                    | `IAuthConfig`              | ❌       | Authentication configuration                                                              |
| `locale`                  | `SDKLocale`                | ❌       | SDK UI language (`'en'`, `'es'`, `'fr'`, `'de'`, `'ja'`, `'zh'`, `'hi'`, `'ar'`)          |
| `defaultPermissions`      | `Record<string, string[]>` | ❌       | Default app permissions per role                                                          |
| `getCheckoutStripeParams` | `GetCheckoutStripeParams`  | ❌       | Async callback called before every Stripe checkout to return metadata, referral IDs, etc. |
| `children`                | `ReactNode`                | ✅       | React children                                                                            |

### Auth Configuration

```tsx
interface IAuthConfig {
  clientId: string; // OAuth client ID
  redirectUrl: string; // OAuth redirect URL
  callbacks: {
    // Required: restore session on page refresh (reads httpOnly cookie via server endpoint)
    getSession: () => Promise<string | null>;
    // Required: exchange OAuth code for sessionId (sets httpOnly cookie on server)
    handleAuthentication: (code: string) => Promise<{ sessionId: string }>;
    // Required: clear session on sign out (clears httpOnly cookie on server)
    onSignOut: () => Promise<void>;
    // Optional: called when session is missing, expired, or invalid
    onSessionExpired?: (reason: 'missing' | 'expired' | 'invalid') => void;
    // Optional: listen to SDK events
    handleEvent?: (eventType: EventType, data: EventData) => void | Promise<void>;
    // Optional: called before workspace switch
    onWorkspaceChange?: (params: OnWorkspaceChangeParams) => Promise<void>;
  };
}

interface OnWorkspaceChangeParams {
  workspace: IWorkspace;
  user: AuthUser | null;
  role: string | null;
}
```

**Session flow** (same pattern as next-auth):

- Session token is stored in an **httpOnly cookie** (set by your server, not readable by JS)
- On page refresh, the SDK calls `getSession()` once to restore the session
- Session data (user info) lives **in-memory only** (React context) — no localStorage

### Validation Requirements

- **serverUrl**: Must be a valid URL (e.g., `https://api.example.com`)
- **version**: Must be exactly `'v1'` (only supported version)
- **orgId**: Must be a valid MongoDB ObjectId (24 hexadecimal characters, e.g., `507f1f77bcf86cd799439011`)

### BetaForm Props

| Prop                 | Type                      | Default                          | Description                             |
| -------------------- | ------------------------- | -------------------------------- | --------------------------------------- |
| `onSuccess`          | `() => void`              | -                                | Callback when form submits successfully |
| `onError`            | `(error: string) => void` | -                                | Callback when form submission fails     |
| `className`          | `string`                  | `'w-full'`                       | CSS class for form container            |
| `fieldClassName`     | `string`                  | `'flex flex-col gap-1.5 w-full'` | CSS class for form fields               |
| `autoFocus`          | `boolean`                 | `true`                           | Auto-focus name field                   |
| `showSuccessMessage` | `boolean`                 | `true`                           | Show success message after submit       |
| `hideLogo`           | `boolean`                 | `false`                          | Hide logo                               |
| `hideTitles`         | `boolean`                 | `false`                          | Hide titles                             |

> **Note:** The form language is inherited from the `SaaSOSProvider` locale setting. Supported locales: en, es, fr, de, ja, zh, hi, ar.

## 🎯 Common Patterns

### Pattern 1: Protected Routes

```tsx
import { WhenAuthenticated, WhenUnauthenticated } from '@buildbase/sdk/react';

function App() {
  return (
    <WhenUnauthenticated>
      <LoginPage />
    </WhenUnauthenticated>

    <WhenAuthenticated>
      <ProtectedRoutes />
    </WhenAuthenticated>
  );
}

function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
```

### Pattern 2: Role-Based Navigation

```tsx
import { WhenRoles } from '@buildbase/sdk/react';

function Navigation() {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/projects">Projects</Link>

      <WhenRoles roles={['admin', 'owner']}>
        <Link to="/admin">Admin Panel</Link>
      </WhenRoles>

      <WhenRoles roles={['admin']}>
        <Link to="/settings">Settings</Link>
      </WhenRoles>
    </nav>
  );
}
```

### Pattern 3: Workspace Context Provider

```tsx
import { useSaaSWorkspaces } from '@buildbase/sdk/react';
import { createContext, useContext } from 'react';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const workspaceData = useSaaSWorkspaces();

  return <WorkspaceContext.Provider value={workspaceData}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
```

### Pattern 4: Feature Gated Components

```tsx
import { WhenWorkspaceFeatureEnabled } from '@buildbase/sdk/react';

function Dashboard() {
  return (
    <div>
      <StandardFeatures />

      <WhenWorkspaceFeatureEnabled slug="advanced-analytics">
        <AdvancedAnalytics />
      </WhenWorkspaceFeatureEnabled>

      <WhenWorkspaceFeatureEnabled slug="ai-assistant">
        <AIAssistant />
      </WhenWorkspaceFeatureEnabled>
    </div>
  );
}
```

### Pattern 4b: Subscription-Gated UI

```tsx
import {
  WhenSubscription,
  WhenNoSubscription,
  WhenSubscriptionToPlans,
} from '@buildbase/sdk/react';

function BillingPage() {
  return (
    <div>
      <WhenNoSubscription>
        <UpgradePrompt />
      </WhenNoSubscription>

      <WhenSubscription>
        <BillingSettings />
      </WhenSubscription>

      <WhenSubscriptionToPlans plans={['pro', 'enterprise']}>
        <AdvancedBillingFeatures />
      </WhenSubscriptionToPlans>
    </div>
  );
}
```

SubscriptionContextProvider is included in SaaSOSProvider by default, so no extra wrapper is needed.

### Pattern 4c: Quota-Gated UI

```tsx
import { WhenQuotaAvailable, WhenQuotaExhausted, WhenQuotaThreshold } from '@buildbase/sdk/react';

function FeatureWithQuota() {
  return (
    <div>
      <WhenQuotaThreshold slug="api_calls" threshold={80}>
        <WarningBanner message="You're running low on API calls" />
      </WhenQuotaThreshold>

      <WhenQuotaAvailable slug="api_calls" fallbackComponent={<UpgradePrompt />}>
        <ApiCallButton />
      </WhenQuotaAvailable>

      <WhenQuotaExhausted slug="api_calls">
        <p>
          No API calls remaining. <a href="/billing">Upgrade your plan</a>
        </p>
      </WhenQuotaExhausted>
    </div>
  );
}
```

QuotaUsageContextProvider is included in SaaSOSProvider by default, so no extra wrapper is needed. Quota data auto-refreshes after `useRecordUsage` calls.

### Pattern 5: Handling Workspace Changes

```tsx
import { useSaaSWorkspaces } from '@buildbase/sdk/react';
import { useEffect } from 'react';

function App() {
  const { currentWorkspace, switching } = useSaaSWorkspaces();

  useEffect(() => {
    if (currentWorkspace) {
      // Update your app state when workspace changes
      console.log('Workspace changed:', currentWorkspace);
      // Reload data, update context, etc.
    }
  }, [currentWorkspace]);

  // Show loading during switch; use switchingToId for the workspace ID being switched to
  if (switching) return <LoadingOverlay />;

  return <YourApp />;
}
```

For token generation or prep before switching, configure `onWorkspaceChange` in auth callbacks (see Quick Start)—it receives `{ workspace, user, role }`.

### Pattern 6: Error Boundary

Wrap your app (or a subtree) with an error boundary to catch React errors and show a fallback. Use your framework’s boundary (e.g. React’s `ErrorBoundary` or Next.js error UI). In catch blocks for async operations, show user feedback (e.g. toast or inline message) using the `error` state from hooks.

## 🔧 Troubleshooting

### Common Issues

#### 1. "Invalid orgId" Error

**Problem**: `orgId` must be a valid MongoDB ObjectId (24 hexadecimal characters).

**Solution**:

```tsx
// ❌ Wrong
orgId = '123';

// ✅ Correct
orgId = '507f1f77bcf86cd799439011'; // 24 hex characters
```

#### 2. "Invalid serverUrl" Error

**Problem**: `serverUrl` must be a valid URL.

**Solution**:

```tsx
// ❌ Wrong
serverUrl = 'api.example.com';
serverUrl = 'not-a-url';

// ✅ Correct
serverUrl = 'https://api.example.com';
serverUrl = 'http://localhost:3000';
```

#### 3. Authentication Not Working

**Problem**: User can't sign in or session not persisting.

**Solutions**:

- Ensure `handleAuthentication` callback returns `{ sessionId: string }`
- Check that your backend API is correctly exchanging the OAuth code
- Verify `redirectUrl` matches your OAuth app configuration
- Check browser console for error messages

```tsx
// ✅ Correct callback
handleAuthentication: async (code: string) => {
  const response = await fetch('/api/auth/token', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  return { sessionId: data.sessionId }; // Must return sessionId
};
```

#### 4. Workspace Not Loading

**Problem**: Workspaces array is empty or not updating.

**Solutions**:

- Ensure user is authenticated before fetching workspaces
- Call `fetchWorkspaces()` explicitly if needed
- Check network tab for API errors
- Verify user has access to workspaces

```tsx
const { fetchWorkspaces, workspaces } = useSaaSWorkspaces();

useEffect(() => {
  if (isAuthenticated) {
    fetchWorkspaces(); // Explicitly fetch if needed
  }
}, [isAuthenticated]);
```

#### 5. Feature Flags Not Working

**Problem**: Feature flags always return false or undefined.

**Solutions**:

- Ensure `getFeatures()` is called (usually automatic)
- Check that feature slugs match your backend configuration
- Verify workspace has the feature enabled
- Check user has the feature enabled (for user-level features)

```tsx
const { getFeatures, currentWorkspace } = useSaaSWorkspaces();

useEffect(() => {
  getFeatures(); // Ensure features are loaded
}, []);
```

#### 6. TypeScript Errors

**Problem**: Type errors when using the SDK.

**Solutions**:

- Ensure you're using React 19+ (check peer dependencies)
- Import types explicitly if needed:

  ```tsx
  import type { IWorkspace, IUser } from '@buildbase/sdk';
  ```

- Check that all required props are provided

#### 7. CSS Not Loading

**Problem**: Components look unstyled.

**Solution**: Ensure CSS is imported:

```tsx
import '@buildbase/sdk/css';
```

### FAQ

**Q: Can I use this with Next.js?**  
A: Yes! Just ensure you use `'use client'` directive in components using SDK hooks.

**Q: Can I use this with other React frameworks?**  
A: Yes, as long as you're using React 19+.

**Q: How do I customize the workspace switcher UI?**  
A: Use the `trigger` render prop to fully customize the UI.

**Q: Can I use multiple workspaces simultaneously?**  
A: No, the SDK manages one current workspace at a time. Use `switchToWorkspace()` (runs `onWorkspaceChange` first) or `setCurrentWorkspace()` (direct set, bypasses callback).

**Q: How do I handle offline scenarios?**  
A: The session token is stored in an httpOnly cookie (set by your server). On page refresh, the SDK calls your `getSession` callback to restore it. Handle offline scenarios in your `handleAuthentication` and `getSession` callbacks.

**Q: Can I use this without TypeScript?**  
A: Yes, but TypeScript is recommended for better developer experience.

## 💡 Best Practices

### 1. Provider Setup

✅ **Do**: Wrap your entire app with `SaaSOSProvider` at the root level.

```tsx
// ✅ Good
function App() {
  return (
    <SaaSOSProvider {...config}>
      <YourApp />
    </SaaSOSProvider>
  );
}
```

❌ **Don't**: Nest providers or use multiple instances.

```tsx
// ❌ Bad
<SaaSOSProvider>
  <SaaSOSProvider>
    {' '}
    {/* Don't nest */}
    <App />
  </SaaSOSProvider>
</SaaSOSProvider>
```

### 2. Error Handling

✅ **Do**: Wrap your app with an error boundary (your framework’s or React’s) to catch render errors.

✅ **Do**: Handle async failures using the `error` from hooks and show user feedback (e.g. toast or inline message).

### 3. State Access: Prefer SDK Hooks Over useAppSelector

✅ **Do**: Use SDK hooks for auth, workspace, and OS state.

```tsx
// ✅ Good – use hooks
const { user, isAuthenticated } = useSaaSAuth();
const { workspaces, currentWorkspace, switchingToId } = useSaaSWorkspaces();
const { settings } = useSaaSSettings();
const os = useSaaSOs(); // when you need full OS config (serverUrl, version, orgId, etc.)
```

❌ **Don't**: Use `useAppSelector(state => state.auth)` or similar in app code—prefer the hooks above so the SDK can evolve internal state without breaking you.

### 4. Workspace Management

✅ **Do**: Use `useSaaSWorkspaces` hook for workspace operations.

```tsx
// ✅ Good
const { currentWorkspace, switchToWorkspace, switching, switchingToId } = useSaaSWorkspaces();
// switchToWorkspace: runs onWorkspaceChange first (token gen, etc.)
// switching: true when switch is in progress; switchingToId: workspace ID being switched to
```

✅ **Do**: Configure `onWorkspaceChange` in auth callbacks for token generation—receives `{ workspace, user, role }`.

❌ **Don't**: Manually manage workspace state.

```tsx
// ❌ Bad
const [workspace, setWorkspace] = useState(null); // Don't do this
```

### 5. Feature Flags

✅ **Do**: Use feature flag components for conditional rendering.

```tsx
// ✅ Good
<WhenWorkspaceFeatureEnabled slug="feature">
  <FeatureComponent />
</WhenWorkspaceFeatureEnabled>
```

✅ **Do**: Check features programmatically when needed.

```tsx
// ✅ Good
const { isFeatureEnabled } = useUserFeatures();
if (isFeatureEnabled('premium')) {
  // Do something
}
```

### 6. Authentication

✅ **Do**: Use `WhenAuthenticated`/`WhenUnauthenticated` for route protection.

```tsx
// ✅ Good
<WhenAuthenticated>
  <ProtectedRoute />
</WhenAuthenticated>
```

✅ **Do**: Handle authentication errors gracefully.

```tsx
// ✅ Good
const { signIn, status } = useSaaSAuth();
<button onClick={() => signIn()} disabled={status === 'loading'}>
  {status === 'loading' ? 'Signing in...' : 'Sign In'}
</button>;
```

### 7. Event Handling

✅ **Do**: Handle events in your provider configuration. Use `onWorkspaceChange` for prep before switch (e.g. generate token), and `handleEvent` for post-switch notifications.

```tsx
// ✅ Good
<SaaSOSProvider
  auth={{
    callbacks: {
      onWorkspaceChange: async ({ workspace, user, role }) => {
        await generateTokenForWorkspace(workspace._id, user?.id, role);
      },
      handleEvent: async (eventType, data) => {
        if (eventType === 'workspace:changed') {
          // Workspace already switched; update app state
        }
      },
    },
  }}
>
```

### 8. TypeScript

✅ **Do**: Use TypeScript for better type safety.

```tsx
// ✅ Good
import type { IWorkspace, IUser } from '@buildbase/sdk';

function MyComponent({ workspace }: { workspace: IWorkspace }) {
  // Type-safe code
}
```

### 9. Performance

✅ **Do**: Memoize expensive computations.

```tsx
// ✅ Good
const filteredWorkspaces = useMemo(() => workspaces.filter(w => w.active), [workspaces]);
```

✅ **Do**: Use `refreshWorkspaces()` for background updates instead of `fetchWorkspaces()`.

```tsx
// ✅ Good - doesn't block UI
refreshWorkspaces();

// Use fetchWorkspaces() only when you need to wait for the result
await fetchWorkspaces();
```

## Server-Side Usage

The SDK also works on the server — API routes, background jobs, webhooks, cron tasks. Zero React dependency.

```text
@buildbase/sdk        Server: BuildBase() factory, API classes, types, utilities
@buildbase/sdk/react  Client: React hooks, providers, gate components (documented above)
```

### Setup (Next.js)

Configure once, use everywhere. Same pattern as Auth.js.

```ts
// lib/buildbase.ts
import BuildBase from '@buildbase/sdk';
import { cookies } from 'next/headers';

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
  getSessionId: async () => {
    const c = await cookies();
    return c.get('bb-session-id')?.value ?? null;
  },
});
```

Use in API routes — session is resolved automatically:

```ts
// app/api/workspace/route.ts
import { auth, workspace, subscription } from '@/lib/buildbase';

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaces = await workspace.list();
  return Response.json({ workspaces });
}
```

### Setup (Express)

No `getSessionId` callback — use `withSession()` per-request instead.

```ts
// buildbase.ts
import BuildBase from '@buildbase/sdk';

const bb = BuildBase({
  serverUrl: process.env.BUILDBASE_URL!,
  orgId: process.env.BUILDBASE_ORG_ID!,
});

export const { withSession, plans } = bb;
```

```ts
// routes
app.get('/workspaces', async (req, res) => {
  const { workspace } = withSession(req.headers['x-session-id']);
  res.json(await workspace.list());
});

app.post('/usage', async (req, res) => {
  const { usage } = withSession(req.headers['x-session-id']);
  const result = await usage.record(req.body.workspaceId, {
    quotaSlug: 'api-calls',
    quantity: 1,
  });
  res.json(result);
});
```

### Background Jobs / Webhooks

For service accounts (no user session), use `withSession()` with a service token:

```ts
import { withSession } from '@/lib/buildbase';

const bb = withSession(process.env.SERVICE_SESSION_ID!);

// Record usage from a webhook
await bb.usage.record(workspaceId, {
  quotaSlug: 'uploads',
  quantity: 1,
  source: 'webhook:file.processed',
});

// Check subscription
const sub = await bb.subscription.get(workspaceId);
```

### Server-Side Actions Reference

| Module         | Methods                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `workspace`    | `list`, `get`, `create`, `update`, `delete`                                                                             |
| `users`        | `list`, `invite`, `remove`, `updateRole`, `getProfile`, `updateProfile`                                                 |
| `subscription` | `get`, `checkout`, `update`, `cancel`, `resume`, `getBillingPortalUrl`                                                  |
| `plans`        | `getGroup`, `getVersions`, `getPublic`, `getVersion`                                                                    |
| `invoices`     | `list`, `get`                                                                                                           |
| `usage`        | `record`, `recordBatch`, `getQuota`, `getAll`, `getLogs`                                                                |
| `credits`      | `getBalance`, `consume`, `purchase`, `getPackages`, `getTransactions`, `getExpiring`, `getBuckets`, `getPublicPackages` |
| `settings`     | `get`                                                                                                                   |
| `features`     | `list`, `update`                                                                                                        |
| `notification` | `send(workspaceId, event, userId?, data?)`                                                                              |
| `permissions`  | `check(workspaceId, userId, permission)`, `resolve(workspaceId, userId)`                                                |

### BuildBase Config Options

```ts
BuildBase({
  serverUrl: '...',           // Required
  orgId: '...',               // Required
  getSessionId: async () => ..., // Session resolver (Next.js: read cookie)
  timeout: 30_000,            // Request timeout in ms (default: 30s)
  maxRetries: 2,              // Retry on network errors / 5xx
  debug: true,                // Log all API calls to console
  headers: { 'X-Source': 'cron' }, // Custom headers on every request
  onError: (err, ctx) => {    // Centralized error callback
    Sentry.captureException(err, { extra: ctx })
  },
  fetch: customFetch,         // Replace global fetch (testing, proxying)
})
```

## Webhook Verification

BuildBase signs every outbound webhook with HMAC-SHA256 over `<timestamp>.<rawBody>`. Verify it before trusting the payload. **Runtime-agnostic** — the HMAC is a dependency-free pure-JS implementation, so it behaves identically under Node (CJS or ESM), edge runtimes (Cloudflare Workers, Vercel Edge), Deno, Bun, and bundlers. No Node `crypto` required.

Always verify against the **raw** request body — parse only after verification succeeds.

```ts
import { parseWebhookEvent, verifyWebhookSignature } from '@buildbase/sdk';

// One-step: verify + parse (returns null when invalid)
app.post('/webhooks/buildbase', (req, res) => {
  const event = parseWebhookEvent({
    body: req.rawBody, // raw string, NOT the JSON-parsed object
    signature: req.headers['x-buildbase-signature'], // "sha256=<hex>"
    timestamp: req.headers['x-buildbase-timestamp'],
    secret: process.env.BUILDBASE_WEBHOOK_SECRET!,
  });

  if (!event) return res.status(401).json({ error: 'Invalid webhook' });

  switch (event.event) {
    case 'subscription.created':
      // event.data.subscription ...
      break;
    case 'workspace.member_added':
      // event.data.targetUser ...
      break;
  }
  res.json({ received: true });
});
```

`verifyWebhookSignature(options)` → `boolean` — use directly when you want to control parsing yourself.

| Option          | Type                | Notes                                                      |
| --------------- | ------------------- | ---------------------------------------------------------- |
| `body`          | `string`            | Raw request body, byte-for-byte as sent.                   |
| `signature`     | `string \| null`    | `x-buildbase-signature` header (`sha256=<hex>`).           |
| `timestamp`     | `string \| null`    | `x-buildbase-timestamp` header.                            |
| `secret`        | `string`            | Your endpoint's signing secret.                            |
| `maxAgeSeconds` | `number` (def. 300) | Replay window. Set to `0` to skip the timestamp age check. |

> **Next.js App Router:** read the raw body with `await req.text()` — do not use `req.json()`, which discards the exact bytes the signature was computed over.

## Agent Readiness (Discovery)

> **Full guide:** [`docs/MCP-AND-AGENT-READINESS.md`](docs/MCP-AND-AGENT-READINESS.md) covers the whole surface — the fast path, the auth model, and the scope/resource customization spectrum. This section is the overview.

Make a consuming app [agent ready](https://isitagentready.com) by serving the machine-readable discovery documents an AI client looks for — Agent Card, A2A card, OAuth metadata (RFC 8414/9728), Agent Skills, API Catalog (RFC 9727), MCP Server Card (SEP-1649 v1.0) + discovery manifest (SEP-1960), `robots.txt` with AI-bot rules + Content Signals, `sitemap.xml`, `security.txt`, `llms.txt`/`llms-full.txt`, and `auth.md`. Framework-agnostic and zero React: every function returns a plain `DiscoveryDocument` (`{ status, contentType, body, cacheControl, vary? }`).

The fast path is [`createAgentStack`](docs/MCP-AND-AGENT-READINESS.md#fast-path--createagentstack) — one config derives the MCP handler **and** the whole discovery surface. To wire the discovery layer on its own, use `resolveAgentPath`:

```ts
// lib/agent-ready.ts
import { resolveAgentPath, type AgentReadyConfig } from '@buildbase/sdk';

export const agentConfig: AgentReadyConfig = {
  serverUrl: process.env.BUILDBASE_URL!,
  orgId: process.env.BUILDBASE_ORG_ID!,
  siteUrl: 'https://imejis.io',
  site: { name: 'Imejis', description: 'Generate images from templates via API.' },
  // Discovery content is YOURS — defined here in code, not in the platform:
  scopes: [
    { name: 'designs:read', description: 'View designs' },
    { name: 'render:execute', description: 'Render images' },
  ],
  llmsTxt: '# Imejis\n\n> Generate images from templates via API.',
  robots: { contentSignals: { search: true, aiInput: true, aiTrain: false } },
  sitemap: { urls: ['/', '/pricing'] }, // omit if you already generate sitemaps
  protectedResources: [{ resource: 'https://imejis.io/mcp' }], // scopes inherited from catalog
  // skills, security, apiCatalog, mcpServerCard, a2aCard, extraPaths — all optional
};

export async function serveAgentPath(req: Request): Promise<Response> {
  const doc = await resolveAgentPath(new URL(req.url).pathname, agentConfig);
  if (!doc) return new Response('{"error":"not_found"}', { status: 404 });
  return new Response(doc.body, {
    status: doc.status,
    headers: {
      'Content-Type': doc.contentType,
      'Cache-Control': doc.cacheControl,
      ...(doc.vary ? { Vary: doc.vary } : {}),
    },
  });
}
```

`resolveAgentPath` resolves the app's **entire agent-readiness surface**: the root-level documents (`/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/auth.md`, `/security.txt`) plus everything under `/.well-known/*` — `agent.json`, `oauth-protected-resource` (+ per-resource paths), the full RFC 8414 `oauth-authorization-server` metadata (proxied fail-soft from the platform), the Agent Skills index + `SKILL.md`, `security.txt`, the API Catalog, and the MCP Server Card. Wire it once:

```ts
// app/.well-known/[...path]/route.ts  (Next.js App Router)
import { serveAgentPath } from '@/lib/agent-ready';
export const GET = serveAgentPath;

// plus identical two-liners at app/robots.txt/route.ts, app/llms.txt/route.ts,
// app/auth.md/route.ts, app/security.txt/route.ts, app/sitemap.xml/route.ts
```

```ts
// Express — one middleware covers everything
app.use(async (req, res, next) => {
  const doc = await resolveAgentPath(req.path, agentConfig);
  if (!doc) return next();
  res
    .status(doc.status)
    .setHeader('Content-Type', doc.contentType)
    .setHeader('Cache-Control', doc.cacheControl)
    .send(doc.body);
});
```

(`resolveWellKnown` remains available for `.well-known`-only wiring; `resolveAgentPath` is a superset.)

`fetchAgentReadiness` is **fail-soft** — any network/HTTP/parse error resolves to `{ enabled: false }`, so a discovery route never 500s and never leaks that the platform is down; agents simply see the app as not (yet) agent-ready. Results are cached in-memory for `cacheTtlSeconds` (default 300s); call `clearAgentReadinessCache()` to reset (mainly for tests).

### robots.txt, Content Signals & AI bots

`buildRobotsTxt(config)` always returns a document. By default it emits an allow-all policy plus an explicit `Allow: /` group for every known AI crawler (`AI_BOT_USER_AGENTS`: GPTBot, ClaudeBot, PerplexityBot, …) so readiness checkers see AI bots addressed. Tune it via `config.robots`:

- `policies` — your base groups (default `[{ userAgent: '*', allow: ['/'] }]`)
- `aiBots` — `'allow'` (default) | `'deny'` | explicit `RobotsPolicy[]` for per-bot control
- `contentSignals` — [Content Signals](https://contentsignals.org): `{ search, aiInput, aiTrain }` → `Content-Signal: search=yes, ai-input=yes, ai-train=no`
- `sitemaps` — `Sitemap:` lines (defaults to `${siteUrl}/sitemap.xml` when `config.sitemap` is set)

### Markdown content negotiation & Link headers

- `wantsMarkdown(acceptHeader)` — q-value-aware predicate: does this request prefer `text/markdown` over HTML? Use it in middleware to rewrite content pages to a markdown endpoint.
- `negotiateMarkdown(acceptHeader, { html, markdown })` — picks the variant and returns a `DiscoveryDocument` with `vary: 'Accept'`.
- `buildDiscoveryLinkHeader(config)` — the `Link` response header value advertising `llms.txt`, the Agent Card, and (when configured) sitemap, API catalog, and MCP server card. Sync and pure — safe in edge middleware.

### Who owns what

Clean split, no duplication: **your app owns discovery content, the platform owns auth.** You define `llms.txt`, `robots.txt`, `sitemap`, `protectedResources` (RFC 9728), the API catalog, and skills right here in `AgentReadyConfig` — the SDK serves them from your own origin with no platform round-trip. The platform only supplies the pointer to its OAuth **authorization server** (the one thing it owns); that's the sole content of `fetchAgentReadiness`'s bundle (`{ enabled, authorizationServer }`).

- **`/llms.txt`** — from `config.llmsTxt`. Returns null when unset (serve your own static file instead).
- **`/.well-known/oauth-protected-resource`** — built from `config.protectedResources`; `authorization_servers` is derived from `serverUrl`/`orgId`.
- **`/auth.md`** — agent registration/auth instructions. Generated from the OAuth metadata, or serves `config.authMd` verbatim.
- **WebMCP** — expose in-page actions to browser agents. In a client component, call `provideWebMcpTools([{ name, description, inputSchema, execute }])` (no-op off-browser).

### isitagentready.com coverage

| Check                                                      | Covered by                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| robots.txt + AI bot rules + Content Signals                | `buildRobotsTxt`                                                           |
| Sitemap                                                    | `buildSitemap` (or your own generator)                                     |
| Link response headers                                      | `buildDiscoveryLinkHeader`                                                 |
| Markdown content negotiation                               | `wantsMarkdown` / `negotiateMarkdown`                                      |
| llms.txt                                                   | `buildLlmsTxt`                                                             |
| MCP Server Card + live MCP server                          | `buildMcpServerCard` + [`@buildbase/sdk/mcp`](#mcp-server-buildbasesdkmcp) |
| Agent Skills / API Catalog                                 | `buildAgentSkillsIndex` / `buildApiCatalog`                                |
| A2A Agent Card                                             | `buildA2AAgentCard` (served by default from `site` + `skills`)             |
| OAuth discovery (RFC 8414) + protected resource (RFC 9728) | `resolveAgentPath` (platform-backed)                                       |
| Web Bot Auth                                               | `buildWebBotAuthDirectory` (opt-in — publish your JWKS)                    |
| DNS-AID                                                    | `buildDnsAidRecords` (returns records — publish at your DNS provider)      |
| Commerce (x402/ACP/UCP/MPP), openapi.json                  | `config.extraPaths` (serve any literal document by path)                   |

**Functions:** `resolveAgentPath`, `resolveWellKnown`, `fetchAgentReadiness`, `clearAgentReadinessCache`, `buildAgentCard`, `buildA2AAgentCard`, `buildProtectedResourceMetadata`, `buildAgentSkillsIndex`, `buildSkillMd`, `buildSecurityTxt`, `buildLlmsTxt`, `buildLlmsFullTxt`, `buildRobotsTxt`, `buildSitemap`, `buildApiCatalog`, `buildMcpServerCard`, `buildMcpDiscoveryManifest`, `buildAuthMd`, `buildWebBotAuthDirectory`, `buildDnsAidRecords`, `buildDiscoveryLinkHeader`, `wantsMarkdown`, `negotiateMarkdown`, `provideWebMcpTools`, `sha256Digest`. **Constants:** `AI_BOT_USER_AGENTS`. **Types:** `AgentReadyConfig`, `AgentReadinessBundle`, `AgentSkill`, `AppScope`, `ApiCatalogApi`, `A2ACardConfig`, `A2ACardSkill`, `DnsAidRecord`, `McpServerCard`, `RobotsConfig`, `RobotsPolicy`, `ContentSignals`, `SitemapUrl`, `WebMcpTool`, `DiscoveryDocument`.

## MCP Server (`@buildbase/sdk/mcp`)

> **Full guide:** [`docs/MCP-AND-AGENT-READINESS.md`](docs/MCP-AND-AGENT-READINESS.md).

Turn your app into a **live MCP server** so AI agents can operate it: the built-in tools expose your BuildBase state (workspaces, subscription, quotas, credits, feature flags, permissions) and you add your own product tools with zod schemas. Stateless Streamable HTTP (MCP 2025-06-18) — pure functions plus a Web-standard `Request`/`Response` adapter, so it runs on Node 18+, edge, Deno, and Bun. Server-only, zero React; split from the core entry because it uses `zod` at runtime.

The fast path bundles the server + the whole discovery surface from one config:

```ts
// lib/agent.ts
import { createAgentStack, defineMcpTool } from '@buildbase/sdk/mcp';
import { z } from 'zod';

export const agent = createAgentStack({
  serverUrl: process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL!,
  orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID!,
  siteUrl: 'https://imejis.io',
  site: { name: 'Imejis', description: 'Generate images from templates via API.' },
  secret: process.env.SYSTEM_SECRET!, // derives buildbaseAuth (verify + aud + sid decrypt)
  scopes: [{ name: 'render:execute', description: 'Render images' }],
  mcp: {
    builtinTools: 'readonly',
    tools: [
      defineMcpTool({
        name: 'generate_image',
        description: 'Render an image from a template',
        inputSchema: z.object({ templateId: z.string(), data: z.record(z.string(), z.any()) }),
        requiredScopes: ['render:execute'],
        execute: async (input, { bb, workspaceId }) => {
          await bb.usage.record(workspaceId!, { quotaSlug: 'images', quantity: 1 });
          return renderTemplate(input.templateId, input.data);
        },
      }),
    ],
  },
});

// app/api/mcp/route.ts
export const { GET, POST, DELETE, OPTIONS } = agent.routes;
```

Prefer the primitives (own token format, unified web+agent auth)? Wire `createMcpHandler` + `buildbaseAuth` directly — `buildbaseAuth` does the full verify (HS256, RFC 8707 audience binding, `sid` decrypt) so you never hand-roll it:

```ts
// lib/mcp.ts
import BuildBase from '@buildbase/sdk';
import { createMcpHandler, defineMcpTool, buildbaseAuth } from '@buildbase/sdk/mcp';

const buildbase = BuildBase({
  serverUrl: process.env.BUILDBASE_URL!,
  orgId: process.env.BUILDBASE_ORG_ID!,
});

export const mcp = createMcpHandler({
  buildbase,
  serverInfo: { name: 'imejis', version: '1.0.0' },
  auth: buildbaseAuth({
    secret: process.env.SYSTEM_SECRET!,
    resource: ['https://imejis.io/mcp', 'https://imejis.io/api/mcp'],
    requireAudience: true,
  }),
  builtinTools: 'readonly',
  tools: [
    /* defineMcpTool(...) */
  ],
});
```

```ts
// Express / Fastify / Node — the pure form
app.post('/mcp', async (req, res) => {
  const r = await mcp.handle({ method: req.method, headers: req.headers, body: req.body });
  res.status(r.status).set(r.headers).send(r.body);
});
```

> **Copy-paste recipes for every framework** — Next.js (App + Pages Router), Express, Fastify, Hono, Bun, Deno, Cloudflare Workers, and React/SPA (WebMCP) — plus the per-framework mint route and a production checklist: [`docs/MCP-AND-AGENT-READINESS.md`](docs/MCP-AND-AGENT-READINESS.md#framework-recipes). Two adapters cover them all: `mcp.fetch(Request)` (web standard — App Router, Hono, Bun, Deno, edge) and `mcp.handle({method,headers,body})` (pure — Express, Fastify, Pages Router).

Advertise it via the server card so agents find the endpoint (the stack sets this automatically):

```ts
export const agentConfig: AgentReadyConfig = {
  // ...
  mcpServerCard: mcp.serverCard({ endpoint: 'https://imejis.io/api/mcp' }),
};
```

### Built-in tools

The built-ins cover the **full BuildBase surface**. By default (`builtinTools: 'readonly'`) only the read tools are exposed — **least privilege**: no agent can mutate, bill, or delete anything until you opt in. Set `'all'` to add the writes and destructive/billing ops. Every call still runs under the user's session, so the platform enforces the user's real permissions on top of whatever you expose — an agent can never exceed what the user can do.

- **Read** (`builtinTools: 'readonly'` for just these): `list_workspaces`, `get_workspace`, `get_user_profile`, `list_workspace_users`, `get_subscription`, `get_plans`, `get_plan_versions`, `get_public_plans`, `get_plan_version`, `list_invoices`, `get_invoice`, `get_quota_usage`, `get_all_quota_usage`, `get_usage_logs`, `get_credit_balance`, `list_credit_transactions`, `get_credit_packages`, `get_credit_buckets`, `get_expiring_credits`, `get_public_credit_packages`, `check_feature_flag`, `check_permission`, `resolve_permissions`, `get_settings`.
- **Write / destructive**: `record_usage`, `record_usage_batch`, `consume_credits`, `send_notification`, `create_workspace`, `update_workspace`, `delete_workspace`, `invite_workspace_user`, `remove_workspace_user`, `update_workspace_user_role`, `update_user_profile`, `update_feature_flag`, `create_subscription_checkout`, `update_subscription`, `cancel_subscription`, `resume_subscription`, `get_billing_portal_url`, `purchase_credits`.

**You choose how much to expose** — the default is safe, and you widen it:

```ts
builtinTools: 'readonly'; // default — reads only (least privilege)
builtinTools: 'all'; // reads + writes + destructive/billing ops
builtinTools: false; // none (custom tools only)
builtinTools: {
  include: ['get_quota_usage', 'record_usage'];
} // exactly these
builtinTools: {
  exclude: ['delete_workspace', 'purchase_credits'];
} // all reads, minus these (an `include` list can be trimmed the same way)
```

The agent acts as an authenticated app user — it knows your app, not BuildBase — so the built-ins carry **no BuildBase-specific scope requirement**. Workspace-scoped tools take an optional `workspaceId` and fall back to the one pinned on the verified token (`McpAuthInfo.workspaceId`); pin it and cross-workspace access is refused even for tools you exposed.

Want per-scope gating on top? Set `requiredScopes` on your own custom tools and return the granted `scopes` from `auth.verify` — the handler hides a tool from `tools/list` (and refuses the call) when its `requiredScopes` aren't all granted. A token that carries **no** scopes sees only tools that require none (the built-ins), so a token minted without a `scope` claim can never unlock a scoped tool. Opt-in, using **your** scope names — the SDK never imposes its own.

### Production hardening

The handler ships with safe defaults; these are the knobs to review before going live:

- **`builtinTools` defaults to `'readonly'`.** Writes and destructive/billing ops are opt-in. Prefer an explicit `{ include: [...] }` allowlist over `'all'` in production.
- **Request-body cap.** Bodies over `maxRequestBytes` (default **1 MiB**) are rejected with 413 before parsing — and, on the `fetch` adapter, before the stream is even read (via `Content-Length`). Set `0` to disable.
- **Rate limiting.** The server is stateless and keeps no counters. Supply a `rateLimit(auth, req)` gate — called after auth, before dispatch — backed by your own store (KV/Redis/edge limiter), returning `false` or `{ ok: false, retryAfter }` to answer 429. A failing limiter fails **closed**. Also put platform/edge rate limiting in front of the endpoint.
- **Origin allowlist.** Set `allowedOrigins` for DNS-rebinding protection; browser-origin requests with a non-matching `Origin` get 403 (server-to-server requests with no `Origin` still pass).
- **Token expiry.** `verifyClientJwt` **requires a numeric `exp` by default** — a token with no expiry never expires. `signClientJwt` always stamps one. Pin `issuer`/`audience` too for defense in depth: `verifyClientJwt(token, secret, { issuer, audience })`.
- **Error visibility.** Pass `onError` — it fires for auth-callback, rate-limit, context-factory, tool-execution, and schema-conversion failures.

```ts
export const mcp = createMcpHandler({
  buildbase,
  auth: { verify, resourceMetadataUrl },
  builtinTools: { include: ['get_quota_usage', 'record_usage'] },
  allowedOrigins: ['https://app.imejis.io'],
  maxRequestBytes: 512 * 1024,
  rateLimit: async auth => ({ ok: await limiter.allow(auth?.userId), retryAfter: 30 }),
  onError: (err, ctx) => logger.error({ err, ...ctx }, 'mcp error'),
});
```

### Your tools, your rules — no lock-in

The SDK accelerates; it never gates. Everything BuildBase-specific is optional:

- **Standalone mode** — omit `buildbase` entirely and ship an MCP server with only your own tools (built-ins are simply off). Nothing in the protocol layer depends on the BuildBase platform.
- **Your own context** — the `context` factory runs once per call and its return value reaches every tool as `ctx.custom`: your Prisma client, your services, whatever your tools need. Type it with the second generic of `defineMcpTool`.

  ```ts
  type AppCtx = { db: PrismaClient };

  const mcp = createMcpHandler({
    auth: { verify: verifyMyToken }, // any token format — yours
    context: (): AppCtx => ({ db: prisma }),
    tools: [
      defineMcpTool<z.ZodType, AppCtx>({
        name: 'search_orders',
        description: 'Search orders in our own database',
        inputSchema: z.object({ query: z.string() }),
        execute: (input, ctx) =>
          ctx.custom.db.order.findMany({ where: { name: { contains: input.query } } }),
      }),
    ],
  });
  ```

- **Override built-ins** — a custom tool named like a built-in (e.g. your own `get_subscription`) replaces it; your definition wins.
- **Raw JSON Schema** — tools don't have to use zod; pass a plain JSON Schema object as `inputSchema` and receive arguments as-is.
- **Composable transport** — `handle()` is a pure `{method, headers, body} → {status, headers, body}` function. Route around it, wrap it, or serve extra JSON-RPC methods yourself before delegating; you own the endpoint.
- **Browser side** — `provideWebMcpTools` (core entry) registers any in-page tools with WebMCP-capable browsers, unrelated to BuildBase state.

### Auth in one line of plumbing

The OAuth2 app-bridge flow mints your app's Bearer tokens (see [OAuth2 App Bridge](#oauth2-app-bridge)). Use the presets and neither the mint nor the verify is hand-rolled — the per-user BuildBase session rides as an **encrypted `sid`** claim (JWTs are signed, not encrypted), never stored, expiring with the token:

```ts
// mint (applicationTokenUrl) — HS256 with your secret, aud from the grant, encrypted sid
import { mintAgentToken } from '@buildbase/sdk';
mintToken: (claims) => mintAgentToken({ claims, secret: process.env.SYSTEM_SECRET! }),

// verify (MCP server) — HS256 + RFC 8707 audience + sid decrypt → McpAuthInfo
import { buildbaseAuth } from '@buildbase/sdk/mcp';
auth: buildbaseAuth({ secret: process.env.SYSTEM_SECRET!, resource: 'https://imejis.io/mcp' }),
```

Bringing your own token format? `auth.verify(token, req) → McpAuthInfo` accepts any Bearer token; set `auth.resourceMetadataUrl` so 401s carry the RFC 9728 challenge. Set `auth: false` to disable auth (local dev only). Debug audience mismatches with `MCP_AUTH_DEBUG=1`. Test with the MCP Inspector: `npx @modelcontextprotocol/inspector --cli http://localhost:3000/api/mcp --transport http --header "Authorization: Bearer <token>" --method tools/list`.

**Exports:** `createAgentStack`, `createMcpHandler`, `defineMcpTool`, `builtinMcpTools`, `selectBuiltinTools`, `buildbaseAuth`, `mintAgentToken`, `createSessionRefCrypto`, plus re-exported auth helpers (`signClientJwt`, `verifyClientJwt`, `extractBearerToken`, `bearerChallenge`, `AppBridgeError`). **Types:** `AgentStack`, `AgentStackConfig`, `CreateMcpHandlerConfig`, `McpHandler`, `McpToolDefinition`, `McpToolContext`, `McpAuthInfo`, `McpHttpRequest`, `McpHttpResponse`, `McpToolAnnotations`, `McpBuildBaseClient`, `BuiltinMcpToolName`, `BuildBaseAuthOptions`, `MintAgentTokenOptions`, `SessionRefCrypto`, `McpServerCard`, `ScopedActions`.

### Scopes & resources — restrict or open up

Scopes and resources are **app-owned** — the shared BuildBase authorization server stays scope/resource-agnostic. Scopes have three levers: **declare** a catalog (`scopes: [{ name, description }]` → `scopes_supported` in your own RFC 9728 protected-resource metadata), **gate per tool** (`requiredScopes` on a custom tool → hidden/refused unless the token carries them), and the **floor** (every tool runs under the user's BuildBase session, so the platform enforces the user's real permissions — an agent never exceeds the user). Resources have two: **declare** `protectedResources` (RFC 9728) and **bind** the token audience via `buildbaseAuth({ resource, requireAudience })` (RFC 8707) — the audience check at your resource is the whole gate. Built-ins are restricted with `builtinTools`, not scopes. Public clients (Claude Desktop, Cursor, Inspector) self-register with PKCE and no secret. Full model: [the guide](docs/MCP-AND-AGENT-READINESS.md#scopes--resources-restrict-or-open-up).

## OAuth2 App Bridge

BuildBase runs the full OAuth2 authorization flow (login, consent, code, PKCE, refresh rotation) but never mints the access token itself — on the token grant it calls **your** backend to mint the token the agent will carry. It makes signed webhook-style calls to two endpoints your OAuth2 client registers:

- `applicationTokenUrl` — mint an access token for a user (**required**)
- `applicationRevokeUrl` — invalidate a user's token on revocation (optional)

Both requests carry `Authorization: Bearer <JWT>`, an HS256 JWT signed with your client secret. This toolkit verifies those requests (timing-safe, no `alg` confusion) and shapes the exact response body the platform expects, so you write only the part that's yours: minting/invalidating a token in your own format.

> For the common case, `mintToken: (claims) => mintAgentToken({ claims, secret })` is the preset — it signs HS256 with your secret, binds `aud` to the granted RFC 8707 resource, and embeds the encrypted `sid`. The examples below show the hand-rolled equivalent, for apps that mint their own token format (e.g. one shared with their web sessions). See [the guide](docs/MCP-AND-AGENT-READINESS.md#auth-minting--verifying-the-token).

```ts
// applicationTokenUrl handler (Next.js Pages Router)
import { handleAppTokenRequest } from '@buildbase/sdk';

export default async function handler(req, res) {
  const { status, body } = await handleAppTokenRequest({
    authorization: req.headers.authorization,
    clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,
    mintToken: user => ({
      token: signMyAccessToken(user, { aud: user.resource }), // your token, your format
      expiresIn: 3600,
    }),
  });
  res.status(status).json(body); // 401 + failure body when verification fails
}
```

```ts
// applicationRevokeUrl handler
import { handleAppRevokeRequest } from '@buildbase/sdk';

export default async function handler(req, res) {
  const { status, body } = await handleAppRevokeRequest({
    authorization: req.headers.authorization,
    clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,
    onRevoke: async ({ userId, clientId, reason }) => {
      await revokeMyTokensFor(userId, clientId);
    },
  });
  res.status(status).json(body);
}
```

When an agent calls your protected API without a valid token, reply with an RFC 9728 / RFC 6750 challenge that points it at your protected-resource metadata, bootstrapping OAuth discovery:

```ts
import { bearerChallenge } from '@buildbase/sdk';

const c = bearerChallenge({
  resourceMetadataUrl: 'https://imejis.io/.well-known/oauth-protected-resource',
  error: 'invalid_token',
});
res.writeHead(c.status, c.headers).end(c.body);
```

### Serving multiple clients

Each integration (an AI agent, Zapier, n8n, …) is its own BuildBase OAuth2 client with its own id/secret, but they can all share one set of endpoints: BuildBase sends the caller's `clientId` as a query param, so verify each request with the secret that matches it.

```ts
const SECRETS: Record<string, string> = {
  [process.env.AGENT_CLIENT_ID!]: process.env.AGENT_CLIENT_SECRET!,
  [process.env.ZAPIER_CLIENT_ID!]: process.env.ZAPIER_CLIENT_SECRET!,
};

const clientSecret = SECRETS[String(req.query.clientId)];
if (!clientSecret) {
  return res.status(401).json({ success: false, token: '', message: 'unknown_client' });
}
const { status, body } = await handleAppTokenRequest({
  authorization: req.headers.authorization,
  clientSecret,
  mintToken,
});
```

Adding a new integration is then just: register it in BuildBase, point its `applicationTokenUrl` at the same endpoint, and add its `id → secret` to the map. Selecting the secret by `clientId` is safe — the `clientId` is public and only _picks_ the key; the HS256 signature check is still the real gate.

### `applicationProfileUrl` (userinfo)

If your client also registers an `applicationProfileUrl`, treat it as a userinfo / token-validation endpoint: validate the access token **you** minted (with your own verifier — _not_ the client secret) and return the profile.

```ts
import { extractBearerToken } from '@buildbase/sdk';

const token = extractBearerToken(req.headers.authorization);
const claims = verifyMyAccessToken(token); // your token, your key
if (!claims) return res.status(401).json({ error: 'invalid_token' });
return res.json({ id: claims.id, email: claims.email /* … */ });
```

The one-call handlers cover the common path; the underlying pieces are exported for custom flows: `verifyAppTokenRequest` / `verifyAppRevokeRequest` (verify → claims), `verifyClientJwt`, `extractBearerToken`, and the response builders `appTokenSuccess` / `appTokenFailure`. Verification throws `AppBridgeError` (with a machine-readable `code` like `invalid_signature`, `token_expired`, `invalid_algorithm`). HMAC verification uses the SDK's dependency-free pure-JS HMAC-SHA256, so it behaves identically under ESM, CJS, a bundler, or bare Node.

**Presets** (also on the core entry): `mintAgentToken` (the whole mint — HS256 + `aud` + encrypted `sid`), `buildbaseAuth` (the whole verify), `createSessionRefCrypto` (the `sid` AES-256-GCM crypto). The platform relays the minted token but never sees your secret — it can neither forge nor decode your tokens.

**Exports:** `handleAppTokenRequest`, `handleAppRevokeRequest`, `verifyAppTokenRequest`, `verifyAppRevokeRequest`, `verifyClientJwt`, `signClientJwt`, `extractBearerToken`, `bearerChallenge`, `appTokenSuccess`, `appTokenFailure`, `mintAgentToken`, `buildbaseAuth`, `createSessionRefCrypto`, `AppBridgeError`. **Types:** `AppTokenRequestClaims`, `AppRevokeRequestClaims`, `AppTokenResult`, `AppTokenResponseBody`, `HandlerResult`, `VerifyClientJwtOptions`, `BuildBaseAuthOptions`, `MintAgentTokenOptions`, `SessionRefCrypto`.

## 🚀 Publishing a Release

> **Requires:** repo admin access on GitHub. Only admins can push `v*` tags — the tag push triggers the full CI → npm publish → GitHub Release pipeline automatically.

### Step-by-step

**1. Make sure `main` is in the state you want to release**

All changes must be merged to `main` via PR before tagging.

**2. Bump the version in `package.json`**

```bash
# Patch release (0.0.47 → 0.0.48) — bug fixes
npm version patch

# Minor release (0.0.47 → 0.1.0) — new features, backward-compatible
npm version minor

# Major release (0.0.47 → 1.0.0) — breaking changes
npm version major
```

`npm version` automatically updates `package.json`, commits the change, and creates a local git tag (`v0.0.48`).

**3. Push the commit to `main`**

```bash
git push origin main
```

**4. Push the tag — this triggers the release pipeline**

```bash
git push origin v0.0.48   # use the tag npm version created
```

### What happens automatically

Once the tag is pushed, GitHub Actions runs three jobs in sequence:

```
Build  ──→  Publish to npm  ──→  Create GitHub Release
```

| Job | What it does |
|-----|-------------|
| **Build** | Installs deps, builds all bundles, verifies server bundle has no React and React bundle has `"use client"` directive, uploads dist artifact |
| **Publish to npm** | Downloads verified artifact, publishes `@buildbase/sdk` to npm with SLSA provenance attestation |
| **Create GitHub Release** | Creates a GitHub Release with changelog notes and dist zip attached — only runs if npm publish succeeded |

If npm publish fails, the GitHub Release is **not** created. Fix the issue and re-push the same tag after deleting it:

```bash
git tag -d v0.0.48              # delete local tag
git push origin :refs/tags/v0.0.48  # delete remote tag
# fix the issue, then:
git tag v0.0.48
git push origin v0.0.48
```

### Beta releases

To publish a pre-release version without affecting the `latest` tag on npm:

```bash
# Bump to a prerelease version
npm version prerelease --preid=beta   # e.g. 0.0.48-beta.0

# Push commit + tag
git push origin main
git push origin v0.0.48-beta.0
```

> **Note:** The current workflow publishes with `--access public` (no `--tag beta`). To publish a true npm beta tag, update the `npm publish` command in `.github/workflows/main.yml` to include `--tag beta` for prerelease versions.

### Tag naming convention

Always use the `v` prefix followed by semver:

```
v1.0.0    ✅
v0.1.0    ✅
v0.0.48   ✅
1.0.0     ❌  (no v prefix — won't trigger the workflow)
```

## 🤝 Contributing

We welcome bug fixes, documentation improvements, and feature contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, branch guidelines, commit style, and how to report bugs.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: [support@buildbase.app](mailto:support@buildbase.app)
- 📖 Documentation: [BuildBase Docs](https://docs.buildbase.app/)

## 🔗 Links

- **Homepage**: [BuildBase](https://www.buildbase.app/)
- **NPM Package**: [@buildbase/sdk](https://www.npmjs.com/package/@buildbase/sdk)

---

Made with ❤️ by the BuildBase team
