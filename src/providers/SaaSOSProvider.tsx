'use client';

import React from 'react';
import { SDKContextProvider } from '../contexts';
import '../styles/globals.css';
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
  const config = { serverUrl, version, orgId };
  return (
    <SDKContextProvider>
      <PortalProvider>
        <ContextConfigProvider config={config} auth={auth}>
          {children}
        </ContextConfigProvider>
      </PortalProvider>
    </SDKContextProvider>
  );
};
