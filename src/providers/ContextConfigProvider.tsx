'use client';

import React, { useEffect } from 'react';
import { osActions, useAppDispatch } from '../contexts';
import type { IAuthConfig } from './auth/types';
import type { IOsState } from './os/types';

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

    // Memoize auth config to prevent unnecessary updates
    const authConfig = React.useMemo(
      () => ({
        clientId: auth?.clientId || '',
        redirectUrl: auth?.redirectUrl || '',
      }),
      [auth?.clientId, auth?.redirectUrl]
    );

    useEffect(() => {
      dispatch.os(
        osActions.setSaaSOSConfig({
          ...config,
          auth: authConfig,
        })
      );
    }, [config, authConfig, dispatch]);

    // Memoize children to prevent unnecessary re-renders
    const memoizedChildren = React.useMemo(() => children, [children]);
    return <>{memoizedChildren}</>;
  }
);

ContextConfigProvider.displayName = 'ContextConfigProvider';
