'use client';

import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../AuthContext';
import { useOSStore } from '../OSContext';
import { useWorkspaceStore } from '../WorkspaceContext';
import type { SDKState } from './types';
import { useStoreSelector } from './useStoreSelector';

export type { SDKState } from './types';

/**
 * Combined selector hook - select from all contexts at once.
 * Re-renders ONLY when the selected value changes (pass a stable selector
 * for the bailout to hold across renders).
 *
 * @param selector Function that selects a value from the combined SDK state
 * @param equalityFn Optional equality function for comparison (default: Object.is)
 *
 * @example
 * ```tsx
 * // Get entire combined state
 * const sdk = useAppSelector();
 *
 * // Get specific context
 * const auth = useAppSelector(state => state.auth);
 * const user = useAppSelector(state => state.auth.session?.user);
 *
 * // Get multiple fields across contexts
 * const { user, currentWorkspace, serverUrl } = useAppSelector(state => ({
 *   user: state.auth.session?.user,
 *   currentWorkspace: state.workspaces.currentWorkspace,
 *   serverUrl: state.os.serverUrl,
 * }));
 * ```
 */
export function useAppSelector<Selected = SDKState>(
  selector?: (state: SDKState) => Selected,
  equalityFn?: (a: Selected, b: Selected) => boolean
): Selected {
  const os = useOSStore();
  const auth = useAuthStore();
  const workspaces = useWorkspaceStore();

  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribes = [
        os.subscribe(listener),
        auth.subscribe(listener),
        workspaces.subscribe(listener),
      ];
      return () => unsubscribes.forEach(unsubscribe => unsubscribe());
    },
    [os, auth, workspaces]
  );

  // Combined snapshot, rebuilt only when one of the slices actually changed —
  // a stable identity is required by useSyncExternalStore and is what lets
  // downstream selection caching work.
  const getState = useMemo(() => {
    let memo: SDKState | null = null;
    return (): SDKState => {
      if (
        memo === null ||
        memo.os !== os.getState() ||
        memo.auth !== auth.getState() ||
        memo.workspaces !== workspaces.getState()
      ) {
        memo = { os: os.getState(), auth: auth.getState(), workspaces: workspaces.getState() };
      }
      return memo;
    };
  }, [os, auth, workspaces]);

  return useStoreSelector(getState, subscribe, selector, equalityFn);
}
