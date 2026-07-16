'use client';

/**
 * @buildbase/sdk/react
 *
 * Client-side React entry point.
 * Re-exports everything from core (types, utils, API classes) so users
 * can import everything from a single path:
 *
 *   import { SaaSOSProvider, useSubscription, formatCents, type ISubscription } from "@buildbase/sdk/react"
 *   import "@buildbase/sdk/css"
 */

// Import styles so they're included in the CSS extraction
import './styles/globals.css';

// ─── Core re-exports (so React users rarely need a second import) ──────────────
// Values AND types: the generated d.ts flattens `export type *` into value
// exports, so a type-only re-export here would declare runtime values that
// don't exist (README examples like `import { Permission } from '…/react'`
// would compile and then crash). core.ts is framework-agnostic, so re-exporting
// values is safe for client bundles.
export * from './core';

// ─── Main Provider ─────────────────────────────────────────────────────────────
export { SaaSOSProvider } from './providers/SaaSOSProvider';
export type { SaaSOSProviderProps } from './providers/SaaSOSProvider';
// Brand-aligned alias (the package is @buildbase/sdk): same component, same
// props — new code should prefer BuildBaseProvider; SaaSOSProvider stays
// supported indefinitely.
export { SaaSOSProvider as BuildBaseProvider } from './providers/SaaSOSProvider';
export type { SaaSOSProviderProps as BuildBaseProviderProps } from './providers/SaaSOSProvider';

// ─── Auth Hooks & Gate Components ──────────────────────────────────────────────
export { WhenAuthenticated, WhenUnauthenticated } from './components/user/auth';
export { useFullScreenLoader } from './contexts/FullScreenLoaderContext';
export type { LoadingProps } from './contexts/FullScreenLoaderContext';
export { useSaaSAuth } from './providers/auth/hooks';

// ─── Role Gate Components ──────────────────────────────────────────────────────
export { WhenRoles, WhenWorkspaceRoles } from './components/user/role';

// ─── Permission Gate Components & Hook ────────────────────────────────────────
export { WhenPermission } from './components/permission';
export { usePermissions } from './hooks/usePermissions';

// ─── Connected Agents (screen + headless hook) ─────────────────────────────────
export {
  ConnectMcpGuide,
  ConnectedAgents,
  ConnectedAgentsApi,
  useConnectedAgents,
  useConnectedAgentsApi,
} from './components/connected-agents';
export type {
  ConnectMcpGuideProps,
  ConnectedAgentsProps,
  IConnectedAgent,
  UseConnectedAgents,
} from './components/connected-agents';
export { Devices, DevicesApi, useDevices, useDevicesApi } from './components/devices';
export type { DevicesProps, IDeviceView, IIpInfoLite, UseDevices } from './components/devices';
export { Sessions, SessionsApi, useSessions, useSessionsApi } from './components/sessions';
export type { ISessionView, SessionsProps, UseSessions } from './components/sessions';
export { fillMcpTemplate, mcpServerKey, useMcpConnection } from './contexts/McpConfigContext';
export type { McpClientGuide, McpConnectionConfig } from './contexts/McpConfigContext';

// ─── Feature Gate Components ───────────────────────────────────────────────────
export {
  WhenUserFeatureDisabled,
  WhenUserFeatureEnabled,
  WhenWorkspaceFeatureDisabled,
  WhenWorkspaceFeatureEnabled,
} from './components/features';

// ─── Subscription Gate Components ──────────────────────────────────────────────
export {
  WhenNoSubscription,
  WhenNotTrialing,
  WhenSubscription,
  WhenSubscriptionToPlans,
  WhenTrialEnding,
  WhenTrialing,
} from './components/subscription';

// ─── Quota Gate Components ─────────────────────────────────────────────────────
export {
  WhenQuotaAvailable,
  WhenQuotaExhausted,
  WhenQuotaOverage,
  WhenQuotaThreshold,
} from './components/quota';

// ─── Credit Components ────────────────────────────────────────────────────────
export {
  CreditActionsProvider,
  CreditBalance,
  CreditStorePage,
  WhenCreditsAvailable,
  WhenCreditsExhausted,
  WhenCreditsLow,
} from './components/credit';
export type {
  CreditActionsDetails,
  CreditBalanceDetails,
  CreditStorePageDetails,
} from './components/credit';

// ─── Context Providers ─────────────────────────────────────────────────────────
export {
  SubscriptionContextProvider,
  useSubscriptionContext,
} from './contexts/SubscriptionContext';
export type { SubscriptionContextValue } from './contexts/SubscriptionContext';

export { QuotaUsageContextProvider, useQuotaUsageContext } from './contexts/QuotaUsageContext';
export type { QuotaUsageContextValue } from './contexts/QuotaUsageContext';

export {
  CreditBalanceContextProvider,
  useCreditBalanceContext,
} from './contexts/CreditBalanceContext';
export type { CreditBalanceContextValue } from './contexts/CreditBalanceContext';

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export { useSaaSOs, useSaaSSettings } from './providers/os/hooks';
export { useUserAttributes, useUserFeatures } from './providers/user/hooks';
export { useSaaSWorkspaces } from './providers/workspace/hooks';

export {
  useAllQuotaUsage,
  useBillingPortal,
  useCancelSubscription,
  useCreateCheckoutSession,
  useInvoice,
  useInvoices,
  usePlanGroup,
  usePlanGroupVersions,
  usePublicPlanGroupVersion,
  usePublicPlans,
  useQuotaUsageStatus,
  useRecordUsage,
  useResumeSubscription,
  useSubscription,
  useSubscriptionManagement,
  useUpdateSubscription,
  useUsageLogs,
} from './providers/workspace/subscription-hooks';

export {
  useConsumeCredits,
  useCreditBalance,
  useCreditPackages,
  useCreditTransactions,
  useExpiringCredits,
  usePublicCreditPackages,
  usePurchaseCredits,
} from './providers/workspace/credit-hooks';

export { useTrialStatus } from './hooks/use-trial-status';
export type { TrialStatus } from './hooks/use-trial-status';

export { useSeatStatus } from './hooks/use-seat-status';
export type { SeatStatus } from './hooks/use-seat-status';

// ─── UI Components ─────────────────────────────────────────────────────────────
export { BetaForm } from './components/beta/BetaForm';
export { PricingPage } from './components/pricing';
export type { PricingPageDetails, PricingPageProps } from './components/pricing';
export { EmptyState } from './components/ui/empty-state';
export type { EmptyStateProps } from './components/ui/empty-state';
export { FullScreenLoader } from './components/ui/full-screen-loader';
export type { FullScreenLoaderProps } from './components/ui/full-screen-loader';
export { LoadingState } from './components/ui/loading-state';
export type { LoadingStateProps } from './components/ui/loading-state';
export { SectionHeader } from './components/ui/section-header';
export type { SectionHeaderProps } from './components/ui/section-header';
export { SidebarNavItem, SidebarNavSection } from './components/ui/sidebar-nav';
export type { SidebarNavItemProps, SidebarNavSectionProps } from './components/ui/sidebar-nav';
export { StatusBanner } from './components/ui/status-banner';
export type { StatusBannerProps, StatusBannerVariant } from './components/ui/status-banner';
export { WorkspaceSwitcher } from './providers/workspace/provider';

export {
  PushNotificationProvider,
  usePushNotifications,
} from './providers/push/PushNotificationContext';

// ─── Translations ──────────────────────────────────────────────────────────────
export { SUPPORTED_LOCALES, useTranslation } from './i18n';
export type { PartialSDKMessages, SDKLocale, SDKMessages } from './i18n';

// ─── UI Config ─────────────────────────────────────────────────────────────────
export { mergeUIConfig, useUIConfig } from './contexts/UIConfigContext';
export type { SDKUIConfig } from './contexts/UIConfigContext';
export { useUIVisibility } from './hooks/useUIVisibility';

// ─── Settings Screen Constants ─────────────────────────────────────────────────
export { SETTINGS_SCREENS, SettingsScreen } from './providers/workspace/settings-screens';
export type { WorkspaceSettingsSection } from './providers/workspace/settings-screens';

// ─── Settings Manager (programmatic control) ─────────────────────────────────
export { workspaceSettingsManager } from './providers/workspace/settings-manager';
export type { SettingsManagerState } from './providers/workspace/settings-manager';
