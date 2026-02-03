# SDK Improvements & Recommendations

This document outlines potential improvements for the SDK codebase, organized by priority and category.

---

## 🔴 High Priority

### 1. **Inconsistent Error Handling in API Calls**

**Issue:** Many API methods in `WorkspaceApi` don't handle JSON parse errors or provide consistent error messages.

**Current state:**

- Some methods (like `getCurrentSubscription`) have good error handling
- Others (like `getWorkspaces`, `createWorkspace`) just throw generic errors
- No handling for network failures, timeouts, or malformed JSON

**Recommendation:**

```typescript
// Create a centralized API error handler
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('Failed to parse response as JSON');
  }
}
```

**Files to update:**

- `src/providers/workspace/api.ts` - Standardize all methods
- `src/providers/auth/provider.tsx` - Profile fetch error handling
- `src/providers/user/provider.tsx` - Attributes/features fetch

---

### 2. **Missing Network Error Handling** ✅ IMPLEMENTED

**Issue:** Fetch calls don't handle network errors (offline, timeout, CORS, etc.)

**Status:** ✅ **Implemented** - Created `safeFetch` utility in `src/lib/api-utils.ts`

**Implementation:**

- ✅ Created `safeFetch()` function with network error handling
- ✅ Created `handleApiResponse()` for consistent response handling
- ✅ Created `parseJsonResponse()` for safe JSON parsing
- ✅ Updated `WorkspaceApi` methods to use `safeFetch` and `handleApiResponse`
- ✅ Updated `AuthProviderWrapper` profile fetches to use `safeFetch`

**Files updated:**

- ✅ `src/lib/api-utils.ts` - New utility file
- ✅ `src/providers/workspace/api.ts` - Updated getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, getWorkspaceUsers, addUser, removeUser
- ✅ `src/providers/auth/provider.tsx` - Updated profile fetch calls

**Remaining:** Update remaining fetch calls in:

- `src/providers/workspace/api.ts` - Other methods (getFeatures, updateFeature, etc.)
- `src/providers/user/provider.tsx` - Attributes and features fetches
- `src/providers/ContextConfigProvider.tsx` - Settings fetch

---

### 3. **Race Condition in Auth Hydration** ✅ IMPLEMENTED

**Issue:** If OS config becomes available while hydration is running, multiple profile fetches could happen.

**Status:** ✅ **Implemented** - Added ref to track in-flight profile fetches

**Implementation:**

- ✅ Added `fetchingProfileRef` to track if profile fetch is in progress
- ✅ Early return if fetch is already in progress
- ✅ Set ref to `true` when fetch starts
- ✅ Reset ref to `false` in all exit paths (success, error, validation failure, config not ready)
- ✅ Used `finally` block to ensure ref is always reset

**File:** `src/providers/auth/provider.tsx`

**How it works:**

1. Effect checks `fetchingProfileRef.current` at the start - if true, returns early
2. When fetch starts, sets ref to `true`
3. If OS config not ready, resets ref so effect can retry when config arrives
4. On any error/validation failure, resets ref
5. On success, ref is reset in `finally` block
6. Prevents multiple concurrent profile fetches even if `osState` changes during fetch

---

## 🟡 Medium Priority

### 4. **Type Safety Improvements**

**Issues:**

- Some `any` types in error handler (`wrapAsync`, `wrapSync`)
- Missing return types in some functions
- API response types could be more specific

**Recommendation:**

```typescript
// Instead of any
wrapAsync<T extends (...args: any[]) => Promise<any>>(fn: T, context: SDKErrorContext): T

// Better:
wrapAsync<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context: SDKErrorContext
): (...args: TArgs) => Promise<TReturn>
```

**Files:**

- `src/lib/error-handler.ts`
- `src/providers/workspace/api.ts` - Add response type guards

---

### 5. **Code Duplication in Error Handling** ✅ IMPLEMENTED

**Issue:** Similar error handling patterns repeated across files.

**Status:** ✅ **Implemented** - Created centralized API utilities

**Implementation:**

- ✅ Created `src/lib/api-utils.ts` with utility functions
- ✅ `parseJsonResponse<T>()` - Safe JSON parsing with error handling
- ✅ `createApiError()` - Standardized error creation with status code messages
- ✅ `handleApiResponse<T>()` - Complete response handling (status check + JSON parse + error handling)
- ✅ `safeFetch()` - Network error handling wrapper
- ✅ `fetchWithTimeout()` - Fetch with timeout support (bonus)

**Files using utilities:**

- ✅ `src/providers/workspace/api.ts` - Multiple methods updated
- ✅ `src/providers/auth/provider.tsx` - Profile fetches updated

**Benefits:**

- Eliminated code duplication
- Consistent error messages across all API calls
- Better error context (status codes, messages)
- Easier to maintain and extend

**Remaining:** Continue updating remaining fetch calls to use these utilities

---

### 6. **Missing Input Validation**

**Issues:**

- Workspace creation/update don't validate inputs
- User email validation missing
- Role validation missing

**Recommendation:**

```typescript
// Add validation helpers
function validateWorkspaceName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Workspace name is required');
  }
  if (name.length > 100) {
    throw new Error('Workspace name must be less than 100 characters');
  }
}

function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email address');
  }
}
```

**Files:**

- `src/providers/workspace/api.ts`
- `src/providers/workspace/hooks.ts`

---

### 7. **Performance: Unnecessary Re-renders** ✅ IMPLEMENTED

**Issue:** Some hooks might cause unnecessary re-renders.

**Status:** ✅ **Implemented** - Fixed useMemo dependencies to use primitive values instead of object references

**Problem:**

```typescript
// Before: api recreated on every os object reference change
const api = useMemo(() => new WorkspaceApi(os), [os]);
// os is an object, so reference changes even if values are same
```

**Solution:**

```typescript
// After: api only recreated when actual config values change
const api = useMemo(
  () => new WorkspaceApi(os),
  [os.serverUrl, os.version, os.orgId] // Only recreate if these change
);
```

**Implementation:**

- ✅ Fixed `useSaaSWorkspaces` - API memoization now uses primitive dependencies
- ✅ Fixed all subscription hooks (7 instances) - All `WorkspaceApi` instances now use primitive dependencies
- ✅ This prevents unnecessary API instance recreation and callback recreation

**Files updated:**

- ✅ `src/providers/workspace/hooks.ts` - Main workspace hook
- ✅ `src/providers/workspace/subscription-hooks.ts` - All 7 subscription hooks

**Benefits:**

- API instances only recreated when config actually changes
- Callbacks that depend on `api` are more stable
- Reduced unnecessary re-renders in components using these hooks
- Better performance, especially with many workspace operations

---

### 8. **Missing AbortController for Fetch Requests** ✅ IMPLEMENTED

**Issue:** No way to cancel in-flight requests when component unmounts or dependencies change.

**Status:** ✅ **Implemented** - AbortController added to effects that perform fetch

**Implementation:**

- ✅ **api-utils.ts**: Added `isAbortError(error)` helper; `safeFetch` passes through AbortError (no wrap) so callers can ignore it
- ✅ **Auth provider**: Hydration effect creates `AbortController`, passes `signal` to profile fetch, cleanup calls `abort()`; catch ignores `AbortError`
- ✅ **ContextConfigProvider**: Settings fetch effect uses `AbortController`, passes `signal` to fetch, cleanup aborts; catch ignores `AbortError`
- ✅ **OS settings hook**: `getSettings(signal?)` accepts optional `AbortSignal`; effect creates controller and passes signal, cleanup aborts

**Files updated:**

- ✅ `src/lib/api-utils.ts` - `isAbortError()`, `safeFetch` preserves AbortError
- ✅ `src/providers/auth/provider.tsx` - Hydration effect
- ✅ `src/providers/ContextConfigProvider.tsx` - Settings fetch effect
- ✅ `src/providers/os/hooks.ts` - getSettings(signal?), effect with abort

**Benefits:**

- In-flight requests cancelled on unmount or when deps change
- No state updates after unmount (avoids "Can't perform a React state update on an unmounted component")
- Cleaner teardown; AbortError is ignored in catch blocks

**Not changed:** User provider and workspace hooks use fetch inside callbacks (user- or event-triggered), not only in effects; adding signal there would require passing signal through call chains. Can be done later if needed.

---

## 🟢 Low Priority / Nice to Have

### 9. **Add Request Retry Logic**

**Recommendation:** For transient failures (network errors, 5xx), retry with exponential backoff:

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  // Implementation
}
```

---

### 10. **Add Request Timeout**

**Issue:** Fetch requests can hang indefinitely.

**Recommendation:**

```typescript
function fetchWithTimeout(url: string, options: RequestInit, timeout = 10000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
}
```

---

### 11. **Better TypeScript Strict Mode**

**Issues:**

- Some `@ts-ignore` comments
- Missing strict null checks
- Some `any` types

**Recommendation:** Enable strict TypeScript and fix issues gradually.

---

### 12. **Add Request/Response Logging in Dev Mode** ✅

**Status:** Implemented in `src/lib/api-utils.ts`. When `NODE_ENV === 'development'`, `safeFetch` logs each request/response as `[SDK API]` with method, url, request body, response body, and status. Sensitive keys (e.g. `authorization`, `token`, `password`) are redacted in the logged payloads.

---

### 13. **Add Unit Tests**

**Missing:** No test files found.

**Recommendation:** Add tests for:

- Error handling
- Auth flow
- State management
- API utilities

---

### 14. **Documentation Improvements** ✅

**Status:** Completed. Comprehensive documentation added:

1. **JSDoc Comments**: Added detailed JSDoc to all public APIs:
   - All hooks (`useSaaSAuth`, `useSaaSOs`, `useSaaSSettings`, `useSaaSWorkspaces`, `useUserAttributes`, `useUserFeatures`, subscription hooks)
   - All components (`SaaSOSProvider`, `WhenAuthenticated`, `WhenRoles`, feature components, `ErrorBoundary`)
   - All utilities (`safeFetch`, `handleApiResponse`, `errorHandler`, etc.)
   - Includes examples, edge cases, and parameter descriptions

2. **Error Codes Documentation**: Created `docs/ERROR_CODES.md` with:
   - Complete list of all SDK error codes
   - HTTP status code mappings
   - Error handling examples
   - Error context documentation

3. **Architecture Documentation**: Created `docs/ARCHITECTURE.md` with:
   - Architecture layers (Provider, Context, API, Hook, Component)
   - State management decisions
   - Authentication flow
   - Error handling strategy
   - Performance optimizations
   - Design decisions and rationale

4. **Edge Case Examples**: Added examples for:
   - Loading states
   - Error handling
   - Null/undefined workspace IDs
   - AbortController usage
   - Network errors
   - Permission errors

---

### 15. **Add Request Interceptors**

**Recommendation:** Allow users to intercept/modify requests:

```typescript
interface ApiConfig {
  requestInterceptor?: (request: RequestInit) => RequestInit;
  responseInterceptor?: (response: Response) => Response;
}
```

---

### 16. **Optimize Bundle Size** ✅

**Status:** Completed. Bundle size optimizations implemented:

1. **Radix UI Dependencies**: Moved Radix UI components from `devDependencies` to `dependencies` since they're used in production code (`src/components/ui/`).

2. **Bundle Analysis**: Added `rollup-plugin-visualizer` and created `rollup.config.analyze.js`:
   - Run `npm run build:analyze` to generate bundle analysis
   - Generates `dist/stats.html` with treemap visualization
   - Shows gzip and brotli sizes
   - Helps identify large dependencies

3. **Lazy Loading**: Implemented lazy loading for heavy components:
   - `WorkspaceSettingsDialog`: Lazy loaded in `WorkspaceSettingsProvider` (only loads when settings are opened)
   - `SubscriptionDialog`: Lazy loaded in `SettingsSubscription` (only loads when subscription dialog is opened)
   - Both wrapped with `React.Suspense` for proper loading states

4. **Tree-Shaking**:
   - All exports use named exports (except ErrorBoundary which has both default and named)
   - `preserveEntrySignatures: 'exports-only'` in Rollup config
   - `sideEffects: ["**/*.css"]` properly configured (only CSS has side effects)
   - Tree-shaking enabled in Rollup config

5. **Build Script**: Added `build:analyze` script for bundle analysis.

**Files Updated:**

- `package.json`: Moved Radix UI to dependencies, added bundle analysis script
- `rollup.config.analyze.js`: New config file for bundle analysis
- `src/providers/workspace/WorkspaceSettingsProvider.tsx`: Lazy loading for SettingsDialog
- `src/providers/workspace/ui/SettingsSubscription.tsx`: Lazy loading for SubscriptionDialog

**Benefits:**

- Reduced initial bundle size (heavy components only load when needed)
- Better tree-shaking (unused exports can be eliminated)
- Bundle analysis tool for ongoing optimization
- Improved load times for apps that don't use all SDK features

---

### 17. **Add Request Caching**

**Recommendation:** Cache GET requests for a short duration to reduce API calls:

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds
```

---

### 18. **Better Error Messages**

**Issue:** Some error messages are generic.

**Recommendation:** Provide more context:

```typescript
throw new SDKError(
  `Failed to fetch workspace: ${workspaceId}`,
  'WORKSPACE_FETCH_FAILED',
  { workspaceId, status: response.status },
  originalError
);
```

---

## 📋 Summary Checklist

### Immediate Actions

- [ ] Standardize error handling in all API methods
- [ ] Add network error handling
- [ ] Fix race condition in auth hydration
- [ ] Add input validation

### Short Term

- [ ] Improve type safety
- [ ] Add AbortController to fetch calls
- [ ] Optimize useMemo dependencies
- [ ] Extract common error handling utilities

### Long Term

- [ ] Add unit tests
- [ ] Add request retry logic
- [ ] Add request timeout
- [ ] Improve documentation
- [ ] Bundle size optimization

---

_Last updated: 2026-01-28_
