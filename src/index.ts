// Import styles
import './styles/globals.css';

// export
// SaaSOSProvider
export { ApiVersion } from './providers/os/types';
export { SaaSOSProvider } from './providers/SaaSOSProvider';
// Export custom components
export { BetaForm } from './components/beta/BetaForm';

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

// Export hooks
export { useSaaSAuth } from './providers/auth/hooks';
export { useSaaSSettings } from './providers/os/hooks';
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

// Export error handling
export { default as ErrorBoundary, SDKErrorBoundary } from './components/ErrorBoundary';
export { SDKError, createSDKError, errorHandler, handleError } from './lib/error-handler';
export type { ErrorHandlerConfig, SDKErrorContext } from './lib/error-handler';

// Export subscription types
export type {
  BillingInterval,
  IBasePricing,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IInvoice,
  IInvoiceListResponse,
  IInvoiceResponse,
  InvoiceStatus,
  IPlan,
  IPlanGroup,
  IPlanGroupLatestVersion,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionsResponse,
  IPlanGroupVersionWithPlans,
  IPlanVersion,
  IPlanVersionWithPlan,
  IQuotaValue,
  ISubscription,
  ISubscriptionItem,
  ISubscriptionResponse,
  ISubscriptionUpdateRequest,
  ISubscriptionUpdateResponse,
} from './api/types';
