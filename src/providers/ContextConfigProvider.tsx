'use client';

import React, { useEffect } from 'react';
import { useOSDispatch } from '../contexts';
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
export const ContextConfigProvider: React.FC<ContextConfigProviderProps> = ({
  config,
  auth,
  children,
}) => {
  const dispatch = useOSDispatch();

  useEffect(() => {
    dispatch({
      type: 'SET_SAAS_OS_CONFIG',
      payload: {
        ...config,
        auth: {
          clientId: auth?.clientId || '',
          redirectUrl: auth?.redirectUrl || '',
        },
      },
    });
  }, [config, auth, dispatch]);

  return <>{children}</>;
};
