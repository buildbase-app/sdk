'use client';

import { useMemo } from 'react';
import { useAuthDispatch } from '../AuthContext';
import { useOSDispatch } from '../OSContext';
import { useWorkspaceDispatch } from '../WorkspaceContext';
import type { SDKDispatch } from './types';

export type { SDKDispatch } from './types';

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
