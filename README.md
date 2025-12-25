# @buildbase/sdk

A React SDK for [BuildBase](https://www.buildbase.app/) that provides essential components to build SaaS applications faster. Skip the plumbing and focus on your core product with built-in authentication, workspace management, and user management.

## 🚀 Features

- **🔐 Authentication System** - Complete auth flow with sign-in/sign-out
- **🏢 Workspace Management** - Multi-workspace support with switching capabilities
- **👥 Role-Based Access Control** - User roles and workspace-specific permissions
- **🎯 Feature Flags** - Workspace-level feature toggles

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
          verifyToken: async token => {
            return new Promise(resolve => {
              fetch('/api/auth/verify', {
                method: 'POST',
                body: JSON.stringify({ token }),
              })
                .then(response => response.json())
                .then((data: { valid: boolean }) => {
                  resolve(data?.valid ?? false);
                })
                .catch(error => {
                  console.error(error);
                  resolve(false);
                });
            });
          },
          handleAuthentication: async token => {
            return new Promise(resolve => {
              fetch('/api/auth/token', {
                method: 'POST',
                body: JSON.stringify({ token }),
              })
                .then(response => response.json())
                .then((data: { token: string; decoded: { id: string } }) => {
                  localStorage.setItem('auth_token', data?.token ?? '');
                  resolve();
                })
                .catch(error => {
                  console.error(error);
                  resolve();
                });
            });
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

The WorkspaceSwitcher component uses a render prop pattern, giving you full control over the UI:

```tsx
import React from 'react';
import { WorkspaceSwitcher } from '@buildbase/sdk';

function WorkspaceExample() {
  return (
    <WorkspaceSwitcher
      trigger={currentWorkspace => {
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
      onWorkspaceChange={async workspace => {
        // Handle workspace change
        console.log('Workspace changed to:', workspace);
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
  isAuthenticated, // Boolean: true if user is authenticated
  signIn, // Function: initiates sign-in flow
  signOut, // Function: signs out the user
  status, // String: 'idle' | 'loading' | 'authenticated' | 'error'
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

Control feature visibility based on workspace settings:

```tsx
import { WhenWorkspaceFeatureEnabled, WhenWorkspaceFeatureDisabled } from '@buildbase/sdk';

function FeatureExample() {
  return (
    <div>
      <WhenWorkspaceFeatureEnabled slug="advanced-analytics">
        <AdvancedAnalytics />
      </WhenWorkspaceFeatureEnabled>

      <WhenWorkspaceFeatureDisabled slug="beta-features">
        <p>Beta features are not enabled for this workspace</p>
      </WhenWorkspaceFeatureDisabled>
    </div>
  );
}
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

- 📧 Email: support@buildbase.app
- 📖 Documentation: [BuildBase Docs](https://docs.buildbase.app/)

## 🔗 Links

- **Homepage**: [BuildBase](https://www.buildbase.app/)
- **NPM Package**: [@buildbase/sdk](https://www.npmjs.com/package/@buildbase/sdk)

---

Made with ❤️ by the BuildBase team
