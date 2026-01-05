'use client';

import React, { useEffect } from 'react';
import { SDKErrorBoundary } from '../components/ErrorBoundary';
import { SDKContextProvider } from '../contexts';
import '../styles/globals.css';
import { AuthProviderWrapper } from './auth/provider';
import { ContextConfigProvider } from './ContextConfigProvider';
import { eventEmitter } from './events';
import { ApiVersion, IOsState } from './os/types';
import PortalProvider from './PortalContainer';
import { UserProvider } from './user/provider';
import { WorkspaceSettingsProvider } from './workspace/WorkspaceSettingsProvider';

export interface SaaSOSProviderProps extends IOsState {
  children: React.ReactNode;
}

/**
 * Validates if a string is a valid MongoDB ObjectId
 * MongoDB ObjectId must be exactly 24 hexadecimal characters
 */
const isValidMongoDBId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validates if a string is a valid URL
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates SaaSOSProvider props
 */
const validateProps = (serverUrl: string, version: ApiVersion, orgId: string): void => {
  // Validate version - only v1 is supported
  if (version !== ApiVersion.V1) {
    throw new Error(
      `Invalid version: "${version}". Only "${ApiVersion.V1}" is currently supported.`
    );
  }

  // Validate serverUrl - must be a valid URL
  if (!serverUrl || typeof serverUrl !== 'string') {
    throw new Error('serverUrl is required and must be a string');
  }
  if (!isValidUrl(serverUrl)) {
    throw new Error(`Invalid serverUrl: "${serverUrl}". Must be a valid URL.`);
  }

  // Validate orgId - must be a valid MongoDB ObjectId
  if (!orgId || typeof orgId !== 'string') {
    throw new Error('orgId is required and must be a string');
  }
  if (!isValidMongoDBId(orgId)) {
    throw new Error(
      `Invalid orgId: "${orgId}". Must be a valid MongoDB ObjectId (24 hexadecimal characters).`
    );
  }
};

export const SaaSOSProvider: React.FC<SaaSOSProviderProps> = React.memo(
  ({ serverUrl, version, orgId, auth, children }) => {
    // Validate props synchronously - throw errors immediately if invalid
    validateProps(serverUrl, version, orgId);

    // Memoize config to prevent unnecessary re-renders in ContextConfigProvider
    const config = React.useMemo(
      () => ({ serverUrl, version, orgId }),
      [serverUrl, version, orgId]
    );

    // Memoize callbacks to prevent unnecessary re-renders
    const memoizedCallbacks = React.useMemo(() => auth?.callbacks, [auth?.callbacks]);

    // Memoize event handler from auth callbacks
    const memoizedHandleEvent = React.useMemo(
      () => auth?.callbacks?.handleEvent,
      [auth?.callbacks]
    );

    // Set event handler in the event emitter
    useEffect(() => {
      eventEmitter.setCallbacks(memoizedHandleEvent ? { handleEvent: memoizedHandleEvent } : null);
      return () => {
        // Cleanup: remove callbacks when component unmounts
        eventEmitter.setCallbacks(null);
      };
    }, [memoizedHandleEvent]);

    return (
      <SDKErrorBoundary>
        <SDKContextProvider>
          <AuthProviderWrapper callbacks={memoizedCallbacks}>
            <PortalProvider>
              <ContextConfigProvider config={config} auth={auth}>
                <UserProvider>
                  <WorkspaceSettingsProvider>{children}</WorkspaceSettingsProvider>
                </UserProvider>
              </ContextConfigProvider>
            </PortalProvider>
          </AuthProviderWrapper>
        </SDKContextProvider>
      </SDKErrorBoundary>
    );
  }
);

SaaSOSProvider.displayName = 'SaaSOSProvider';
