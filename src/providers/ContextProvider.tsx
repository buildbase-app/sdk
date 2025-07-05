import React, { createContext, useMemo, useContext as useReactContext } from 'react';
import { Context } from '../api';
import '../styles/globals.css';
import { SaaSOSContextValue, SaaSOSProviderProps } from '../types';
import { AuthProvider } from './auth/provider';
import PortalProvider from './portalProvider';
import { WorkspaceProvider } from './workspace/provider';

const SaaSOSContext = createContext<SaaSOSContextValue | null>(null);

// Error boundary for form components
class FormErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong with the form component.</div>;
    }
    return this.props.children;
  }
}

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
  const contextValue = useMemo(
    () => ({
      context: new Context(serverUrl, version, orgId, auth),
    }),
    [serverUrl, version, orgId, auth]
  );

  return (
    <FormErrorBoundary>
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
                },
              }}
              onAuthStateChange={auth.onAuthStateChange}
            >
              <WorkspaceProvider>{children}</WorkspaceProvider>
            </AuthProvider>
          )}
          {!auth && <>{children}</>}
        </PortalProvider>
      </SaaSOSContext.Provider>
    </FormErrorBoundary>
  );
};
