/**
 * Memoized WorkspaceApi hook — separated from hooks.ts to avoid circular dependency.
 * contexts/SubscriptionContext → subscription-hooks → this file → os/hooks (no cycle)
 */

import { useCallback, useMemo } from 'react';
import { WorkspaceApi } from '../../api/services/workspace-api';
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
  const onUnauthorized = useCallback(() => {
    os.auth?.callbacks?.onSessionExpired?.('expired');
  }, [os.auth?.callbacks?.onSessionExpired]);
  const api = useWorkspaceApi(os, onUnauthorized);
  return useMemo(() => ({ os, api }), [os, api]);
}
