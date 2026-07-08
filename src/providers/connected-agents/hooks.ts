import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IConnectedAgent } from '../../api/services/connected-agents-api';
import { handleErrorUnlessAborted } from '../../lib/error-handler';
import { useConnectedAgentsApi } from './api';

export interface UseConnectedAgents {
  /** The agents the current user has connected to their account. */
  agents: IConnectedAgent[];
  /** True while the initial list is loading. */
  loading: boolean;
  /** Error message from the last list/revoke, if any. */
  error: string | null;
  /** The clientId currently being disconnected, or null. */
  revoking: string | null;
  /** Re-fetch the list. */
  refresh: () => Promise<void>;
  /** Disconnect an agent, then optimistically drop it from the list. */
  revoke: (clientId: string) => Promise<void>;
}

/**
 * Headless data + actions for a "Connected agents" screen. Session-authed and
 * scoped to the signed-in user. Wrap your UI around it, or use the ready-made
 * `<ConnectedAgents />` component.
 */
export function useConnectedAgents(): UseConnectedAgents {
  const api = useConnectedAgentsApi();
  const [agents, setAgents] = useState<IConnectedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAgents(await api.list());
    } catch (err) {
      handleErrorUnlessAborted(err, {
        component: 'useConnectedAgents',
        action: 'list',
      });
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const revoke = useCallback(
    async (clientId: string) => {
      setRevoking(clientId);
      setError(null);
      try {
        await api.revoke(clientId);
        setAgents(prev => prev.filter(a => a.clientId !== clientId));
      } catch (err) {
        handleErrorUnlessAborted(err, {
          component: 'useConnectedAgents',
          action: 'revoke',
        });
        setError(err instanceof Error ? err.message : 'Failed to disconnect');
      } finally {
        setRevoking(null);
      }
    },
    [api]
  );

  return useMemo(
    () => ({ agents, loading, error, revoking, refresh, revoke }),
    [agents, loading, error, revoking, refresh, revoke]
  );
}
