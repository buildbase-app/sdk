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

// ─── Core types (re-exported so React users rarely need a second import) ───────
// Only types — no runtime values. Runtime utils come from @buildbase/sdk directly.
export type * from './core';

// ─── Main Provider ─────────────────────────────────────────────────────────────
export { SaaSOSProvider } from './providers/SaaSOSProvider';
export type { SaaSOSProviderProps } from './providers/SaaSOSProvider';

// ─── Auth Hooks & Gate Components ──────────────────────────────────────────────
export { useSaaSAuth } from './providers/auth/hooks';
export { WhenAuthenticated, WhenUnauthenticated } from './components/user/auth';

// ─── Role Gate Components ──────────────────────────────────────────────────────
export { WhenRoles, WhenWorkspaceRoles } from './components/user/role';

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

// ─── Context Providers ─────────────────────────────────────────────────────────
export {
  SubscriptionContextProvider,
  useSubscriptionContext,
} from './contexts/SubscriptionContext';
export type { SubscriptionContextValue } from './contexts/SubscriptionContext';

export {
  QuotaUsageContextProvider,
  useQuotaUsageContext,
} from './contexts/QuotaUsageContext';
export type { QuotaUsageContextValue } from './contexts/QuotaUsageContext';

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

export { useTrialStatus } from './hooks/use-trial-status';
export type { TrialStatus } from './hooks/use-trial-status';

export { useSeatStatus } from './hooks/use-seat-status';
export type { SeatStatus } from './hooks/use-seat-status';

// ─── UI Components ─────────────────────────────────────────────────────────────
export { WorkspaceSwitcher } from './providers/workspace/provider';
export { BetaForm } from './components/beta/BetaForm';
export { PricingPage } from './components/pricing';
export type { PricingPageDetails, PricingPageProps } from './components/pricing';

export {
  PushNotificationProvider,
  usePushNotifications,
} from './providers/push/PushNotificationContext';

// ─── Translations ──────────────────────────────────────────────────────────────
export { useTranslation, SUPPORTED_LOCALES } from './i18n';
export type { SDKLocale, SDKMessages } from './i18n';

// ─── Settings Screen Constants ─────────────────────────────────────────────────
export { SettingsScreen, SETTINGS_SCREENS } from './providers/workspace/ui/SettingsDialog';
export type { WorkspaceSettingsSection } from './providers/workspace/ui/SettingsDialog';
