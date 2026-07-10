/**
 * Memoized WorkspaceApi hook — separated from hooks.ts to avoid circular dependency.
 * contexts/SubscriptionContext → subscription-hooks → this file → os/hooks (no cycle)
 */

import { useCallback, useMemo } from 'react';
import { WorkspaceApi } from '../../api/services/workspace-api';
// Import from specific paths (not the `../../contexts` barrel) so we don't pull
// in SubscriptionContext and re-create the circular dependency this file exists
// to avoid.
import { authActions } from '../../contexts/AuthContext/actions';
import { useAppDispatch } from '../../contexts/shared/useAppDispatch';
import { removeSession } from '../../lib/auth-utils';
import { useSaaSOs } from '../os/hooks';
import type { IOsConfig, IOsState } from '../os/types';

export function useWorkspaceApi(os: IOsConfig, onUnauthorized?: () => void) {
  return useMemo(
    () => new WorkspaceApi({ ...os, onUnauthorized }),
    [os.serverUrl, os.version, os.orgId, onUnauthorized]
  );
}

export function useWorkspaceApiWithOs(): { os: IOsState; api: WorkspaceApi } {
  const os = useSaaSOs();
  const dispatch = useAppDispatch();
  const onUnauthorized = useCallback(() => {
    // A 401 means the token is dead. Clear both stored and in-memory auth so
    // gated UI can't keep rendering "authenticated" behind an invalid session,
    // then notify the app so it can redirect / re-authenticate.
    removeSession();
    dispatch.auth(authActions.removeSession());
    os.auth?.callbacks?.onSessionExpired?.('expired');
  }, [dispatch, os.auth?.callbacks?.onSessionExpired]);
  const api = useWorkspaceApi(os, onUnauthorized);
  return useMemo(() => ({ os, api }), [os, api]);
}
