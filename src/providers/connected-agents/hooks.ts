import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IConnectedAgent } from '../../api/services/connected-agents-api';
import { useTranslation } from '../../i18n';
import { getHookErrorMessage, handleErrorUnlessAborted } from '../../lib/error-handler';
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
  const { t } = useTranslation();
  const [agents, setAgents] = useState<IConnectedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Guards against stale writes: only the most recent in-flight list may commit.
  const activeRef = useRef<AbortController | null>(null);

  // Latest `t` without putting it in the callback deps: a locale switch must not
  // recreate `refresh` (which would abort the in-flight list and refetch).
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const refresh = useCallback(async () => {
    activeRef.current?.abort();
    const controller = new AbortController();
    activeRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await api.list(controller.signal);
      if (!controller.signal.aborted) setAgents(result);
    } catch (err) {
      if (controller.signal.aborted) return; // superseded — ignore
      handleErrorUnlessAborted(err, {
        component: 'useConnectedAgents',
        action: 'list',
      });
      setError(getHookErrorMessage(err, 'security.connectedAgentsLoadFailed', tRef.current));
    } finally {
      if (activeRef.current === controller) {
        activeRef.current = null;
        setLoading(false);
      }
    }
  }, [api]);

  useEffect(() => {
    refresh();
    return () => activeRef.current?.abort();
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
        setError(getHookErrorMessage(err, 'security.connectedAgentsRevokeFailed', tRef.current));
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
