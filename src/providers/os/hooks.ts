import { useCallback, useMemo, useRef } from 'react';
import { osActions, useAppDispatch, useAppSelector } from '../../contexts';
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

/**
 * Hook to access organization settings from the OS context.
 * Automatically fetches settings when OS config is ready.
 *
 * @returns An object containing:
 * - `settings`: Organization settings object (null if not loaded)
 * - `getSettings(signal?)`: Function to manually fetch settings (supports AbortSignal)
 *
 * @example
 * ```tsx
 * function SettingsDisplay() {
 *   const { settings } = useSaaSSettings();
 *
 *   if (!settings) return <Loading />;
 *
 *   return (
 *     <div>
 *       <p>Organization: {settings.name}</p>
 *       <p>Theme: {settings.theme}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Manual fetch with abort signal
 * function SettingsLoader() {
 *   const { getSettings } = useSaaSSettings();
 *
 *   useEffect(() => {
 *     const controller = new AbortController();
 *     getSettings(controller.signal);
 *
 *     return () => controller.abort();
 *   }, [getSettings]);
 * }
 * ```
 */
export function useSaaSSettings() {
  const dispatch = useAppDispatch();
  const os = useSaaSOs();
  const { serverUrl, version, orgId, settings } = os;
  const fetchingSettingsRef = useRef(false);

  const settingsApi = useMemo(
    () => (isOsConfigReady(os) ? new SettingsApi({ serverUrl, version, orgId }) : null),
    [serverUrl, version, orgId]
  );

  const getSettings = useCallback(
    async (signal?: AbortSignal): Promise<ISettings | null> => {
      if (fetchingSettingsRef.current) {
        return settings || null;
      }
      if (settings) {
        return settings;
      }
      if (!settingsApi) {
        return null;
      }

      fetchingSettingsRef.current = true;
      try {
        const data = await settingsApi.getSettings(signal);
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
        fetchingSettingsRef.current = false;
      }
    },
    [settingsApi, settings, dispatch]
  );

  // Automatically fetch settings when OS is loaded
  useAsyncEffect(
    async signal => {
      if (!isOsConfigReady(os) || settings || fetchingSettingsRef.current) return;
      await getSettings(signal);
    },
    [serverUrl, version, orgId, getSettings],
    {
      onError: err =>
        handleErrorUnlessAborted(err, {
          component: 'useSaaSSettings',
          action: 'fetchSettings',
          metadata: { serverUrl, version, orgId },
        }),
    }
  );

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      settings,
      getSettings,
    }),
    [settings, getSettings]
  );
}
