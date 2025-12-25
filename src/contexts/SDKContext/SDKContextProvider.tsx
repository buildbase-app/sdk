'use client';

import React, { type ReactNode, useMemo } from 'react';
import { AuthContextProvider } from '../AuthContext';
import { OSContextProvider } from '../OSContext';
import { WorkspaceContextProvider } from '../WorkspaceContext';

/**
 * SDK Context Provider
 * Combines all context providers in the correct order
 *
 * Provider hierarchy:
 * 1. OSContextProvider - Base configuration (serverUrl, version, orgId)
 * 2. AuthContextProvider - Authentication context (state management)
 * 3. WorkspaceContextProvider - Workspace context (state management)
 *
 * Note: The AuthProviderWrapper (from providers/auth/provider.tsx) should wrap this
 * to add authentication logic like token handling and callbacks.
 *
 * This order ensures dependencies are available when needed.
 */
export const SDKContextProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // Memoize children to prevent unnecessary re-renders of the provider tree
  const memoizedChildren = useMemo(() => children, [children]);

  return (
    <OSContextProvider>
      <AuthContextProvider>
        <WorkspaceContextProvider>{memoizedChildren}</WorkspaceContextProvider>
      </AuthContextProvider>
    </OSContextProvider>
  );
});

SDKContextProvider.displayName = 'SDKContextProvider';

