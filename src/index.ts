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
export { WhenWorkspaceFeatureDisabled, WhenWorkspaceFeatureEnabled } from './components/features';

// Export hooks
export { useSaaSAuth } from './providers/auth/hooks';
export { useSaaSSettings } from './providers/os/hooks';

// Export workspace provider and dialog
export { useSaaSWorkspaces } from './providers/workspace/hooks';
export { WorkspaceSwitcher } from './providers/workspace/provider';

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
export { SDKErrorBoundary, default as ErrorBoundary } from './components/ErrorBoundary';
export {
  errorHandler,
  handleError,
  createSDKError,
  SDKError,
} from './lib/error-handler';
export type { SDKErrorContext, ErrorHandlerConfig } from './lib/error-handler';
