// Context Providers
export {
  AuthProvider,
  useAuthContext,
  useAuthDispatch,
  useAuthSelector,
  useAuthState,
} from './AuthContext';
export { OSProvider, useOSContext, useOSDispatch, useOSSelector, useOSState } from './OSContext';
export { SDKContextProvider } from './SDKContextProvider';
export {
  WorkspaceProvider,
  useWorkspaceContext,
  useWorkspaceDispatch,
  useWorkspaceSelector,
  useWorkspaceState,
} from './WorkspaceContext';

// Types
export type {
  AuthAction,
  AuthContextValue,
  OSAction,
  OSContextValue,
  SDKContextValue,
  WorkspaceAction,
  WorkspaceContextValue,
  WorkspaceState,
} from './types';

// Reducers
export {
  authReducer,
  getInitialAuthState,
  getInitialOSState,
  getInitialWorkspaceState,
  osReducer,
  workspaceReducer,
} from './reducers';

// Combined Selector
export { useAppSelector } from './useAppSelector';
export type { SDKState } from './useAppSelector';

// Combined Dispatch
export { useAppDispatch } from './useAppDispatch';
export type { SDKDispatch } from './useAppDispatch';
