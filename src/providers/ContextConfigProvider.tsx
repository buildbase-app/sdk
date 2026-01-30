'use client';

import React, { useEffect } from 'react';
import { osActions, useAppDispatch, useAppSelector } from '../contexts';
import { handleError } from '../lib/error-handler';
import { safeFetch } from '../lib/api-utils';
import { useAsyncEffect } from '../lib/useAsyncEffect';
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
    useAsyncEffect(
      async signal => {
        const { serverUrl, version, orgId, settings } = os;
        if (!serverUrl || !version || !orgId || settings) return;

        const headers = getAuthHeaders();
        const response = await safeFetch(
          `${serverUrl}/api/${version}/public/${orgId}/settings`,
          { headers, signal }
        );
        if (response.ok) {
          const data: ISettings = await response.json();
          dispatch.os(osActions.setSettings(data));
        }
      },
      [os.serverUrl, os.version, os.orgId, os.settings, dispatch],
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
