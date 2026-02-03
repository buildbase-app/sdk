'use client';

import React, { useEffect, useMemo } from 'react';
import { osActions, useAppDispatch } from '../contexts';
import { handleError } from '../lib/error-handler';
import { useAsyncEffect } from '../lib/useAsyncEffect';
import type { IAuthConfig } from './auth/types';
import { useSaaSOs } from './os/hooks';
import { SettingsApi } from './os/api';
import { isOsConfigReady, type IOsState } from './os/types';

interface ContextConfigProviderProps {
  config: IOsState;
  auth?: IAuthConfig;
  children: React.ReactNode;
}

/**
 * Context Config Provider
 * Initializes OS configuration in Context API mode
 * Similar to SaaSConfigProvider but for Context API
 */
export const ContextConfigProvider: React.FC<ContextConfigProviderProps> = React.memo(
  ({ config, auth, children }) => {
    const dispatch = useAppDispatch();
    const os = useSaaSOs();

    // Memoize auth config to prevent unnecessary updates
    // Store full auth config including callbacks so they can be accessed in hooks
    const authConfig = React.useMemo(
      () => ({
        clientId: auth?.clientId || '',
        redirectUrl: auth?.redirectUrl || '',
        callbacks: auth?.callbacks,
      }),
      [auth?.clientId, auth?.redirectUrl, auth?.callbacks]
    );

    // Set OS config
    useEffect(() => {
      dispatch.os(
        osActions.setSaaSOSConfig({
          ...config,
          auth: authConfig,
        })
      );
    }, [config, authConfig, dispatch]);

    // Automatically fetch settings when OS is loaded (via centralized SettingsApi)
    const settingsApi = useMemo(
      () => (isOsConfigReady(os) ? new SettingsApi(os) : null),
      [os.serverUrl, os.version, os.orgId]
    );

    useAsyncEffect(
      async signal => {
        if (!settingsApi || os.settings) return;
        const data = await settingsApi.getSettings(signal);
        dispatch.os(osActions.setSettings(data));
      },
      [settingsApi, os.settings, dispatch],
      {
        onError: err =>
          handleError(err, {
            component: 'ContextConfigProvider',
            action: 'fetchSettings',
            metadata: {
              serverUrl: os.serverUrl,
              version: os.version,
              orgId: os.orgId,
            },
          }),
      }
    );

    return <>{children}</>;
  }
);

ContextConfigProvider.displayName = 'ContextConfigProvider';
