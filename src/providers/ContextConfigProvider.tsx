'use client';

import React, { useEffect } from 'react';
import { osActions, useAppDispatch } from '../contexts';
import type { IAuthConfig } from './auth/types';
import { useSaaSOs } from './os/hooks';
import type { IOsState } from './os/types';

interface ContextConfigProviderProps {
  config: IOsState;
  auth?: IAuthConfig;
  children: React.ReactNode;
}

/**
 * Context Config Provider
 * Initializes OS configuration in Context API mode.
 * Only sets config — settings are fetched by useSaaSSettings() which has
 * built-in deduplication via module-level promise guard.
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
      // Depend on individual values — survives parent creating new auth object with same values
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [auth?.clientId, auth?.redirectUrl, auth?.callbacks]
    );

    // Set OS config — settings are fetched separately by useSaaSSettings()
    useEffect(() => {
      dispatch.os(
        osActions.setSaaSOSConfig({
          ...config,
          auth: authConfig,
        })
      );
    }, [config, authConfig, dispatch]);

    return <>{children}</>;
  }
);

ContextConfigProvider.displayName = 'ContextConfigProvider';
