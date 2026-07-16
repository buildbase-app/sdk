import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IDeviceView } from '../../api/services/devices-api';
import { useTranslation } from '../../i18n';
import { getHookErrorMessage, handleErrorUnlessAborted } from '../../lib/error-handler';
import { useDevicesApi } from './api';

export interface UseDevices {
  /** The devices the current user has signed in from (most recent first). */
  devices: IDeviceView[];
  /** True while the initial list is loading. */
  loading: boolean;
  /** Error message from the last list/mutation, if any. */
  error: string | null;
  /** The deviceId currently being mutated (rename/sign-out/forget), or null. */
  busyId: string | null;
  /** Re-fetch the list. */
  refresh: () => Promise<void>;
  /** Rename a device, then update it in place. */
  rename: (deviceId: string, name: string) => Promise<void>;
  /** Sign a device out (revoke its sessions); it stays in the list. */
  signOut: (deviceId: string) => Promise<void>;
  /** Forget a device: sign it out AND drop it from the list. */
  forget: (deviceId: string) => Promise<void>;
}

/**
 * Headless data + actions for a "Devices" screen. Session-authed and scoped to
 * the signed-in user. Wrap your UI around it, or use the ready-made
 * `<Devices />` component.
 */
export function useDevices(): UseDevices {
  const api = useDevicesApi();
  const { t } = useTranslation();
  const [devices, setDevices] = useState<IDeviceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      if (!controller.signal.aborted) setDevices(result);
    } catch (err) {
      if (controller.signal.aborted) return; // superseded — ignore
      handleErrorUnlessAborted(err, { component: 'useDevices', action: 'list' });
      setError(getHookErrorMessage(err, 'security.devicesLoadFailed', tRef.current));
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

  const rename = useCallback(
    async (deviceId: string, name: string) => {
      setBusyId(deviceId);
      setError(null);
      try {
        await api.rename(deviceId, name);
        setDevices(prev => prev.map(d => (d.deviceId === deviceId ? { ...d, name } : d)));
      } catch (err) {
        handleErrorUnlessAborted(err, { component: 'useDevices', action: 'rename' });
        setError(getHookErrorMessage(err, 'security.deviceRenameFailed', tRef.current));
      } finally {
        setBusyId(null);
      }
    },
    [api]
  );

  const signOut = useCallback(
    async (deviceId: string) => {
      setBusyId(deviceId);
      setError(null);
      try {
        await api.signOut(deviceId);
        // The row stays, now with no live sessions.
        setDevices(prev =>
          prev.map(d => (d.deviceId === deviceId ? { ...d, activeSessions: 0 } : d))
        );
      } catch (err) {
        handleErrorUnlessAborted(err, { component: 'useDevices', action: 'signOut' });
        setError(getHookErrorMessage(err, 'security.deviceSignOutFailed', tRef.current));
      } finally {
        setBusyId(null);
      }
    },
    [api]
  );

  const forget = useCallback(
    async (deviceId: string) => {
      setBusyId(deviceId);
      setError(null);
      try {
        await api.forget(deviceId);
        setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      } catch (err) {
        handleErrorUnlessAborted(err, { component: 'useDevices', action: 'forget' });
        setError(getHookErrorMessage(err, 'security.deviceForgetFailed', tRef.current));
      } finally {
        setBusyId(null);
      }
    },
    [api]
  );

  return useMemo(
    () => ({ devices, loading, error, busyId, refresh, rename, signOut, forget }),
    [devices, loading, error, busyId, refresh, rename, signOut, forget]
  );
}
