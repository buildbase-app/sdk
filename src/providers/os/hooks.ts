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

// Module-level guard shared across all useSaaSSettings() instances.
// Prevents duplicate fetches when multiple components mount simultaneously.
let _settingsFetchPromise: Promise<ISettings | null> | null = null;

/**
 * Hook to access organization settings from the OS context.
 * Automatically fetches settings once when OS config is ready.
 * Safe to call from multiple components — only one fetch is made.
 */
export function useSaaSSettings() {
  const dispatch = useAppDispatch();
  const os = useSaaSOs();
  const { serverUrl, version, orgId, settings } = os;

  const settingsApi = useMemo(
    () => (isOsConfigReady(os) ? new SettingsApi({ serverUrl, version, orgId }) : null),
    [serverUrl, version, orgId]
  );

  const getSettings = useCallback(
    async (_signal?: AbortSignal): Promise<ISettings | null> => {
      if (!settingsApi) return null;

      // If already fetching, reuse the in-flight promise
      if (_settingsFetchPromise) return _settingsFetchPromise;

      _settingsFetchPromise = (async () => {
        try {
          // Detached on purpose: the result lands in the GLOBAL store, so the
          // shared fetch must not be tied to any one component's signal. (A
          // caller's signal — e.g. StrictMode's throwaway first mount — would
          // abort it for every waiter, and since the effect deps never change
          // again, settings would stay null for the whole session.)
          const data = await settingsApi.getSettings();
          dispatch.os(osActions.setSettings(data));
          return data;
        } catch (err) {
          handleErrorUnlessAborted(err, {
            component: 'useSaaSSettings',
            action: 'getSettings',
            metadata: { serverUrl, version, orgId },
          });
          return null;
        } finally {
          _settingsFetchPromise = null;
        }
      })();

      return _settingsFetchPromise;
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

  return useMemo(
    () => ({
      settings,
      getSettings,
    }),
    [settings, getSettings]
  );
}
