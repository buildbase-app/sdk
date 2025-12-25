'use client';

import React from 'react';
import { SDKContextProvider } from '../contexts';
import '../styles/globals.css';
import { AuthProviderWrapper } from './auth/provider';
import { ContextConfigProvider } from './ContextConfigProvider';
import { IOsState } from './os/types';
import PortalProvider from './PortalContainer';

export interface SaaSOSProviderProps extends IOsState {
  children: React.ReactNode;
}

export const SaaSOSProvider: React.FC<SaaSOSProviderProps> = ({
  serverUrl,
  version,
  orgId,
  auth,
  children,
}) => {
  // Memoize config to prevent unnecessary re-renders in ContextConfigProvider
  const config = React.useMemo(
    () => ({ serverUrl, version, orgId }),
    [serverUrl, version, orgId]
  );
  return (
    <SDKContextProvider>
      <AuthProviderWrapper callbacks={auth?.callbacks}>
        <PortalProvider>
          <ContextConfigProvider config={config} auth={auth}>
            {children}
          </ContextConfigProvider>
        </PortalProvider>
      </AuthProviderWrapper>
    </SDKContextProvider>
  );
};
