import React, { createContext, useMemo, useContext as useReactContext } from 'react';
import { Context } from '../api';
import '../styles/globals.css';
import { SaaSOSContextValue, SaaSOSProviderProps } from '../types';
import { AuthProvider } from './auth/provider';
import PortalProvider from './portalProvider';

const SaaSOSContext = createContext<SaaSOSContextValue | null>(null);

/**
 * Hook to access the SaaS OS SDK context
 * @returns The SaaS OS SDK context instance
 * @throws Error if used outside of SaaSOSProvider
 */
export const useSaaSOS = () => {
  const context = useReactContext(SaaSOSContext);
  if (!context) {
    throw new Error('useSaaSOS must be used within a SaaSOSProvider');
  }
  return context;
};

/**
 * Provider component for SaaS OS SDK
 * @param props - The provider props
 * @returns The provider component
 */
export const SaaSOSProvider: React.FC<SaaSOSProviderProps> = ({
  serverUrl,
  version,
  orgId,
  auth,
  children,
}) => {
  const contextValue = useMemo(() => {
    return {
      context: new Context(serverUrl, version, orgId, auth),
    };
  }, [serverUrl, version, orgId, auth]);

  return (
    <SaaSOSContext.Provider value={contextValue}>
      <PortalProvider>
        {auth && (
          <AuthProvider
            config={{
              apiUrl: serverUrl,
              auth: {
                serverUrl: serverUrl,
                orgId: orgId,
                clientId: auth.clientId,
                handleAuthentication: auth.handleAuthentication,
                verifyToken: auth.verifyToken,
              },
            }}
          >
            {children}
          </AuthProvider>
        )}
        {!auth && <>{children}</>}
      </PortalProvider>
    </SaaSOSContext.Provider>
  );
};
