'use client';

import { useMemo } from 'react';
import { useAuthDispatch } from '../AuthContext';
import type { AuthAction } from '../AuthContext/types';
import { useOSDispatch } from '../OSContext';
import type { OSAction } from '../OSContext/types';
import { useWorkspaceDispatch } from '../WorkspaceContext';
import type { WorkspaceAction } from '../WorkspaceContext/types';

/**
 * Combined SDK Dispatch
 * Provides dispatch functions for all contexts
 */
export interface SDKDispatch {
  auth: (action: AuthAction) => void;
  os: (action: OSAction) => void;
  workspaces: (action: WorkspaceAction) => void;
}

/**
 * Combined dispatch hook - dispatch actions to all contexts
 *
 * @example
 * ```tsx
 * const dispatch = useAppDispatch();
 *
 * // Dispatch to auth context
 * dispatch.auth(authActions.setSession(session));
 *
 * // Dispatch to workspace context
 * dispatch.workspaces(workspaceActions.setCurrentWorkspace(workspace));
 *
 * // Dispatch to OS context
 * dispatch.os(osActions.setSaaSOSConfig(config));
 * ```
 */
export function useAppDispatch(): SDKDispatch {
  const authDispatch = useAuthDispatch();
  const osDispatch = useOSDispatch();
  const workspaceDispatch = useWorkspaceDispatch();

  // Memoize dispatch object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      auth: authDispatch,
      os: osDispatch,
      workspaces: workspaceDispatch,
    }),
    [authDispatch, osDispatch, workspaceDispatch]
  );
}
