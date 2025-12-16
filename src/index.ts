// Import styles
import './styles/globals.css';

// export
// SaaSOSProvider
export { SaaSOSProvider } from './providers/SaaSOSProvider';
export type { SaaSOSProviderProps } from './providers/SaaSOSProvider';
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

// Export workspace provider and dialog
export { useSaaSWorkspaces } from './providers/workspace/hooks';
export { WorkspaceSwitcher } from './providers/workspace/provider';

// Export combined selector
export { useAppSelector } from './contexts/useAppSelector';
export type { SDKState } from './contexts/useAppSelector';

// Export combined dispatch
export { useAppDispatch } from './contexts/useAppDispatch';
export type { SDKDispatch } from './contexts/useAppDispatch';
