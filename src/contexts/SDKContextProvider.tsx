'use client';

import React, { type ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { OSProvider } from './OSContext';
import { WorkspaceProvider } from './WorkspaceContext';

/**
 * SDK Context Provider
 * Combines all context providers in the correct order
 *
 * Provider hierarchy:
 * 1. OSProvider - Base configuration (serverUrl, version, orgId)
 * 2. AuthProvider - Authentication state
 * 3. WorkspaceProvider - Workspace management (depends on auth)
 *
 * This order ensures dependencies are available when needed.
 */
export const SDKContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <OSProvider>
      <AuthProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </AuthProvider>
    </OSProvider>
  );
};
