// Import styles
import './styles/globals.css';

// export
// SaaSOSProvider
export { ApiVersion } from './providers/os/types';
export { SaaSOSProvider } from './providers/SaaSOSProvider';
// Export custom components
export { BetaForm } from './components/beta/BetaForm';
export { PricingPage } from './components/pricing';
export type { PricingPageDetails, PricingPageProps } from './components/pricing';

// Export auth components
export { WhenAuthenticated, WhenUnauthenticated } from './components/user/auth';

// Export role components
export { WhenRoles, WhenWorkspaceRoles } from './components/user/role';

// Export features components
export {
  WhenUserFeatureDisabled,
  WhenUserFeatureEnabled,
  WhenWorkspaceFeatureDisabled,
  WhenWorkspaceFeatureEnabled,
} from './components/features';

// Export subscription gate components (must be used within SubscriptionContextProvider)
export {
  WhenNoSubscription,
  WhenSubscription,
  WhenSubscriptionToPlans,
} from './components/subscription';

// Export quota usage gate components (must be used within QuotaUsageContextProvider)
export {
  WhenQuotaAvailable,
  WhenQuotaExhausted,
  WhenQuotaOverage,
  WhenQuotaThreshold,
} from './components/quota';
export {
  SubscriptionContextProvider,
  useSubscriptionContext,
} from './contexts/SubscriptionContext';
export type { SubscriptionContextValue } from './contexts/SubscriptionContext';
export { invalidateSubscription } from './contexts/SubscriptionContext/subscriptionInvalidation';

export {
  QuotaUsageContextProvider,
  useQuotaUsageContext,
} from './contexts/QuotaUsageContext';
export type { QuotaUsageContextValue } from './contexts/QuotaUsageContext';
export { invalidateQuotaUsage } from './contexts/QuotaUsageContext/quotaUsageInvalidation';

// Export auth status and types (flags are derived in useSaaSAuth)
export { AuthStatus } from './providers/auth/types';
export type { OnWorkspaceChangeParams } from './providers/auth/types';

// Export hooks
export { useSaaSAuth } from './providers/auth/hooks';
export { useSaaSOs, useSaaSSettings } from './providers/os/hooks';
export { useUserAttributes, useUserFeatures } from './providers/user/hooks';

// Export workspace provider and dialog
export { useSaaSWorkspaces } from './providers/workspace/hooks';
export { WorkspaceSwitcher } from './providers/workspace/provider';

// Export subscription hooks
export {
  useAllQuotaUsage,
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

// Export event types and emitter
export { eventEmitter } from './providers/events';
export type {
  EventData,
  EventType,
  IEventCallbacks,
  UserCreatedEventData,
  UserUpdatedEventData,
  WorkspaceChangedEventData,
  WorkspaceCreatedEventData,
  WorkspaceDeletedEventData,
  WorkspaceUpdatedEventData,
  WorkspaceUserAddedEventData,
  WorkspaceUserRemovedEventData,
  WorkspaceUserRoleChangedEventData,
} from './providers/events/types';

// Central SDK APIs (all extend BaseApi)
export { BaseApi, SettingsApi, UserApi, WorkspaceApi } from './api';
export type { IBaseApiConfig } from './api';

// Export currency utilities
export {
  CURRENCY_DISPLAY,
  CURRENCY_FLAG,
  PLAN_CURRENCY_CODES,
  PLAN_CURRENCY_OPTIONS,
  formatCents,
  formatOverageRate,
  formatOverageRateWithLabel,
  formatQuotaIncludedOverage,
  getCurrencyFlag,
  getCurrencySymbol,
  getQuotaUnitLabelFromName,
} from './api/currency-utils';

// Export subscription types
export { formatQuotaWithPrice, getQuotaDisplayValue } from './api/quota-utils';
export type { FormatQuotaWithPriceOptions, QuotaDisplayValue } from './api/quota-utils';

export {
  getAvailableCurrenciesFromPlans,
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getDisplayCurrency,
  getPricingVariant,
  getQuotaDisplayWithVariant,
  getQuotaOverageCents,
  getStripePriceIdForInterval,
} from './api/pricing-variant-utils';
export type {
  PlanVersionWithPricingVariants,
  QuotaDisplayWithOverage,
} from './api/pricing-variant-utils';

export type {
  BillingInterval,
  IAllQuotaUsageResponse,
  IBasePricing,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IInvoice,
  IInvoiceListResponse,
  IInvoiceResponse,
  IPlan,
  IPlanGroup,
  IPlanGroupInfo,
  IPlanGroupLatestVersion,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionWithPlans,
  IPlanGroupVersionsResponse,
  IPlanVersion,
  IPlanVersionSummary,
  IPlanVersionWithPlan,
  IPricingVariant,
  IPublicPlanItem,
  IPublicPlanItemCategory,
  IPublicPlanVersion,
  IPublicPlansResponse,
  IQuotaByInterval,
  IQuotaIntervalValue,
  IQuotaOveragePriceIdsByInterval,
  IQuotaOveragesByInterval,
  IQuotaUsageStatus,
  IQuotaUsageStatusResponse,
  IRecordUsageRequest,
  IRecordUsageResponse,
  IStripePricesByInterval,
  ISubscription,
  ISubscriptionItem,
  ISubscriptionResponse,
  ISubscriptionUpdateRequest,
  ISubscriptionUpdateResponse,
  IUsageLogEntry,
  IUsageLogsQuery,
  IUsageLogsResponse,
  InvoiceStatus,
} from './api/types';
