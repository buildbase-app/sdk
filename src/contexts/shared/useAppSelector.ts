'use client';

import React, { useMemo } from 'react';
import type { IAuthState } from '../../providers/auth/types';
import type { IOsState } from '../../providers/os/types';
import { useAuthState } from '../AuthContext';
import { useOSState } from '../OSContext';
import { useWorkspaceState } from '../WorkspaceContext';
import type { WorkspaceState } from '../WorkspaceContext/types';

/**
 * Combined SDK State
 * Represents the complete state structure across all contexts
 */
export interface SDKState {
  os: IOsState;
  auth: IAuthState;
  workspaces: WorkspaceState;
}

/**
 * Combined selector hook - select from all contexts at once
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
  // Get state from all contexts
  const os = useOSState();
  const auth = useAuthState();
  const workspaces = useWorkspaceState();

  // Combine into single state object
  const combinedState = useMemo(
    () => ({
      os,
      auth,
      workspaces,
    }),
    [os, auth, workspaces]
  );

  // If no selector provided, return entire combined state
  // Type assertion is safe here because Selected defaults to SDKState when no selector is provided
  const actualSelector = selector || ((s: SDKState) => s as Selected);
  const selectorRef = React.useRef(actualSelector);
  const equalityFnRef = React.useRef(equalityFn);
  const prevSelectedRef = React.useRef<Selected | undefined>(undefined);
  const prevStateRef = React.useRef<SDKState>(combinedState);

  // Update refs if they changed
  if (selector) {
    selectorRef.current = actualSelector;
  }
  if (equalityFn) {
    equalityFnRef.current = equalityFn;
  }

  // Compute selected value with optimized memoization
  const selected = useMemo(() => {
    const result = selectorRef.current(combinedState);

    // Check if value changed using equality function
    if (prevSelectedRef.current !== undefined) {
      const isEqual = equalityFnRef.current
        ? equalityFnRef.current(prevSelectedRef.current, result)
        : Object.is(prevSelectedRef.current, result);

      if (isEqual && prevStateRef.current === combinedState) {
        // Return previous value if equal and state reference unchanged
        return prevSelectedRef.current;
      }
    }

    // Update refs
    prevSelectedRef.current = result;
    prevStateRef.current = combinedState;

    return result;
  }, [combinedState]);

  return selected;
}
