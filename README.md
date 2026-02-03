# @buildbase/sdk

A React SDK for [BuildBase](https://www.buildbase.app/) that provides essential components to build SaaS applications faster. Skip the plumbing and focus on your core product with built-in authentication, workspace management, and user management.

## 📑 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Authentication](#-authentication)
- [Role-Based Access Control](#-role-based-access-control)
- [Feature Flags](#️-feature-flags)
- [User Management](#-user-management)
- [Workspace Management](#-complete-workspace-management)
- [Public Pricing (No Login)](#-public-pricing-no-login)
- [Beta Form Component](#-beta-form-component)
- [Event System](#-event-system)
- [Error Handling](#️-error-handling)
- [Settings](#️-settings)
- [Configuration Reference](#️-configuration-reference)
- [Common Patterns](#-common-patterns)
- [Troubleshooting](#-troubleshooting)
- [API Reference](#-api-reference)
- [Best Practices](#-best-practices)

## 🚀 Features

- **🔐 Authentication System** - Complete auth flow with sign-in/sign-out
- **🏢 Workspace Management** - Multi-workspace support with switching capabilities
- **👥 Role-Based Access Control** - User roles and workspace-specific permissions
- **🎯 Feature Flags** - Workspace-level and user-level feature toggles
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
  openWorkspaceSettings, // Function: opens workspace settings dialog
} = useSaaSAuth();
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

The SDK provides comprehensive error handling:

```tsx
import { ErrorBoundary, SDKError, handleError, errorHandler } from '@buildbase/sdk';

// Wrap your app with ErrorBoundary
function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}

// Configure error handler
errorHandler.configure({
  enableConsoleLogging: true,
  showUserNotifications: false,
  onError: (error, context) => {
    // Custom error handling
    console.error('SDK Error:', error, context);
  },
});

// Use handleError in your code
try {
  // Some operation
} catch (error) {
  handleError(error, {
    component: 'MyComponent',
    action: 'handleSubmit',
    metadata: { userId: '123' },
  });
}
```

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

### Hooks

Prefer these SDK hooks for state and operations instead of `useAppSelector`:

| Hook                  | Purpose                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `useSaaSAuth()`       | Auth state (user, session, status), signIn, signOut, openWorkspaceSettings                 |
| `useSaaSWorkspaces()` | Workspaces, currentWorkspace, loading, switching/switchingToId, CRUD and switch actions    |
| `useSaaSOs()`         | OS config (serverUrl, version, orgId, auth, settings) when you need the full config object |
| `useSaaSSettings()`   | Organization settings and getSettings (prefer this when you only need settings)            |
| `useUserAttributes()` | User attributes and update/refresh                                                         |
| `useUserFeatures()`   | User feature flags                                                                         |
| Subscription hooks    | `usePublicPlans`, `useSubscription`, `usePlanGroup`, etc.                                  |

Using hooks keeps your code stable if internal state shape changes and avoids direct Redux/context coupling.

### Enums

- `ApiVersion` - API version enum (currently only `V1`)
- `AuthStatus` - Auth status enum: `loading` \| `redirecting` \| `authenticating` \| `authenticated` \| `unauthenticated`. Use with `useSaaSAuth().status`; `isLoading`, `isAuthenticated`, and `isRedirecting` are derived from it.

### Types

All TypeScript types are exported for type safety. See the [TypeScript definitions](./dist/index.d.ts) for complete type information.

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

### Pattern 6: Error Boundary with Custom Fallback

```tsx
import { ErrorBoundary, SDKError } from '@buildbase/sdk';

function CustomErrorFallback({ error, resetError }) {
  if (error instanceof SDKError) {
    return (
      <div>
        <h2>SDK Error: {error.message}</h2>
        <button onClick={resetError}>Try Again</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={resetError}>Reload</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={CustomErrorFallback}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

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

✅ **Do**: Wrap your app with `ErrorBoundary` and configure error handler.

```tsx
// ✅ Good
<ErrorBoundary>
  <SaaSOSProvider {...config}>
    <App />
  </SaaSOSProvider>
</ErrorBoundary>
```

✅ **Do**: Use `handleError` for custom error handling.

```tsx
try {
  await someOperation();
} catch (error) {
  handleError(error, {
    component: 'MyComponent',
    action: 'operation',
  });
}
```

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
