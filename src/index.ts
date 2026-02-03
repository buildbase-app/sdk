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
export {
  SubscriptionContextProvider,
  useSubscriptionContext,
} from './contexts/SubscriptionContext';
export type { SubscriptionContextValue } from './contexts/SubscriptionContext';

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
  useCreateCheckoutSession,
  useInvoice,
  useInvoices,
  usePlanGroup,
  usePlanGroupVersions,
  usePublicPlanGroupVersion,
  usePublicPlans,
  useSubscription,
  useSubscriptionManagement,
  useUpdateSubscription,
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

// Export subscription types
export type {
  BillingInterval,
  IBasePricing,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IInvoice,
  IInvoiceListResponse,
  IInvoiceResponse,
  IPlan,
  IPlanGroup,
  IPlanGroupLatestVersion,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionWithPlans,
  IPlanGroupVersionsResponse,
  IPlanVersion,
  IPlanVersionWithPlan,
  IPublicPlanItem,
  IPublicPlanItemCategory,
  IPublicPlanPricing,
  IPublicPlanQuotaValue,
  IPublicPlanVersion,
  IPublicPlansResponse,
  IQuotaValue,
  ISubscription,
  ISubscriptionItem,
  ISubscriptionResponse,
  ISubscriptionUpdateRequest,
  ISubscriptionUpdateResponse,
  InvoiceStatus,
} from './api/types';
