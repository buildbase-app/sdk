import { useCallback, useMemo } from 'react';
import { osActions } from '../../contexts/OSContext/actions';
import { useAppDispatch } from '../../contexts/shared/useAppDispatch';
import { useAppSelector } from '../../contexts/shared/useAppSelector';
import { handleErrorUnlessAborted } from '../../lib/error-handler';
import { useAsyncEffect } from '../../lib/useAsyncEffect';
import type { ISettings } from '../types';
import { SettingsApi } from './api';
import { isOsConfigReady, type IOsState } from './types';

/**
 * Hook to access OS (organization) state (serverUrl, version, orgId, auth, settings).
 * Prefer useSaaSSettings() when you only need settings.
 */
export function useSaaSOs(): IOsState {
  return useAppSelector(state => state.os);
}

// Module-level, shared across all useSaaSSettings() instances.
// Keyed by config so simultaneous mounts of the SAME org dedupe to one fetch,
// while a different org (a runtime switch) gets its own fetch instead of
// reusing the wrong in-flight promise. `_latestSettingsKey` is the config the
// app currently wants; a superseded org's late response must not overwrite it.
const _settingsFetches = new Map<string, Promise<ISettings | null>>();
let _latestSettingsKey: string | null = null;

const settingsConfigKey = (serverUrl: string, version: string, orgId: string): string =>
  `${serverUrl}|${version}|${orgId}`;

/**
 * Hook to access organization settings from the OS context.
 * Automatically fetches settings once when OS config is ready.
 * Safe to call from multiple components — only one fetch is made.
 *
 * @returns `{ settings, loading, error, refetch }` — `loading` is true from
 * mount until the one-time fetch settles (so UI can wait instead of guessing
 * with `?? true` defaults); `error` carries the failure message; `refetch`
 * re-runs the fetch (deduped across components).
 */
export function useSaaSSettings() {
  const dispatch = useAppDispatch();
  const os = useSaaSOs();
  const { serverUrl, version, orgId, settings, settingsStatus, settingsError } = os;

  const settingsApi = useMemo(
    () => (isOsConfigReady(os) ? new SettingsApi({ serverUrl, version, orgId }) : null),
    [serverUrl, version, orgId]
  );

  const getSettings = useCallback(
    async (_signal?: AbortSignal): Promise<ISettings | null> => {
      if (!settingsApi) return null;

      const key = settingsConfigKey(serverUrl, version, orgId);
      _latestSettingsKey = key;

      // Reuse an in-flight fetch for the SAME config; a switched org gets its own.
      const existing = _settingsFetches.get(key);
      if (existing) return existing;

      const promise = (async () => {
        dispatch.os(osActions.setSettingsStatus('loading'));
        try {
          // Detached on purpose: the result lands in the GLOBAL store, so the
          // shared fetch must not be tied to any one component's signal. (A
          // caller's signal — e.g. StrictMode's throwaway first mount — would
          // abort it for every waiter, and since the effect deps never change
          // again, settings would stay null for the whole session.)
          const data = await settingsApi.getSettings();
          // Commit only if this config is still the one the app wants — a newer
          // org switch must not be clobbered by an older org's late response.
          if (_latestSettingsKey === key) dispatch.os(osActions.setSettings(data));
          return data;
        } catch (err) {
          if (_latestSettingsKey === key) {
            dispatch.os(
              osActions.setSettingsStatus(
                'error',
                err instanceof Error ? err.message : 'Failed to load settings'
              )
            );
          }
          handleErrorUnlessAborted(err, {
            component: 'useSaaSSettings',
            action: 'getSettings',
            metadata: { serverUrl, version, orgId },
          });
          return null;
        } finally {
          _settingsFetches.delete(key);
        }
      })();

      _settingsFetches.set(key, promise);
      return promise;
    },
    [settingsApi, dispatch, serverUrl, version, orgId]
  );

  // Automatically fetch settings once when OS config is ready
  useAsyncEffect(
    async () => {
      // Already in store — nothing to do
      if (settings) return;
      if (!isOsConfigReady(os)) return;
      await getSettings();
    },
    // Only re-run when config changes, not when settings/getSettings change
    [serverUrl, version, orgId],
    {
      onError: err =>
        handleErrorUnlessAborted(err, {
          component: 'useSaaSSettings',
          action: 'fetchSettings',
          metadata: { serverUrl, version, orgId },
        }),
    }
  );

  // 'idle' still counts as loading once the config is ready — the auto-fetch
  // effect is about to run, and reporting loading:false in that window would
  // reintroduce the flash this state exists to prevent.
  const loading =
    settingsStatus === 'loading' ||
    ((settingsStatus === 'idle' || settingsStatus === undefined) && isOsConfigReady(os));

  return useMemo(
    () => ({
      settings,
      loading,
      error: settingsError ?? null,
      refetch: getSettings,
      getSettings,
    }),
    [settings, loading, settingsError, getSettings]
  );
}
