import { useSaaSAuth } from '../../providers/auth/hooks';
import { AuthStatus } from '../../providers/auth/types';

interface IProps {
  children: React.ReactNode;
}

/**
 * Conditional component that renders children only when user is authenticated.
 * Returns null if user is not authenticated or authentication status is still loading.
 *
 * @param props - Component props
 * @param props.children - Content to render when authenticated
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SaaSOSProvider {...config}>
 *       <WhenAuthenticated>
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
  const { children } = props;
  const { status } = useSaaSAuth();

  if (status !== AuthStatus.authenticated) return null;

  return children;
};

/**
 * Conditional component that renders children only when user is NOT authenticated.
 * Returns null if user is authenticated.
 * Note: Also renders during loading/redirecting states (when not yet authenticated).
 *
 * @param props - Component props
 * @param props.children - Content to render when unauthenticated
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
  const { children } = props;
  const { status } = useSaaSAuth();

  if (status !== AuthStatus.unauthenticated) return null;

  return children;
};

WhenAuthenticated.displayName = 'WhenAuthenticated';
WhenUnauthenticated.displayName = 'WhenUnauthenticated';
