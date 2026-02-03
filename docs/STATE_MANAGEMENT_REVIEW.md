# State Management & Centralized Logic Review

This document identifies opportunities to simplify state management and centralize logic across the SDK.

---

## 1. Storage Keys & Constants ✅ Done

### Issue: Duplicated storage keys

| Key                     | Location 1                             | Location 2                     |
| ----------------------- | -------------------------------------- | ------------------------------ |
| `WORKSPACE_STORAGE_KEY` | `contexts/WorkspaceContext/reducer.ts` | `providers/workspace/utils.ts` |

**Recommendation:** Add `WORKSPACE_STORAGE_KEY` to `providers/constants.ts` alongside `AUTH_SESSION_ID_KEY` and import from there in both places.

```typescript
// providers/constants.ts
export const AUTH_TOKEN_PARAM = 'code';
export const AUTH_SESSION_ID_KEY = 'saas-session-id';
export const WORKSPACE_STORAGE_KEY = 'saas-workspace-current';
```

---

## 2. Workspace Storage Logic Duplication ✅ Done

### Issue: Redundant save/clear logic

- **WorkspaceContext reducer** defines `saveWorkspaceId()` and `clearWorkspaceId()` that mirror `workspaceStorage.saveCurrentWorkspace()` and `workspaceStorage.clearCurrentWorkspace()`.
- The reducer operates on `workspaceId` (string) while `workspaceStorage` expects `IWorkspace | null`.

**Recommendation:** Have the reducer call `workspaceStorage` instead of duplicating storage logic:

```typescript
// In reducer - SET_CURRENT_WORKSPACE
workspaceStorage.saveCurrentWorkspace(action.payload);

// RESET_CURRENT_WORKSPACE
workspaceStorage.clearCurrentWorkspace();
```

This requires importing `workspaceStorage` from `providers/workspace/utils.ts` into the reducer. Consider moving `workspaceStorage` to a shared location (e.g. `contexts/shared/utils/storage.ts` or a dedicated `lib/storage-keys.ts`) to avoid circular dependencies.

---

## 3. IUser → AuthUser Mapping Duplication ✅ Done

### Issue: Same mapping logic in two places

In `providers/auth/provider.tsx`, the IUser → AuthUser mapping appears twice (lines ~85–96 and ~216–227):

```typescript
const authUser: AuthUser = {
  id: userId,
  name: userData.name || '',
  org: orgId,
  email: userData.email,
  emailVerified: true,
  clientId: osState.auth?.clientId || '',
  role: userData.role || '',
  image: userData.image,
};
```

**Recommendation:** Extract to `providers/auth/utils.ts`:

```typescript
export function mapIUserToAuthUser(userData: IUser, orgId: string, clientId: string): AuthUser {
  const userId = userData._id || userData.id;
  if (!userId || typeof userId !== 'string') {
    throw new Error('User data missing required ID field');
  }
  if (!userData.email || typeof userData.email !== 'string') {
    throw new Error('User data missing required email field');
  }
  return {
    id: userId,
    name: userData.name || '',
    org: orgId,
    email: userData.email,
    emailVerified: true,
    clientId,
    role: userData.role || '',
    image: userData.image,
  };
}
```

Use this in both `handleAuthRedirect` and `fetchUserProfile`.

---

## 4. Dropdown Components – High Duplication ✅ Done

### Issue: Four nearly identical components

`SelectCountry`, `SelectCurrency`, `SelectLanguage`, and `SelectTimeZone` share the same structure:

- Popover + Command + CommandInput + CommandList
- Same `value` / `onChange` / `open` state
- Same selection and close behavior
- Minor differences: `text` vs `label`, `flag` vs `icon`, placeholder text

**Recommendation:** Introduce a generic `CommandSelect` component:

```typescript
interface CommandSelectOption {
  value: string;
  label: string; // normalize to single key
  icon?: string; // flag, emoji, or icon name
}

interface CommandSelectProps {
  options: CommandSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}
```

Each dropdown would pass its data and config into this shared component, reducing ~300 lines of duplicated UI code.

---

## 5. Unused Reducer Helpers ✅ Done

### Issue: `reducerHelpers` exists but is unused

`contexts/shared/utils/reducerHelpers.ts` defines `updateField` and `updateFields`, but no reducer uses them.

**Recommendation:** Either:

- **Option A:** Use them in reducers to simplify updates:

```typescript
// OS reducer
case 'SET_SAAS_OS_CONFIG':
  return updateFields(state, action.payload);
case 'SET_SETTINGS':
  return updateField(state, 'settings', action.payload);
```

- **Option B:** Remove `reducerHelpers.ts` if you prefer explicit `{ ...state, ... }` patterns.

---

## 6. Selector Logic Duplication ✅ Done

**Consumer state access:** Prefer SDK hooks over `useAppSelector`: use `useSaaSAuth()`, `useSaaSWorkspaces()`, `useSaaSOs()`, `useSaaSSettings()` for state. `useAppSelector` remains for internal hook/context implementation only.

### Issue: Repeated memoization/equality logic

`createContextProvider`’s `useSelector` and `useAppSelector` both implement:

- Ref-based selector and equality function
- Memoization with equality check
- Previous value caching

**Recommendation:** Extract a shared `useSelectWithEquality` hook:

```typescript
function useSelectWithEquality<TState, TSelected>(
  state: TState,
  selector: (state: TState) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected;
```

Both `createContextProvider` and `useAppSelector` can call this internally to avoid duplication.

---

## 7. UserProvider vs createContextProvider ✅ Keep as-is

### Issue: Different patterns for similar concerns

- **Auth, OS, Workspace:** Use `createContextProvider` (reducer + split contexts).
- **UserProvider:** Uses raw `React.createContext` + `useState` + `useCallback`.

**Recommendation:** Keep UserProvider as-is for now. It is an async data provider (fetch/update) rather than a pure reducer-based store. Migrating it would require either:

- A new factory for async providers, or
- Moving fetch logic into a custom hook and keeping only derived state in context.

Both are larger refactors; the current pattern is acceptable.

---

## 8. workspaceSettingsManager – Singleton vs Context ✅ Keep as-is

### Issue: Mix of singleton and React

`workspaceSettingsManager` is a module-level singleton; `WorkspaceSettingsProvider` subscribes and re-renders.

**Recommendation:** Keep this pattern. It supports an imperative API (`openWorkspaceSettings()` from anywhere) without prop drilling. Moving to pure context would require passing `openWorkspaceSettings` through the tree or a different mechanism.

---

## 9. API Error Response Pattern ✅ Done

### Issue: Repeated error extraction

Several places use:

```typescript
const errorData = await response.json().catch(() => ({}));
throw new Error(errorData.message || 'Failed to ...');
```

**Recommendation:** `handleApiResponse` in `api-utils.ts` already centralizes this for successful responses. For error responses, consider:

```typescript
export async function getErrorMessage(response: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.message || defaultMsg;
  } catch {
    return defaultMsg;
  }
}
```

Use this in UserProvider and any other manual fetch handlers.

---

## 10. Async Effect Pattern ✅ Done

### Issue: Repeated AbortController + async effect pattern

Auth provider, ContextConfigProvider, and workspace hooks all use:

1. `useEffect` with async logic
2. `AbortController` for cancellation
3. Cleanup that calls `abort()`
4. `isAbortError` checks in catch

**Recommendation:** A `useAsyncEffect` hook could encapsulate this:

```typescript
function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: React.DependencyList
) {
  useEffect(() => {
    const ac = new AbortController();
    effect(ac.signal).catch(err => {
      if (!isAbortError(err)) handleError(err, { ... });
    });
    return () => ac.abort();
  }, deps);
}
```

This would reduce boilerplate in multiple providers. Use with care to preserve existing dependency arrays and behavior.

---

## Summary: Priority Matrix

| #   | Change                              | Effort | Impact | Priority   | Status        |
| --- | ----------------------------------- | ------ | ------ | ---------- | ------------- |
| 1   | Centralize storage keys             | Low    | Medium | High       | ✅ Done       |
| 2   | Use workspaceStorage in reducer     | Low    | Medium | High       | ✅ Done       |
| 3   | Extract mapIUserToAuthUser          | Low    | Medium | High       | ✅ Done       |
| 4   | Generic CommandSelect for dropdowns | Medium | High   | Medium     | ✅ Done       |
| 5   | Use or remove reducerHelpers        | Low    | Low    | Low        | ✅ Done       |
| 6   | Extract useSelectWithEquality       | Medium | Low    | Low        | ✅ Done       |
| 7   | UserProvider migration              | High   | Low    | Skip       | ✅ Keep as-is |
| 8   | workspaceSettingsManager            | -      | -      | Keep as-is | ✅ Keep as-is |
| 9   | getErrorMessage utility             | Low    | Medium | Medium     | ✅ Done       |
| 10  | useAsyncEffect hook                 | Medium | Medium | Medium     | ✅ Done       |

---

## Long-Term Improvements (Post-Review)

After completing the state management review, the following improvements would strengthen the SDK for long-term maintainability:

### 11. Standardize Error Handling in UI Components ✅ Done

**Issue:** Several workspace settings UI components use `console.error` directly instead of the centralized `handleError`.

**Status:** ✅ **Implemented** – Replaced all `console.error` calls with `handleError(error, { component, action, metadata })` in:

- `SettingsUsers.tsx` – getUsers, InviteMember addUser
- `SettingsGeneral.tsx` – updateWorkspace
- `SettingsFeatures.tsx` – updateFeature
- `SettingsProfile.tsx` – updateUserProfile
- `os/hooks.ts` – getSettings, useAsyncEffect onError

---

### 12. Use `handleErrorUnlessAborted` in OS Settings Hook ✅ Done

**Issue:** `useSaaSSettings` in `os/hooks.ts` used `if (isAbortError(err)) return null; handleError(...)` instead of the shared pattern.

**Status:** ✅ **Implemented** – Replaced with `handleErrorUnlessAborted` in both `getSettings` catch and `useAsyncEffect` onError. Removed `isAbortError` import.

---

### 13. Use `getErrorMessage` in Beta API ✅ Done

**Issue:** `components/beta/api.ts` used `response.statusText` for error messages.

**Status:** ✅ **Implemented** – Replaced with `getErrorMessage(response, defaultMsg)` in both `fetchConfig` and `submitBetaUser` for consistent API error extraction.

---

### 14. UserProvider Initial Fetch – Add AbortController ✅ Done

**Issue:** `UserProvider` used raw `useEffect` + `Promise.all([fetchAttributes(), fetchFeatures()])` for initial load. No AbortController—if user logs out or component unmounts during fetch, state updates may still occur.

**Status:** ✅ **Implemented** – Migrated to `useAsyncEffect` with signal passed to fetch calls:

- Added optional `signal?: AbortSignal` to `fetchAttributes` and `fetchFeatures`
- Pass signal to `safeFetch` for initial load; ignore `AbortError` in catch
- Replaced `useEffect` with `useAsyncEffect`; cleanup aborts in-flight requests on unmount

---

### 15. Address Circular Dependencies ✅ Done

**Issue:** Build warned about circular dependencies:

- `workspace/hooks.ts` ↔ `workspace/provider.tsx` ↔ `SettingsDialog.tsx` ↔ `SettingsDanger.tsx` ↔ `workspace/hooks.ts`

**Status:** ✅ **Implemented** – Broke the cycle by removing `WorkspaceSwitcher` from the `useSaaSWorkspaces` return value. The hook no longer imports from provider. Consumers should import `WorkspaceSwitcher` directly: `import { useSaaSWorkspaces, WorkspaceSwitcher } from '@buildbase/sdk'`.

**Note:** The `zod` internal circular ref remains (external library); cannot be fixed in this codebase.

---

### 16. Add Unit Tests

**Issue:** No test files in the project.

**Recommendation:** Prioritize tests for:

1. **API utilities** (`api-utils.ts`) – `safeFetch`, `handleApiResponse`, `getErrorMessage`, `isAbortError`
2. **Error handler** – `handleError`, `handleErrorUnlessAborted`
3. **Auth utils** – `mapIUserToAuthUser`, session helpers
4. **Reducer helpers** – `updateField`, `updateFields`
5. **useAsyncEffect** – cancellation, onError behavior

---

### 17. Request Retry & Timeout (Optional)

**Issue:** No retry for transient failures; no timeout for hanging requests.

**Recommendation:** Add optional utilities (low priority):

- `fetchWithRetry` – exponential backoff for 5xx/network errors
- `fetchWithTimeout` – already exists in api-utils; ensure it’s used where appropriate

---

### 18. Type Safety Improvements

**Issue:** Some `any` types remain (e.g. `error-handler.ts` `wrapAsync`/`wrapSync`).

**Recommendation:** Replace with proper generics:

```typescript
wrapAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context: SDKErrorContext
): (...args: TArgs) => Promise<TReturn>
```

---

### Long-Term Priority Matrix

| #   | Improvement                                 | Effort | Impact | Priority |
| --- | ------------------------------------------- | ------ | ------ | -------- |
| 11  | Standardize error handling in UI components | Low    | Medium | ✅ Done  |
| 12  | handleErrorUnlessAborted in os/hooks        | Low    | Low    | ✅ Done  |
| 13  | getErrorMessage in Beta API                 | Low    | Low    | ✅ Done  |
| 14  | UserProvider AbortController                | Medium | Medium | ✅ Done  |
| 15  | Address circular dependencies               | Medium | Medium | ✅ Done  |
| 16  | Add unit tests                              | High   | High   | High     |
| 17  | Request retry/timeout                       | Low    | Low    | Optional |
| 18  | Type safety improvements                    | Low    | Low    | Low      |

---

## Post-Review Updates (Validated 2026-01-30)

Additional centralization completed after the main review:

### Centralized Logging

- **Logger** (`lib/logger.ts`): All `console.log`/`warn`/`error` routed through `sdkLog`, `sdkWarn`, `sdkLogError`, `sdkError`. Internal only (not exported).
- **Error handling in UI**: Replaced direct `console.error` with `handleError` in SettingsUsers, SettingsGeneral, SettingsFeatures, SettingsProfile, os/hooks.

### Centralized `isDevelopment`

- **`lib/utils.ts`**: Single `isDevelopment()` used by `api-utils.ts` and `logger.ts`.

### Public API Simplification

- **Error handling exports removed**: ErrorBoundary, errorHandler, handleError, handleErrorUnlessAborted, SDKError, createSDKError, ErrorHandlerConfig, SDKErrorContext no longer exported. SDK uses them internally; consumers use SaaSOSProvider which wraps with ErrorBoundary.

### Validation Summary

| #    | Item                                 | Status                       |
| ---- | ------------------------------------ | ---------------------------- |
| 1–10 | Main review items                    | ✅ All validated in codebase |
| 11   | Standardize error handling in UI     | ✅ Done                      |
| 12   | handleErrorUnlessAborted in os/hooks | ✅ Done                      |
| 13   | getErrorMessage in Beta API          | ✅ Done                      |
| 14   | UserProvider AbortController         | ✅ Done                      |
| 15   | Address circular dependencies        | ✅ Done                      |

---

_Last updated: 2026-01-30_
