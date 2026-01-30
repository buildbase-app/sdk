# Workspace Switching – Race Conditions & Callbacks Review

Review of the workspace switching flow for potential loopholes, race conditions, and event/callback issues.

---

## State

- **switchingToId**: `string | null` – ID of workspace being switched to (null when not switching)
- **switching**: `boolean` – Derived as `switchingToId !== null` for app-level loader

---

## Flow Overview

1. **switchToWorkspace** – Centralized entry point: calls `onWorkspaceChange` (auth callback), then `setCurrentWorkspaceWithStorage`
2. **Callers** – Init effect (restore from storage), fetchWorkspaces (restore/first-load), sync effect (workspace removed), WorkspaceItem (user click)
3. **Events** – `workspace:changed` emitted via `handleEvent` after workspace is set

---

## Fixes Applied

### 1. Init Effect – Unhandled Promise Rejection

**Issue:** `switchToWorkspace(savedWorkspace)` was called without `.catch()`. If `onWorkspaceChange` rejected, it caused an unhandled promise rejection.

**Fix:** Added `.catch(() => {})` so rejections are handled and do not surface as unhandled rejections.

### 2. Concurrent switchToWorkspace Calls

**Issue:** Multiple callers (init, fetchWorkspaces, sync effect) could invoke `switchToWorkspace` at the same time. The last one to finish would win, which could overwrite a newer switch with an older one.

**Fix:** Introduced `switchVersionRef` so each call gets a version. Before calling `setCurrentWorkspaceWithStorage`, we check if the call has been superseded. In `finally`, we only dispatch `setSwitchingToId(null)` if the call is still the latest.

---

## Verified Safe

### EventEmitter

- `handleEvent` errors are caught and passed to `handleError`; they do not propagate
- `setCallbacks(null)` on unmount prevents use of stale callbacks

### setCurrentWorkspaceWithStorage

- `emitWorkspaceChanged` is fire-and-forget with `.catch()`; failures are logged but do not affect the switch
- Same-workspace check avoids redundant updates when `forceEmit` is not used

### fetchWorkspaces

- `fetchingRef` blocks duplicate fetches
- `try/catch` around `switchToWorkspace` handles `onWorkspaceChange` rejections
- `finally` always clears loading state

### WorkspaceItem

- Uses `switchingToId === workspace._id` so only the clicked "Switch to" button shows loading
- `.catch(handleError)` handles rejections without unhandled promise rejections

---

## Known Limitations

1. **Sync effect reference update** – When the workspace object reference changes (same ID, updated data), we call `setCurrentWorkspaceWithStorage` directly, not `switchToWorkspace`. `onWorkspaceChange` is not called. This is intentional for reference sync only.

2. **WorkspaceSettingsDialog onClose** – Uses `setCurrentWorkspace` directly to sync the reference when closing settings. Does not go through `switchToWorkspace`.
