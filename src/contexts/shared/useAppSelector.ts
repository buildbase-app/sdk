'use client';

import React, { useMemo } from 'react';
import type { IAuthState } from '../../providers/auth/types';
import type { IOsState } from '../../providers/os/types';
import { useAuthState } from '../AuthContext';
import { useOSState } from '../OSContext';
import type { WorkspaceState } from '../WorkspaceContext/types';
import { useWorkspaceState } from '../WorkspaceContext';

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
 * const user = useAppSelector(state => state.auth.user);
 *
 * // Get multiple fields across contexts
 * const { user, currentWorkspace, serverUrl } = useAppSelector(state => ({
 *   user: state.auth.user,
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
  const actualSelector = selector || ((s: SDKState) => s as unknown as Selected);
  const selectorRef = React.useRef(actualSelector);
  const prevSelectedRef = React.useRef<Selected | undefined>(undefined);

  // Update selector ref if it changed
  if (selector) {
    selectorRef.current = actualSelector;
  }

  // Compute selected value
  const selected = useMemo(() => selectorRef.current(combinedState), [combinedState]);

  // Use useState to trigger re-renders when selected value changes
  const [selectedValue, setSelectedValue] = React.useState<Selected>(() => selected);

  // Update selected value only if it changed (using equality function)
  React.useEffect(() => {
    const isEqual =
      prevSelectedRef.current !== undefined
        ? (equalityFn || Object.is)(prevSelectedRef.current, selected)
        : false;

    if (!isEqual) {
      prevSelectedRef.current = selected;
      setSelectedValue(selected);
    }
  }, [selected, equalityFn]);

  return selectedValue;
}

