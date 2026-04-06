# @buildbase/sdk

A React SDK for [BuildBase](https://www.buildbase.app/) that provides essential components to build SaaS applications faster. Skip the plumbing and focus on your core product with built-in authentication, workspace management, and user management.

## 📑 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Authentication](#-authentication)
- [Role-Based Access Control](#-role-based-access-control)
- [Feature Flags](#️-feature-flags)
- [Subscription Gates](#-subscription-gates)
- [Trial Gates](#-trial-gates)
- [Push Notifications](#-push-notifications)
- [User Management](#-user-management)
- [Workspace Management](#-complete-workspace-management)
- [Public Pricing (No Login)](#-public-pricing-no-login)
- [Multi-Currency & Pricing Utilities](#-multi-currency--pricing-utilities)
- [Quota Usage Tracking](#-quota-usage-tracking)
- [Quota Gates](#-quota-gates)
- [Beta Form Component](#-beta-form-component)
- [Event System](#-event-system)
- [Error Handling](#️-error-handling)
- [Settings](#️-settings)
- [Configuration Reference](#️-configuration-reference)
- [Common Patterns](#-common-patterns)
- [Troubleshooting](#-troubleshooting)
- [API Reference](#-api-reference)
- [Best Practices](#-best-practices)
- [Documentation](#further-documentation)

## 🚀 Features

- **🔐 Authentication System** - Complete auth flow with sign-in/sign-out
- **🏢 Workspace Management** - Multi-workspace support with switching capabilities
- **👥 Role-Based Access Control** - User roles and workspace-specific permissions
- **🎯 Feature Flags** - Workspace-level and user-level feature toggles
- **📋 Subscription Gates** - Show or hide UI based on current workspace subscription (plan)
- **⏳ Trial Gates** - `WhenTrialing`, `WhenNotTrialing`, `WhenTrialEnding` components + `useTrialStatus` hook
- **🔔 Push Notifications** - Browser push notifications with `usePushNotifications` hook, auto-triggers for billing events, and campaign management
- **💺 Seat-Based Pricing** - Per-seat billing with included seats, billable seat tracking, and seat limit enforcement
- **💱 Multi-Currency** - Per-currency pricing variants with workspace billing currency lock
- **📊 Quota Usage Tracking** - Record and monitor metered usage (API calls, storage, etc.) with real-time status
- **📈 Usage Dashboard** - Built-in workspace settings page showing quota consumption, overage billing breakdowns, and billing period info
- **👤 User Management** - User attributes and feature flags management
- **📝 Beta Form** - Pre-built signup/waitlist form component
- **📡 Event System** - Subscribe to user and workspace events
- **🛡️ Error Handling** - Centralized error handling with error boundaries

## 📦 Installation

```bash
npm install @buildbase/sdk
```

### Peer Dependencies

This package requires React 19 and React DOM 19:

```bash
npm install react@^19.0.0 react-dom@^19.0.0
```

## 🏗️ Quick Start

### 1. Import CSS

First, import the required CSS file in your app:

```tsx
import '@buildbase/sdk/dist/saas-os.css';
```

### 2. Create Client Provider

Create a client-side provider component:

```tsx
'use client';

import { SaaSOSProvider } from '@buildbase/sdk';
import React from 'react';

export default function SaaSProvider(props: { children: React.ReactNode }) {
  return (
    <SaaSOSProvider
      serverUrl="https://your-api-server.com"
      version="v1"
      orgId="your-org-id"
      auth={{
        clientId: 'your-client-id',
        redirectUrl: 'http://localhost:3000',
        callbacks: {
          handleAuthentication: async (code: string) => {
            // Exchange OAuth code for session ID
            const response = await fetch('/api/auth/token', {
              method: 'POST',
              body: JSON.stringify({ code }),
            });
            const data = await response.json();
            // Return sessionId - SDK will use this for authenticated requests
            return { sessionId: data.sessionId };
          },
          onSignOut: async () => {
            // Clean up any custom tokens/storage on sign out
            localStorage.removeItem('custom_token');
          },
          handleEvent: async (eventType, data) => {
            // Handle SDK events (user created, workspace changed, etc.)
            console.log('SDK Event:', eventType, data);
          },
          onWorkspaceChange: async ({ workspace, user, role }) => {
            // Called before switching workspace (e.g. generate token). Used on "Switch to" and page refresh/restore.
            // Switch proceeds only when this resolves; reject to abort.
            console.log('Switching to workspace:', workspace.name, 'as', role);
          },
        },
      }}
    >
      {props.children}
    </SaaSOSProvider>
  );
}
```

### 3. Wrap Your App

Use the provider in your app layout:

```tsx
import SaaSProvider from './components/SaaSProvider';

function App() {
  return (
    <SaaSProvider>
      <YourAppContent />
    </SaaSProvider>
  );
}

export default App;
```

### 4. Workspace Management

The WorkspaceSwitcher component uses a render prop pattern, giving you full control over the UI. Configure `onWorkspaceChange` in `auth.callbacks` (SaaSOSProvider) to handle workspace switches—used when clicking "Switch to" and when restoring from storage on page refresh. The callback receives `{ workspace, user, role }` so you don't need to look up the user's role:

```tsx
import React from 'react';
import { WorkspaceSwitcher } from '@buildbase/sdk';

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

## 🔐 Authentication

### Authentication Hook

Use the `useSaaSAuth` hook to manage authentication state and actions:

```tsx
import { useSaaSAuth } from '@buildbase/sdk';

function AuthExample() {
  const { user, isAuthenticated, signIn, signOut, status } = useSaaSAuth();

  return (
    <div>
      {!isAuthenticated ? (
        <div>
          <h1>Welcome! Please sign in</h1>
          <button onClick={signIn} disabled={status === 'loading'}>
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
  signIn, // Function: initiates sign-in flow
  signOut, // Function: signs out the user
  openWorkspaceSettings, // Function: opens workspace settings dialog to a specific section
} = useSaaSAuth();
```

#### Workspace Settings Sections

Open the workspace settings dialog to a specific section:

```tsx
openWorkspaceSettings('profile');      // Account profile
openWorkspaceSettings('general');      // Workspace name, icon
openWorkspaceSettings('users');        // Workspace members
openWorkspaceSettings('subscription'); // Plan & Billing
openWorkspaceSettings('usage');        // Quota usage dashboard
openWorkspaceSettings('features');     // Feature toggles
openWorkspaceSettings('danger');       // Delete workspace (owner only)
```

### Authentication Components

For declarative rendering, use the conditional components:

```tsx
import { WhenAuthenticated, WhenUnauthenticated } from '@buildbase/sdk';

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

## 👥 Role-Based Access Control

### Role Components

Control access based on user roles:

```tsx
import { WhenRoles, WhenWorkspaceRoles } from '@buildbase/sdk';

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
} from '@buildbase/sdk';

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
import { useUserFeatures } from '@buildbase/sdk';

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
import { WhenSubscription, WhenNoSubscription, WhenSubscriptionToPlans } from '@buildbase/sdk';

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
import { useSubscriptionContext } from '@buildbase/sdk';

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

**When subscription refetches**

- When the current workspace changes (automatic).
- When subscription is updated via SDK (e.g. `useUpdateSubscription`, cancel, resume) — refetch is triggered automatically.
- When you call `refetch()` (e.g. after redirect from checkout).

## ⏳ Trial Gates

Control UI based on trial state. Works with Stripe-native trials (both card-required and no-card).

### Trial Gate Components

```tsx
import { WhenTrialing, WhenNotTrialing, WhenTrialEnding } from '@buildbase/sdk';

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

| Component         | Renders when                                             |
| ----------------- | -------------------------------------------------------- |
| `WhenTrialing`    | Subscription status is `trialing`                        |
| `WhenNotTrialing` | Subscription status is NOT `trialing`                    |
| `WhenTrialEnding` | Trialing AND trial ends within `daysThreshold` days (default 3) |

All trial gates support `loadingComponent` and `fallbackComponent` props.

### useTrialStatus

Hook that computes trial information from the subscription context:

```tsx
import { useTrialStatus } from '@buildbase/sdk';

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

| Property        | Type           | Description                                      |
| --------------- | -------------- | ------------------------------------------------ |
| `isTrialing`    | `boolean`      | Whether subscription is in trial                 |
| `daysRemaining` | `number`       | Days left in trial (0 if not trialing or expired) |
| `trialEndsAt`   | `Date \| null` | Trial end date                                   |
| `trialStartedAt`| `Date \| null` | Trial start date                                 |
| `isTrialEnding` | `boolean`      | True when 3 or fewer days remaining              |

## 🔔 Push Notifications

Browser push notifications — built into the SDK. Users can enable/disable from the **Notifications** tab in workspace settings. Billing events (payment failed, trial ending) auto-send push notifications.

**Only setup required:** Create `public/push-sw.js` in your app:

```js
self.addEventListener('push', function(event) {
  if (!event.data) return;
  try {
    var payload = event.data.json();
    event.waitUntil(self.registration.showNotification(payload.title || 'Notification', {
      body: payload.body || '',
      icon: payload.icon || undefined,
      badge: payload.icon || undefined,
      data: { url: payload.url, ...(payload.data || {}) },
    }));
  } catch (e) { console.error('[PushSW]', e); }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url;
  if (url) {
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) { if (list[i].url === url && 'focus' in list[i]) return list[i].focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    }));
  }
});
```

Everything else is built-in — permission handling, subscribe/unsubscribe, settings UI, billing auto-triggers, and browser-specific unblock instructions.

## 👤 User Management

### User Attributes

Manage custom user attributes (key-value pairs):

```tsx
import { useUserAttributes } from '@buildbase/sdk';

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
import { useSaaSWorkspaces } from '@buildbase/sdk';

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
import { usePublicPlans } from '@buildbase/sdk';

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
import { PricingPage } from '@buildbase/sdk';

function PublicPricingPage() {
  return (
    <PricingPage slug="main-pricing">
      {({ loading, error, items, plans, refetch }) => {
        if (loading) return <Loading />;
        if (error) return <Error message={error} />;

        return (
          <div>
            {plans.map(plan => (
              <PlanCard key={plan._id} plan={plan} items={items} />
            ))}
          </div>
        );
      }}
    </PricingPage>
  );
}
```

| Prop              | Type                           | Description                                                       |
| ----------------- | ------------------------------ | ----------------------------------------------------------------- |
| `slug`            | `string`                       | Plan group slug (e.g. 'main-pricing', 'enterprise')               |
| `children`        | `(details) => ReactNode`       | Render prop receiving `{ loading, error, items, plans, refetch }` |
| `loadingFallback` | `ReactNode`                    | Custom loading UI (defaults to skeleton)                          |
| `errorFallback`   | `(error: string) => ReactNode` | Custom error UI                                                   |

**Response shape**: `items` = subscription item definitions (features, limits, quotas with category); `plans` = plan versions with `pricing`, `quotas`, `features`, `limits`.

**Backend requirement**: `GET /api/v1/public/{orgId}/plans/{groupSlug}` must be implemented and allow unauthenticated access.

## 💱 Multi-Currency & Pricing Utilities

Plans support **pricing variants** (multi-currency). Use these utilities for display and lookup.

### Currency utilities

| Export | Purpose |
|--------|--------|
| `CURRENCY_DISPLAY` | Map of currency code → symbol (e.g. `usd` → `$`) |
| `CURRENCY_FLAG` | Map of currency code → flag emoji |
| `PLAN_CURRENCY_CODES` | Allowed billing currency codes (for dropdowns/validation) |
| `PLAN_CURRENCY_OPTIONS` | Options array for plan currency selects |
| `getCurrencySymbol(currency)` | Symbol for a Stripe currency code |
| `getCurrencyFlag(currency)` | Flag emoji for a currency code |
| `formatCents(cents, currency)` | Format cents as localized price string |
| `formatOverageRate(cents, currency)` | Format overage rate for display |
| `formatOverageRateWithLabel(...)` | Overage rate with optional unit label |
| `formatQuotaIncludedOverage(...)` | "X included, then $Y / unit" style text |
| `getQuotaUnitLabelFromName(name)` | Human-readable unit label from quota name |

### Pricing variant utilities

| Export | Purpose |
|--------|--------|
| `getPricingVariant(planVersion, currency)` | Get variant for a currency, or `null` |
| `getBasePriceCents(planVersion, currency, interval)` | Base price in cents for currency/interval |
| `getStripePriceIdForInterval(planVersion, currency, interval)` | Stripe price ID for checkout |
| `getQuotaOverageCents(planVersion, currency, quotaSlug, interval)` | Overage cents for a quota |
| `getQuotaDisplayWithVariant(planVersion, currency, quotaSlug, interval)` | Display value with overage for a variant |
| `getAvailableCurrenciesFromPlans(plans)` | Unique currency codes across plan versions |
| `getDisplayCurrency(planVersion, currency)` | Display currency (variant exists ? currency : plan.currency) |
| `getBillingIntervalAndCurrencyFromPriceId(planVersions, priceId)` | Resolve price ID to interval + currency |

Types: `IPricingVariant`, `PlanVersionWithPricingVariants`, `QuotaDisplayWithOverage`.

### Quota utilities

| Export | Purpose |
|--------|--------|
| `getQuotaDisplayValue(quotaByInterval, interval?)` | Normalize `IQuotaByInterval` to `{ included, overage?, unitSize? }` |
| `formatQuotaWithPrice(value, unitName, options?)` | Format as "X included, then $Y.YY / unit" |

Types: `QuotaDisplayValue`, `FormatQuotaWithPriceOptions`. Plan/subscription types use `IQuotaByInterval` and `IQuotaIntervalValue` for per-interval quotas and overages.

```tsx
import {
  getCurrencySymbol,
  formatCents,
  getPricingVariant,
  getBasePriceCents,
  getQuotaDisplayValue,
  formatQuotaWithPrice,
} from '@buildbase/sdk';

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

| Scenario | Where to record | Why |
|----------|----------------|-----|
| User clicks "Send Email" button | Client-side (SDK hook) | User-initiated, immediate UI feedback needed |
| API request hits your backend | Server-side (REST API) | Backend controls the resource, more secure |
| Background job processes data | Server-side (REST API) | No browser context available |
| File upload completes | Either | Depends on where validation happens |

As a general rule: **record usage where the resource is consumed**. If your backend processes the work, record from the backend. If it's a client-side action, record from the client.

---

### Client-Side (React SDK)

Use the SDK hooks inside your React app. Quota gate components (see [Quota Gates](#-quota-gates)) automatically refresh after recording.

#### Record Usage

```tsx
import { useRecordUsage, useSaaSWorkspaces } from '@buildbase/sdk';

function SendEmailButton() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { recordUsage, loading, error } = useRecordUsage(currentWorkspace?._id);

  const handleSend = async () => {
    try {
      const result = await recordUsage({
        quotaSlug: 'emails',
        quantity: 1,
        source: 'web-app',           // optional: track where usage came from
        idempotencyKey: 'email-abc',  // optional: prevent duplicate recordings
      });
      console.log(`Used: ${result.consumed}/${result.included}, Available: ${result.available}`);
      if (result.overage > 0) {
        console.warn(`Overage: ${result.overage} units`);
      }
    } catch (err) {
      console.error('Failed to record usage:', err);
    }
  };

  return <button onClick={handleSend} disabled={loading}>Send Email</button>;
}
```

#### Check Single Quota Status

```tsx
import { useQuotaUsageStatus, useSaaSWorkspaces } from '@buildbase/sdk';

function QuotaStatusBar({ quotaSlug }: { quotaSlug: string }) {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { status, loading, refetch } = useQuotaUsageStatus(currentWorkspace?._id, quotaSlug);

  if (loading) return <Spinner />;
  if (!status) return null;

  const usagePercent = Math.round((status.consumed / status.included) * 100);

  return (
    <div>
      <p>{quotaSlug}: {status.consumed} / {status.included} ({usagePercent}%)</p>
      <p>Available: {status.available}</p>
      {status.hasOverage && <p>Overage: {status.overage} units</p>}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

#### Check All Quotas

```tsx
import { useAllQuotaUsage, useSaaSWorkspaces } from '@buildbase/sdk';

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
import { useUsageLogs, useSaaSWorkspaces } from '@buildbase/sdk';

function UsageLogsTable() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const {
    logs, totalDocs, totalPages, page, hasNextPage, loading, refetch,
  } = useUsageLogs(
    currentWorkspace?._id,
    'api_calls',                       // optional: filter by quota slug
    { limit: 20, page: 1 }            // optional: pagination and filters
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <table>
        <thead>
          <tr><th>Quota</th><th>Quantity</th><th>Source</th><th>Date</th></tr>
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
      <p>Page {page} of {totalPages} ({totalDocs} total)</p>
    </div>
  );
}
```

**`useUsageLogs` parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspaceId` | `string \| null \| undefined` | Yes | Workspace ID (null/undefined disables fetching) |
| `quotaSlug` | `string` | No | Filter logs by quota slug |
| `options.from` | `string` | No | ISO date string — filter logs from this date |
| `options.to` | `string` | No | ISO date string — filter logs until this date |
| `options.source` | `string` | No | Filter logs by source |
| `options.page` | `number` | No | Page number (default: 1) |
| `options.limit` | `number` | No | Results per page (default: 20) |

#### Client-Side Hooks Summary

| Hook | Purpose |
|------|---------|
| `useRecordUsage(workspaceId)` | Record quota consumption (mutation) |
| `useQuotaUsageStatus(workspaceId, quotaSlug)` | Get single quota status (auto-fetches) |
| `useAllQuotaUsage(workspaceId)` | Get all quotas status (auto-fetches) |
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
      source: 'backend',         // optional: helps distinguish from client-side usage
      metadata: {},              // optional: attach custom data
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
  const response = await fetch(
    `${BASE_URL}/workspaces/${workspaceId}/subscription/usage/all`,
    { headers: { 'x-session-id': SESSION_ID } }
  );
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

#### Server-Side API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/public/token/exchange` | POST | Exchange API token for session ID |
| `/api/v1/public/workspaces/:id/subscription/usage` | POST | Record quota usage |
| `/api/v1/public/workspaces/:id/subscription/usage/status?quotaSlug=X` | GET | Get single quota status |
| `/api/v1/public/workspaces/:id/subscription/usage/all` | GET | Get all quotas status |
| `/api/v1/public/workspaces/:id/subscription/usage/logs` | GET | Get paginated usage logs |

All endpoints (except `/token/exchange`) require the `x-session-id` header.

**Record usage request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quotaSlug` | `string` | Yes | Quota identifier (e.g. `'api_calls'`, `'emails'`, `'storage'`) |
| `quantity` | `number` | Yes | Units to consume (minimum 1) |
| `metadata` | `object` | No | Custom metadata to attach to the usage record |
| `source` | `string` | No | Source identifier (e.g. `'backend'`, `'worker'`, `'cron'`) |
| `idempotencyKey` | `string` | No | Unique key for deduplication |

**Record usage response:**

| Field | Type | Description |
|-------|------|-------------|
| `used` | `number` | Quantity recorded in this request |
| `consumed` | `number` | Total usage in the current billing period |
| `included` | `number` | Total units included in the plan |
| `available` | `number` | Remaining units before overage |
| `overage` | `number` | Units used beyond the included amount |
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
} from '@buildbase/sdk';

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

| Component | Renders children when | Props |
|-----------|----------------------|-------|
| `WhenQuotaAvailable` | Quota has remaining units (`available > 0`) | `slug`, `children`, `loadingComponent?`, `fallbackComponent?` |
| `WhenQuotaExhausted` | Quota is fully consumed (`available <= 0`) | `slug`, `children`, `loadingComponent?`, `fallbackComponent?` |
| `WhenQuotaOverage` | Usage exceeds included amount (`hasOverage`) | `slug`, `children`, `loadingComponent?`, `fallbackComponent?` |
| `WhenQuotaThreshold` | Usage percentage >= threshold | `slug`, `threshold` (0-100), `children`, `loadingComponent?`, `fallbackComponent?` |

All gates must be used inside `QuotaUsageContextProvider` (included in `SaaSOSProvider`). By default they return `null` while loading or when the condition is not met.

### useQuotaUsageContext

Use the hook when you need raw quota data or a manual refetch (e.g. after a bulk operation):

```tsx
import { useQuotaUsageContext } from '@buildbase/sdk';

function QuotaDebug() {
  const { quotas, loading, refetch } = useQuotaUsageContext();

  if (loading) return <Spinner />;
  if (!quotas) return <p>No quota data</p>;

  return (
    <div>
      {Object.entries(quotas).map(([slug, usage]) => (
        <p key={slug}>{slug}: {usage.consumed}/{usage.included}</p>
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

| Property | Type | Description |
|----------|------|-------------|
| `quotas` | `Record<string, IQuotaUsageStatus> \| null` | Current quota usage data keyed by slug |
| `loading` | `boolean` | True while quota data is being fetched |
| `refetch` | `() => Promise<void>` | Manually refetch all quota usage |

**When quota usage refetches:**
- When the current workspace changes (automatic).
- When usage is recorded via `useRecordUsage` — refetch is triggered automatically.
- When you call `refetch()` manually.

## 📝 Beta Form Component

Use the pre-built `BetaForm` component for signup/waitlist forms:

```tsx
import { BetaForm } from '@buildbase/sdk';

function SignupPage() {
  return (
    <BetaForm
      onSuccess={() => console.log('Form submitted!')}
      onError={error => console.error(error)}
      language="en" // Optional: 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko'
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
import { SaaSOSProvider, eventEmitter } from '@buildbase/sdk';

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
import { useSaaSSettings } from '@buildbase/sdk';

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
| `WorkspaceApi`   | Workspaces, subscription, invoices, quota usage, users                            |
| `SettingsApi`    | Organization settings                                                           |

### Components

| Component | Purpose |
| --- | --- |
| `SubscriptionContextProvider` | Provides subscription data to children (included in SaaSOSProvider) |
| `WhenSubscription`, `WhenNoSubscription`, `WhenSubscriptionToPlans` | Subscription gate components |
| `WhenTrialing`, `WhenNotTrialing`, `WhenTrialEnding` | Trial gate components |
| `WhenQuotaAvailable`, `WhenQuotaExhausted`, `WhenQuotaOverage` | Quota gate components |

### Currency, pricing variant & quota utilities

| Category | Exports |
| -------- | ------- |
| **Currency** | `CURRENCY_DISPLAY`, `CURRENCY_FLAG`, `PLAN_CURRENCY_CODES`, `PLAN_CURRENCY_OPTIONS`, `getCurrencySymbol`, `getCurrencyFlag`, `formatCents`, `formatOverageRate`, `formatOverageRateWithLabel`, `formatQuotaIncludedOverage`, `getQuotaUnitLabelFromName` |
| **Pricing variants** | `getPricingVariant`, `getBasePriceCents`, `getStripePriceIdForInterval`, `getQuotaOverageCents`, `getQuotaDisplayWithVariant`, `getAvailableCurrenciesFromPlans`, `getDisplayCurrency`, `getBillingIntervalAndCurrencyFromPriceId`; types: `IPricingVariant`, `PlanVersionWithPricingVariants`, `QuotaDisplayWithOverage` |
| **Quota** | `getQuotaDisplayValue`, `formatQuotaWithPrice`; types: `QuotaDisplayValue`, `FormatQuotaWithPriceOptions`. Plan types use `IQuotaByInterval`, `IQuotaIntervalValue` for per-interval quotas. |

Get OS config from `useSaaSOs()` and instantiate API classes when you need low-level access; otherwise prefer the high-level hooks (`useSaaSWorkspaces`, `useUserAttributes`, `useSaaSSettings`, etc.):

```tsx
import { UserApi, WorkspaceApi, SettingsApi, useSaaSOs } from '@buildbase/sdk';

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

| Hook                       | Purpose                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `useSaaSAuth()`            | Auth state (user, session, status), signIn, signOut, openWorkspaceSettings                              |
| `useSaaSWorkspaces()`      | Workspaces, currentWorkspace, loading, switching/switchingToId, CRUD and switch actions                 |
| `useSaaSOs()`              | OS config (serverUrl, version, orgId, auth, settings) when you need the full config object              |
| `useSaaSSettings()`        | Organization settings and getSettings (prefer this when you only need settings)                         |
| `useUserAttributes()`      | User attributes and update/refresh                                                                      |
| `useUserFeatures()`        | User feature flags                                                                                      |
| `useSubscriptionContext()` | Subscription for current workspace (response, loading, refetch); use inside SubscriptionContextProvider |
| `useTrialStatus()`         | Trial state: `isTrialing`, `daysRemaining`, `trialEndsAt`, `isTrialEnding`                              |
| `usePushNotifications()`   | Push notification state and actions: `isSubscribed`, `subscribe()`, `unsubscribe()`                     |
| Subscription hooks         | `usePublicPlans`, `useSubscription`, `useSubscriptionManagement`, `usePlanGroup`, `usePlanGroupVersions`, `usePublicPlanGroupVersion`, `useCreateCheckoutSession`, `useUpdateSubscription`, `useCancelSubscription`, `useResumeSubscription`, `useInvoices`, `useInvoice` |
| `useQuotaUsageContext()`   | Quota usage for current workspace (quotas, loading, refetch); use inside QuotaUsageContextProvider      |
| Quota usage hooks          | `useRecordUsage`, `useQuotaUsageStatus`, `useAllQuotaUsage`, `useUsageLogs`                             |
| Invalidation helpers       | `invalidateSubscription()`, `invalidateQuotaUsage()` — trigger context refetch after server-side mutations |

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

| Prop        | Type          | Required | Description                                                          |
| ----------- | ------------- | -------- | -------------------------------------------------------------------- |
| `serverUrl` | `string`      | ✅       | API server URL (must be valid URL)                                   |
| `version`   | `ApiVersion`  | ✅       | API version (currently only `'v1'`)                                  |
| `orgId`     | `string`      | ✅       | Organization ID (must be valid MongoDB ObjectId - 24 hex characters) |
| `auth`      | `IAuthConfig` | ❌       | Authentication configuration                                         |
| `children`  | `ReactNode`   | ✅       | React children                                                       |

### Auth Configuration

```tsx
interface IAuthConfig {
  clientId: string; // OAuth client ID
  redirectUrl: string; // OAuth redirect URL
  callbacks?: {
    handleAuthentication: (code: string) => Promise<{ sessionId: string }>;
    onSignOut?: () => Promise<void>;
    handleEvent?: (eventType: EventType, data: EventData) => void | Promise<void>;
    onWorkspaceChange?: (params: OnWorkspaceChangeParams) => Promise<void>;
  };
}

interface OnWorkspaceChangeParams {
  workspace: IWorkspace;
  user: AuthUser | null;
  role: string | null; // User's role in this workspace
}
```

### Validation Requirements

- **serverUrl**: Must be a valid URL (e.g., `https://api.example.com`)
- **version**: Must be exactly `'v1'` (only supported version)
- **orgId**: Must be a valid MongoDB ObjectId (24 hexadecimal characters, e.g., `507f1f77bcf86cd799439011`)

### BetaForm Props

| Prop                     | Type                                                   | Default                          | Description                             |
| ------------------------ | ------------------------------------------------------ | -------------------------------- | --------------------------------------- |
| `onSuccess`              | `() => void`                                           | -                                | Callback when form submits successfully |
| `onError`                | `(error: string) => void`                              | -                                | Callback when form submission fails     |
| `className`              | `string`                                               | `'w-full'`                       | CSS class for form container            |
| `fieldClassName`         | `string`                                               | `'flex flex-col gap-1.5 w-full'` | CSS class for form fields               |
| `language`               | `'en' \| 'es' \| 'fr' \| 'de' \| 'zh' \| 'ja' \| 'ko'` | Auto-detect                      | Form language                           |
| `customTexts`            | `Partial<FormText>`                                    | `{}`                             | Custom text overrides                   |
| `autoFocus`              | `boolean`                                              | `true`                           | Auto-focus name field                   |
| `showSuccessMessage`     | `boolean`                                              | `true`                           | Show success message after submit       |
| `successMessageDuration` | `number`                                               | -                                | Duration to show success message (ms)   |
| `hideLogo`               | `boolean`                                              | `false`                          | Hide logo                               |
| `hideTitles`             | `boolean`                                              | `false`                          | Hide titles                             |

## 🎯 Common Patterns

### Pattern 1: Protected Routes

```tsx
import { WhenAuthenticated, WhenUnauthenticated } from '@buildbase/sdk';

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
import { WhenRoles } from '@buildbase/sdk';

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
import { useSaaSWorkspaces } from '@buildbase/sdk';
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
import { WhenWorkspaceFeatureEnabled } from '@buildbase/sdk';

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
import { WhenSubscription, WhenNoSubscription, WhenSubscriptionToPlans } from '@buildbase/sdk';

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
import { WhenQuotaAvailable, WhenQuotaExhausted, WhenQuotaThreshold } from '@buildbase/sdk';

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
        <p>No API calls remaining. <a href="/billing">Upgrade your plan</a></p>
      </WhenQuotaExhausted>
    </div>
  );
}
```

QuotaUsageContextProvider is included in SaaSOSProvider by default, so no extra wrapper is needed. Quota data auto-refreshes after `useRecordUsage` calls.

### Pattern 5: Handling Workspace Changes

```tsx
import { useSaaSWorkspaces } from '@buildbase/sdk';
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
import '@buildbase/sdk/dist/saas-os.css';
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
A: The SDK stores session data in localStorage. Handle offline scenarios in your `handleAuthentication` callback.

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
<button onClick={signIn} disabled={status === 'loading'}>
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

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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
