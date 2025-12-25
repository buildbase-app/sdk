import { useCallback, useEffect, useMemo, useRef } from 'react';
import { osActions, useAppDispatch, useAppSelector } from '../../contexts';
import { getAccessToken } from '../auth/utils';
import type { ISettings } from '../types';

export function useSaaSSettings() {
  const dispatch = useAppDispatch();
  const os = useAppSelector(state => state.os);
  const { serverUrl, version, orgId, settings } = os;
  const fetchingSettingsRef = useRef(false);

  const getSettings = useCallback(async () => {
    // Prevent duplicate requests - check if settings already exist or request in progress
    if (fetchingSettingsRef.current) {
      // If request is in progress, return existing settings or null
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
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${serverUrl}/api/${version}/public/${orgId}/settings`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data: ISettings = await response.json();
      dispatch.os(osActions.setSettings(data));
      return data;
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      return null;
    } finally {
      fetchingSettingsRef.current = false;
    }
  }, [serverUrl, version, orgId, settings, dispatch]);

  // Automatically fetch settings when OS is loaded
  useEffect(() => {
    // Only fetch if OS config is ready and settings haven't been loaded yet
    if (serverUrl && version && orgId && !settings && !fetchingSettingsRef.current) {
      getSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, version, orgId]); // Only depend on OS config, not settings or getSettings

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      settings,
      getSettings,
    }),
    [settings, getSettings]
  );
}
