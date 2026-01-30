import { useCallback, useMemo, useRef } from 'react';
import { osActions, useAppDispatch, useAppSelector } from '../../contexts';
import { isAbortError, safeFetch } from '../../lib/api-utils';
import { useAsyncEffect } from '../../lib/useAsyncEffect';
import { getAuthHeaders } from '../auth/utils';
import type { ISettings } from '../types';

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
  const os = useAppSelector(state => state.os);
  const { serverUrl, version, orgId, settings } = os;
  const fetchingSettingsRef = useRef(false);

  const getSettings = useCallback(
    async (signal?: AbortSignal) => {
      // Prevent duplicate requests - check if settings already exist or request in progress
      if (fetchingSettingsRef.current) {
        return settings || null;
      }

      // If settings already loaded, return them immediately without making a request
      if (settings) {
        return settings;
      }

      // Don't fetch if OS config is not ready
      if (!serverUrl || !version || !orgId) {
        return null;
      }

      fetchingSettingsRef.current = true;
      try {
        const headers = getAuthHeaders();

        const response = await safeFetch(
          `${serverUrl}/api/${version}/public/${orgId}/settings`,
          { headers, signal }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }

        const data: ISettings = await response.json();
        dispatch.os(osActions.setSettings(data));
        return data;
      } catch (err) {
        // Ignore abort - request was cancelled
        if (isAbortError(err)) return null;
        console.error('Failed to fetch settings:', err);
        return null;
      } finally {
        fetchingSettingsRef.current = false;
      }
    },
    [serverUrl, version, orgId, settings, dispatch]
  );

  // Automatically fetch settings when OS is loaded
  useAsyncEffect(
    async signal => {
      if (!serverUrl || !version || !orgId || settings || fetchingSettingsRef.current) return;
      await getSettings(signal);
    },
    [serverUrl, version, orgId, getSettings],
    {
      onError: err => console.error('Failed to fetch settings:', err),
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
