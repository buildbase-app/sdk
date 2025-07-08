'use client';

import React from 'react';
import '../styles/globals.css';
import PortalProvider from './PortalContainer';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '../store';
import SaaSConfigProvider from './os/provider';
import { IOsState } from './os/types';

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
