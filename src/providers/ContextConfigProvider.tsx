'use client';

import React, { useEffect } from 'react';
import { osActions, useAppDispatch, useAppSelector } from '../contexts';
import { handleError } from '../lib/error-handler';
import type { IAuthConfig } from './auth/types';
import { getAuthHeaders } from './auth/utils';
import type { IOsState } from './os/types';
import type { ISettings } from './types';

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
    const os = useAppSelector(state => state.os);

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

    // Automatically fetch settings when OS is loaded
    useEffect(() => {
      const { serverUrl, version, orgId, settings } = os;

      // Only fetch if OS config is ready and settings haven't been loaded yet
      if (serverUrl && version && orgId && !settings) {
        const fetchSettings = async () => {
          try {
            const headers = getAuthHeaders();
            const response = await fetch(`${serverUrl}/api/${version}/public/${orgId}/settings`, {
              headers,
            });
            if (response.ok) {
              const data: ISettings = await response.json();
              dispatch.os(osActions.setSettings(data));
            }
            } catch (err) {
              handleError(err, {
                component: 'ContextConfigProvider',
                action: 'fetchSettings',
                metadata: { serverUrl, version, orgId },
              });
            }
        };

        fetchSettings();
      }
    }, [os.serverUrl, os.version, os.orgId, os.settings, dispatch]);

    return <>{children}</>;
  }
);

ContextConfigProvider.displayName = 'ContextConfigProvider';
