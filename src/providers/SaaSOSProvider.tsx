'use client';

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '../store';
import '../styles/globals.css';
import SaaSConfigProvider from './os/provider';
import { IOsState } from './os/types';
import PortalProvider from './PortalContainer';

export const SaaSOSProvider: React.FC<IOsState & { children: React.ReactNode }> = ({
  serverUrl,
  version,
  orgId,
  auth,
  children,
}) => {
  return (
    <ReduxProvider store={store}>
      <PortalProvider>
        <SaaSConfigProvider config={{ serverUrl, version, orgId }} auth={auth}>
          {children}
        </SaaSConfigProvider>
      </PortalProvider>
    </ReduxProvider>
  );
};
