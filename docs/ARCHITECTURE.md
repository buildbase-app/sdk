# SDK Architecture Documentation

This document describes the internal architecture and design decisions of the BuildBase SDK.

## Overview

The BuildBase SDK is a React-based SDK that provides authentication, workspace management, user management, and subscription features. It uses React Context for state management and follows a provider-based architecture.

## Architecture Layers

### 1. Provider Layer

The SDK uses a nested provider structure:

```
SaaSOSProvider (root)
  ├── SDKContextProvider (context management)
  ├── AuthProviderWrapper (authentication)
  ├── PortalProvider (portal rendering)
  ├── ContextConfigProvider (OS configuration)
  ├── UserProvider (user attributes/features)
  └── WorkspaceSettingsProvider (workspace settings UI)
```

**Design Decision**: Nested providers allow for:
- Clear separation of concerns
- Independent feature enablement
- Proper dependency ordering (auth before workspace, etc.)

### 2. Context Layer

The SDK uses multiple React contexts for state management:

#### AuthContext
- **Purpose**: Manages authentication state and session
- **State**: `{ session: AuthSession | null, status: AuthStatus }`
- **Design**: Single source of truth for auth state. Status enum drives all auth flags (derived, not stored).

#### OSContext
- **Purpose**: Manages SDK configuration (serverUrl, version, orgId, settings)
- **State**: `{ serverUrl, version, orgId, settings, auth }`
- **Design**: Immutable config that rarely changes after initialization.

#### WorkspaceContext
- **Purpose**: Manages workspace state and operations
- **State**: `{ workspaces[], currentWorkspace, loading, error, ... }`
- **Design**: Centralized workspace state with optimistic updates.

#### SDKContext
- **Purpose**: Combines all contexts into a single provider
- **Design**: Reduces provider nesting and provides unified state access.

**Design Decision**: Multiple contexts instead of single context:
- Better performance (components only re-render when their context changes)
- Clearer separation of concerns
- Easier to test individual features

### 3. API Layer

The SDK uses a centralized API client pattern:

#### WorkspaceApi
- **Purpose**: Handles all workspace-related API calls
- **Location**: `src/providers/workspace/api.ts`
- **Design**: Class-based API client that encapsulates API logic.

#### API Utilities
- **Purpose**: Shared utilities for API calls
- **Location**: `src/lib/api-utils.ts`
- **Functions**:
  - `safeFetch`: Network error handling
  - `handleApiResponse`: Response parsing and error handling
  - `parseJsonResponse`: JSON parsing with error handling
  - `fetchWithTimeout`: Timeout support

**Design Decision**: Centralized API utilities:
- Consistent error handling across all API calls
- Automatic request/response logging in dev mode
- AbortController support for request cancellation
- Sensitive data redaction in logs

### 4. Hook Layer

The SDK exposes hooks for consuming context and performing operations:

#### Auth Hooks
- `useSaaSAuth()`: Main auth hook with signIn/signOut

#### Workspace Hooks
- `useSaaSWorkspaces()`: Main workspace management hook
- Subscription hooks: `useSubscription`, `usePlanGroup`, etc.

#### User Hooks
- `useUserAttributes()`: User attributes access
- `useUserFeatures()`: User feature flags

**Design Decision**: Hooks pattern:
- Familiar React API
- Automatic re-renders on state changes
- Easy to use in functional components
- Type-safe with TypeScript

### 5. Component Layer

The SDK provides conditional rendering components:

#### Auth Components
- `WhenAuthenticated`: Renders when user is authenticated
- `WhenUnauthenticated`: Renders when user is not authenticated

#### Role Components
- `WhenRoles`: Renders based on user's global role
- `WhenWorkspaceRoles`: Renders based on user's workspace role

#### Feature Components
- `WhenUserFeatureEnabled/Disabled`: Renders based on user feature flags
- `WhenWorkspaceFeatureEnabled/Disabled`: Renders based on workspace feature flags

**Design Decision**: Conditional components:
- Declarative API for feature gating
- Reduces boilerplate in consumer apps
- Type-safe with TypeScript

## State Management

### Context-Based State (No Redux)

**Decision**: Use React Context instead of Redux.

**Rationale**:
- Simpler for SDK consumers (no Redux setup required)
- Less bundle size
- Sufficient for SDK's state management needs
- Better integration with React 19

### State Updates

State updates use reducer pattern:

```typescript
// Example: AuthContext reducer
function authReducer(state: IAuthState, action: AuthAction): IAuthState {
  switch (action.type) {
    case 'AUTHENTICATION_STARTED':
      return { ...state, status: AuthStatus.redirecting };
    // ...
  }
}
```

**Design Decision**: Reducer pattern:
- Predictable state updates
- Easy to debug (action-based)
- Type-safe with TypeScript

### Derived State

Some state is derived rather than stored:

```typescript
// Auth flags are derived from status
const flags = getAuthFlags(auth.status);
// Returns: { isLoading, isAuthenticated, isRedirecting }
```

**Design Decision**: Derived state:
- Single source of truth (status enum)
- Prevents state inconsistencies
- Reduces state size

## Authentication Flow

### OAuth Flow

1. User calls `signIn()`
2. SDK redirects to OAuth provider
3. User authenticates with provider
4. Provider redirects back with `?code=...`
5. SDK exchanges code for session
6. Session stored in localStorage and context

### Session Management

- **Storage**: localStorage (key: `buildbase_session`)
- **Hydration**: On mount, SDK checks localStorage for session
- **Validation**: Session validated by fetching user profile
- **Expiration**: Handled by server (401 response triggers sign-out)

**Design Decision**: localStorage for session:
- Persists across page reloads
- Accessible to SDK on mount
- Simple implementation

## Error Handling

### Error Handler

Centralized error handler (`src/lib/error-handler.ts`):

- Logs errors in development
- Supports custom error callbacks
- Provides error context (component, action, metadata)
- Creates standardized SDKError instances

### Error Boundaries

React Error Boundaries catch component errors:

- `SDKErrorBoundary`: Catches errors in SDK components
- Prevents app crashes
- Provides fallback UI
- Logs errors automatically

**Design Decision**: Multiple error handling layers:
- Network errors: Handled in API utilities
- Component errors: Handled by Error Boundaries
- Application errors: Handled by error handler
- User-facing errors: Can be customized via callbacks

## Performance Optimizations

### Memoization

- Context values memoized to prevent unnecessary re-renders
- Hook return values memoized
- API client instances memoized (recreated only when config changes)

### Request Deduplication

- Refs used to prevent duplicate concurrent requests
- Example: `fetchingProfileRef` in auth provider

### AbortController

- All API calls support AbortSignal
- Requests cancelled on unmount
- Prevents memory leaks and race conditions

**Design Decision**: AbortController pattern:
- Prevents race conditions
- Reduces unnecessary network traffic
- Better user experience (no stale data)

## Type Safety

### TypeScript Usage

- Full TypeScript coverage
- Strict type checking
- Exported types for all public APIs

### Type Exports

All public types exported from `src/index.ts`:

- API types (subscriptions, invoices, etc.)
- Context types
- Error types
- Component prop types

**Design Decision**: Comprehensive type exports:
- Better developer experience
- Type-safe SDK usage
- IDE autocomplete support

## Event System

### Event Emitter

The SDK includes an event emitter for workspace/user events:

- `workspace:created`
- `workspace:updated`
- `workspace:deleted`
- `workspace:changed`
- `user:created`
- `user:updated`
- etc.

**Design Decision**: Event system:
- Allows consumers to react to SDK events
- Decouples SDK from consumer app logic
- Supports custom event handlers via callbacks

## Testing Considerations

### Testability

- Hooks can be tested with `@testing-library/react-hooks`
- Contexts can be tested independently
- API clients can be mocked
- Components can be tested with React Testing Library

### Mocking

- API calls can be mocked at the fetch level
- Contexts can be mocked with custom providers
- Event emitter can be mocked

## Bundle Size

### Tree Shaking

- Named exports for all public APIs
- No default exports (except ErrorBoundary)
- Side-effect-free modules where possible

### Dependencies

- Minimal external dependencies
- Peer dependencies for React (not bundled)
- Radix UI components (tree-shakeable)

## Future Considerations

### Potential Improvements

1. **Request Caching**: Cache GET requests for short duration
2. **Request Interceptors**: Allow consumers to intercept/modify requests
3. **Offline Support**: Cache responses for offline access
4. **Optimistic Updates**: Update UI before API confirms
5. **Batch Requests**: Combine multiple API calls

### Migration Path

- Backward compatible API
- Deprecation warnings before breaking changes
- Semantic versioning

## Summary

The BuildBase SDK follows a layered architecture:

1. **Providers**: Nested React providers for feature enablement
2. **Contexts**: Multiple React contexts for state management
3. **APIs**: Centralized API clients with shared utilities
4. **Hooks**: React hooks for consuming SDK features
5. **Components**: Conditional rendering components

Key design principles:
- **Simplicity**: Easy to use, minimal setup
- **Type Safety**: Full TypeScript coverage
- **Performance**: Memoization, request deduplication, AbortController
- **Error Handling**: Multiple layers of error handling
- **Developer Experience**: Comprehensive documentation, JSDoc comments, examples
