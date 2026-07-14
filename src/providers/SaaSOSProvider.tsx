'use client';

import React, { useEffect } from 'react';
import { SDKErrorBoundary } from '../components/ErrorBoundary';
import { SDKContextProvider } from '../contexts';

import type { GetCheckoutStripeParams } from '../api/types';
import { CheckoutConfigProvider } from '../contexts/CheckoutConfigContext';
import { CreditBalanceContextProvider } from '../contexts/CreditBalanceContext';
import { FullScreenLoaderProvider } from '../contexts/FullScreenLoaderContext';
import { McpConfigProvider, type McpConnectionConfig } from '../contexts/McpConfigContext';
import { PermissionConfigProvider } from '../contexts/PermissionContext';
import { QuotaUsageContextProvider } from '../contexts/QuotaUsageContext';
import { SubscriptionContextProvider } from '../contexts/SubscriptionContext';
import type { SDKUIConfig } from '../contexts/UIConfigContext';
import { UIConfigProvider } from '../contexts/UIConfigContext';
import type { SDKLocale } from '../i18n';
import { TranslationProvider } from '../i18n';
import '../styles/globals.css';
import { AuthProviderWrapper } from './auth/provider';
import { ContextConfigProvider } from './ContextConfigProvider';
import { eventEmitter } from './events';
import { ApiVersion, IOsState } from './os/types';
import PortalProvider from './PortalContainer';
import { PushNotificationProvider } from './push/PushNotificationContext';
import { UserProvider } from './user/provider';
import { WorkspaceProvider } from './workspace/lifecycle';
import { WorkspaceSettingsProvider } from './workspace/WorkspaceSettingsProvider';

export interface SaaSOSProviderProps extends IOsState {
  children: React.ReactNode;
  /** SDK UI language. Defaults to 'en'. Supported: en, es, fr, de, ja, zh, hi, ar */
  locale?: SDKLocale;
  /**
   * Default app permissions per role.
   * Defines what permissions exist in your app and which roles get them by default.
   * Workspace owners can customize per-workspace via the Settings → Permissions screen.
   *
   * @example
   * ```tsx
   * <SaaSOSProvider
   *   defaultPermissions={{
   *     admin: ['projects:create', 'projects:delete', 'reports:export'],
   *     editor: ['projects:create', 'reports:export'],
   *     member: ['projects:view'],
   *   }}
   * >
   * ```
   */
  defaultPermissions?: Record<string, string[]>;
  /**
   * Async callback called before every Stripe checkout session is created.
   * Use it to return Stripe-level params (metadata, client reference ID, subscription metadata)
   * that will be forwarded to the Stripe checkout session.
   *
   * @example
   * ```tsx
   * <SaaSOSProvider
   *   getCheckoutStripeParams={async (request) => ({
   *     clientReferenceId: await getRewardfulReferralId(),
   *     metadata: { campaign: 'spring-sale' },
   *     subscriptionMetadata: { affiliateId: 'aff-123' },
   *   })}
   * >
   * ```
   */
  getCheckoutStripeParams?: GetCheckoutStripeParams;
  /**
   * Custom content or render function for the full-screen loading overlay.
   * Used during auth code exchange, and available to any SDK feature via `useFullScreenLoader()`.
   * The SDK handles the full-screen white backdrop, centering, and messages — you just render.
   *
   * - Pass a `ReactNode` for static content (logo, spinner).
   * - Pass a function to receive `{ message }` — the SDK manages which message to show.
   *
   * If not provided, a default spinner with status message is shown.
   *
   * @example Static content
   * ```tsx
   * <SaaSOSProvider
   *   loadingComponent={
   *     <>
   *       <img src="/logo.svg" alt="Logo" />
   *       <p>Signing you in...</p>
   *     </>
   *   }
   * >
   * ```
   *
   * @example Render function with message
   * ```tsx
   * <SaaSOSProvider
   *   loadingComponent={({ message }) => (
   *     <>
   *       <img src="/logo.svg" alt="Logo" />
   *       <p>{message}</p>
   *     </>
   *   )}
   * >
   * ```
   */
  loadingComponent?:
    | React.ReactNode
    | ((props: import('../contexts/FullScreenLoaderContext').LoadingProps) => React.ReactNode);
  /**
   * UI configuration — control which parts of the SDK UI are shown and
   * override individual UI strings. Everything defaults to visible/current
   * behavior; visibility options only hide UI and never bypass permissions.
   *
   * @example Hide settings sections and rebrand a label
   * ```tsx
   * <SaaSOSProvider
   *   ui={{
   *     settings: { sections: { credits: false, notifications: false } },
   *     messages: { settings: { sidebar: { subscription: 'Billing' } } },
   *   }}
   * >
   * ```
   */
  ui?: SDKUIConfig;
  /**
   * MCP server connection info. When set, the Connected Agents screen shows a
   * "How to connect an agent" guide (copyable server URL + per-client setup
   * snippets). Read anywhere via `useMcpConnection()`.
   *
   * @example
   * ```tsx
   * <SaaSOSProvider
   *   mcp={{
   *     url: 'https://app.example.com/api/mcp',
   *     name: 'Acme',
   *     docsUrl: 'https://docs.example.com/agents',
   *   }}
   * >
   * ```
   */
  mcp?: McpConnectionConfig;
}

/**
 * Main provider component for the BuildBase SDK.
 * Must wrap your application to enable all SDK features (auth, workspaces, etc.).
 *
 * @param props - Provider props extending IOsState
 * @param props.serverUrl - Base URL of the BuildBase API server (must be valid URL)
 * @param props.version - API version (currently only 'v1' is supported)
 * @param props.orgId - Organization ID (must be valid MongoDB ObjectId - 24 hex characters)
 * @param props.auth - Optional authentication configuration
 * @param props.auth.clientId - OAuth client ID for authentication
 * @param props.auth.redirectUrl - URL to redirect to after OAuth flow
 * @param props.auth.callbacks - Optional callbacks for auth events
 * @param props.children - React children to render
 *
 * @throws {Error} If serverUrl is invalid, version is not 'v1', or orgId is not a valid MongoDB ObjectId
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SaaSOSProvider
 *       serverUrl="https://api.console.buildbase.app"
 *       version="v1"
 *       orgId="507f1f77bcf86cd799439011"
 *       auth={{
 *         clientId: "your-client-id",
 *         redirectUrl: window.location.origin,
 *       }}
 *     >
 *       <YourApp />
 *     </SaaSOSProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With auth callbacks
 * function App() {
 *   return (
 *     <SaaSOSProvider
 *       serverUrl="https://api.console.buildbase.app"
 *       version="v1"
 *       orgId="507f1f77bcf86cd799439011"
 *       auth={{
 *         clientId: "your-client-id",
 *         redirectUrl: window.location.origin,
 *         callbacks: {
 *           onSignOut: async () => {
 *             // Custom cleanup
 *             await clearLocalStorage();
 *           },
 *           handleEvent: (event) => {
 *             console.log('SDK event:', event);
 *           },
 *         },
 *       }}
 *     >
 *       <YourApp />
 *     </SaaSOSProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Edge case: Invalid configuration
 * function App() {
 *   try {
 *     return (
 *       <SaaSOSProvider
 *         serverUrl="invalid-url"
 *         version="v1"
 *         orgId="invalid-id"
 *       >
 *         <YourApp />
 *       </SaaSOSProvider>
 *     );
 *   } catch (error) {
 *     // Error thrown during render: "Invalid serverUrl: ..."
 *     return <ErrorPage error={error} />;
 *   }
 * }
 * ```
 */

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

const SaaSOSProviderInner: React.FC<SaaSOSProviderProps> = React.memo(
  ({
    serverUrl,
    version,
    orgId,
    auth,
    locale,
    defaultPermissions,
    getCheckoutStripeParams,
    loadingComponent,
    ui,
    mcp,
    children,
  }) => {
    // Validate props synchronously - throws are caught by the parent SDKErrorBoundary
    validateProps(serverUrl, version, orgId);

    // Memoize config to prevent unnecessary re-renders in ContextConfigProvider
    const config = React.useMemo(
      () => ({ serverUrl, version, orgId }),
      [serverUrl, version, orgId]
    );

    // Memoize callbacks by individual function references to avoid re-renders
    // when parent creates a new callbacks object with the same functions
    const memoizedCallbacks = React.useMemo(
      () => auth?.callbacks,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        auth?.callbacks?.handleAuthentication,
        auth?.callbacks?.onSignOut,
        auth?.callbacks?.getSession,
        auth?.callbacks?.onSessionExpired,
        auth?.callbacks?.handleEvent,
        auth?.callbacks?.onWorkspaceChange,
      ]
    );

    const memoizedHandleEvent = auth?.callbacks?.handleEvent;

    // Set event handler in the event emitter
    useEffect(() => {
      eventEmitter.setCallbacks(memoizedHandleEvent ? { handleEvent: memoizedHandleEvent } : null);
      return () => {
        // Cleanup: remove callbacks when component unmounts
        eventEmitter.setCallbacks(null);
      };
    }, [memoizedHandleEvent]);

    return (
      <TranslationProvider locale={locale} messageOverrides={ui?.messages}>
        <SDKContextProvider>
          <FullScreenLoaderProvider loadingComponent={loadingComponent}>
            <AuthProviderWrapper callbacks={memoizedCallbacks}>
              <PortalProvider>
                <ContextConfigProvider config={config} auth={auth}>
                  <WorkspaceProvider>
                    <CheckoutConfigProvider getCheckoutStripeParams={getCheckoutStripeParams}>
                      <PermissionConfigProvider appPermissions={defaultPermissions}>
                        <UIConfigProvider ui={ui}>
                          <McpConfigProvider mcp={mcp}>
                            <UserProvider>
                              <SubscriptionContextProvider>
                                <QuotaUsageContextProvider>
                                  <CreditBalanceContextProvider>
                                    <PushNotificationProvider>
                                      <WorkspaceSettingsProvider>
                                        {children}
                                      </WorkspaceSettingsProvider>
                                    </PushNotificationProvider>
                                  </CreditBalanceContextProvider>
                                </QuotaUsageContextProvider>
                              </SubscriptionContextProvider>
                            </UserProvider>
                          </McpConfigProvider>
                        </UIConfigProvider>
                      </PermissionConfigProvider>
                    </CheckoutConfigProvider>
                  </WorkspaceProvider>
                </ContextConfigProvider>
              </PortalProvider>
            </AuthProviderWrapper>
          </FullScreenLoaderProvider>
        </SDKContextProvider>
      </TranslationProvider>
    );
  }
);

SaaSOSProviderInner.displayName = 'SaaSOSProviderInner';

export const SaaSOSProvider: React.FC<SaaSOSProviderProps> = ({ children, ...props }) => {
  return (
    <SDKErrorBoundary
      errorTitle={props.ui?.errorBoundary?.title}
      retryLabel={props.ui?.errorBoundary?.retryLabel}
    >
      <SaaSOSProviderInner {...props}>{children}</SaaSOSProviderInner>
    </SDKErrorBoundary>
  );
};

SaaSOSProvider.displayName = 'SaaSOSProvider';
