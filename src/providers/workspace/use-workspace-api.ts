/**
 * Memoized WorkspaceApi hook — separated from hooks.ts to avoid circular dependency.
 * contexts/SubscriptionContext → subscription-hooks → this file → os/hooks (no cycle)
 */

import { useMemo } from 'react';
import { WorkspaceApi } from '../../api/services/workspace-api';
import { useSaaSOs } from '../os/hooks';
import type { IOsConfig, IOsState } from '../os/types';

export function useWorkspaceApi(os: IOsConfig) {
  return useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);
}

export function useWorkspaceApiWithOs(): { os: IOsState; api: WorkspaceApi } {
  const os = useSaaSOs();
  const api = useWorkspaceApi(os);
  return useMemo(() => ({ os, api }), [os, api]);
}
