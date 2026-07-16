import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ISessionView } from '../../api/services/sessions-api';
import { useTranslation } from '../../i18n';
import { getHookErrorMessage, handleErrorUnlessAborted } from '../../lib/error-handler';
import { useSessionsApi } from './api';

export interface UseSessions {
  /** The current user's live sessions. */
  sessions: ISessionView[];
  /** True while the initial list is loading. */
  loading: boolean;
  /** Error message from the last list/revoke, if any. */
  error: string | null;
  /** The session handle currently being revoked, or null. */
  revoking: string | null;
  /** Re-fetch the list. */
  refresh: () => Promise<void>;
  /** Sign out one session by its public handle, then drop it from the list. */
  revoke: (id: string) => Promise<void>;
}

/**
 * Headless data + actions for an "Active sessions" screen. Session-authed and
 * scoped to the signed-in user. Wrap your UI around it, or use the ready-made
 * `<Sessions />` component.
 */
export function useSessions(): UseSessions {
  const api = useSessionsApi();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ISessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const activeRef = useRef<AbortController | null>(null);

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
      if (!controller.signal.aborted) setSessions(result);
    } catch (err) {
      if (controller.signal.aborted) return; // superseded — ignore
      handleErrorUnlessAborted(err, { component: 'useSessions', action: 'list' });
      setError(getHookErrorMessage(err, 'security.sessionsLoadFailed', tRef.current));
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
    async (id: string) => {
      setRevoking(id);
      setError(null);
      try {
        await api.revoke(id);
        setSessions(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        handleErrorUnlessAborted(err, { component: 'useSessions', action: 'revoke' });
        setError(getHookErrorMessage(err, 'security.sessionSignOutFailed', tRef.current));
      } finally {
        setRevoking(null);
      }
    },
    [api]
  );

  return useMemo(
    () => ({ sessions, loading, error, revoking, refresh, revoke }),
    [sessions, loading, error, revoking, refresh, revoke]
  );
}
