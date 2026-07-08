import { useSaaSAuth } from '../../providers/auth/hooks';
import { AuthStatus, getAuthFlags } from '../../providers/auth/types';

interface IProps {
  children: React.ReactNode;
  /** Optional component/element to show while auth status is still loading. */
  loadingComponent?: React.ReactNode;
  /** Optional component/element to show when the condition is not met. */
  fallbackComponent?: React.ReactNode;
}

/**
 * Conditional component that renders children only when user is authenticated.
 * Optionally pass loadingComponent (while auth resolves) or fallbackComponent
 * (when unauthenticated) — both default to null, matching the other SDK gates.
 *
 * @param props - Component props
 * @param props.children - Content to render when authenticated
 * @param props.loadingComponent - Optional content while auth status resolves
 * @param props.fallbackComponent - Optional content when not authenticated
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SaaSOSProvider {...config}>
 *       <WhenAuthenticated loadingComponent={<Skeleton />}>
 *         <Dashboard />
 *       </WhenAuthenticated>
 *       <WhenUnauthenticated>
 *         <LoginPage />
 *       </WhenUnauthenticated>
 *     </SaaSOSProvider>
 *   );
 * }
 * ```
 */
export const WhenAuthenticated = (props: IProps) => {
  const { children, loadingComponent, fallbackComponent } = props;
  const { status } = useSaaSAuth();

  if (getAuthFlags(status).isLoading) return loadingComponent ?? null;
  if (status !== AuthStatus.authenticated) return fallbackComponent ?? null;

  return children;
};

/**
 * Conditional component that renders children only when user is NOT authenticated.
 * Optionally pass loadingComponent (while auth resolves) or fallbackComponent
 * (when authenticated) — both default to null, matching the other SDK gates.
 * Note: without loadingComponent, nothing renders during loading/redirecting states.
 *
 * @param props - Component props
 * @param props.children - Content to render when unauthenticated
 * @param props.loadingComponent - Optional content while auth status resolves
 * @param props.fallbackComponent - Optional content when authenticated
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SaaSOSProvider {...config}>
 *       <WhenUnauthenticated>
 *         <LoginPage />
 *       </WhenUnauthenticated>
 *       <WhenAuthenticated>
 *         <Dashboard />
 *       </WhenAuthenticated>
 *     </SaaSOSProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Handle loading state separately
 * function App() {
 *   const { isLoading } = useSaaSAuth();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <>
 *       <WhenUnauthenticated><LoginPage /></WhenUnauthenticated>
 *       <WhenAuthenticated><Dashboard /></WhenAuthenticated>
 *     </>
 *   );
 * }
 * ```
 */
export const WhenUnauthenticated = (props: IProps) => {
  const { children, loadingComponent, fallbackComponent } = props;
  const { status } = useSaaSAuth();

  if (getAuthFlags(status).isLoading) return loadingComponent ?? null;
  if (status !== AuthStatus.unauthenticated) return fallbackComponent ?? null;

  return children;
};

WhenAuthenticated.displayName = 'WhenAuthenticated';
WhenUnauthenticated.displayName = 'WhenUnauthenticated';
