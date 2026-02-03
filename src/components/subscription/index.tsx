import { useSubscriptionContext } from '../../contexts/SubscriptionContext';

interface IWhenSubscriptionProps {
  children: React.ReactNode;
  /** Optional component/element to show while subscription is loading (e.g. <Skeleton />). */
  loadingComponent?: React.ReactNode;
  /** Optional component/element to show when condition is not met (e.g. <UpgradePrompt />). */
  fallbackComponent?: React.ReactNode;
}

/**
 * Renders children only when the current workspace has an active subscription (any plan).
 * Optionally pass loadingComponent (while loading) or fallbackComponent (when not subscribed).
 * Must be used within SubscriptionContextProvider.
 *
 * @param props - Component props
 * @param props.children - Content to render when subscribed
 * @param props.loadingComponent - Optional component/element to show while loading
 * @param props.fallbackComponent - Optional component/element to show when not subscribed
 *
 * @example
 * ```tsx
 * <WhenSubscription>
 *   <BillingSettings />
 * </WhenSubscription>
 * ```
 *
 * @example
 * ```tsx
 * <WhenSubscription
 *   loadingComponent={<Skeleton />}
 *   fallbackComponent={<UpgradePrompt />}
 * >
 *   <BillingSettings />
 * </WhenSubscription>
 * ```
 */
export const WhenSubscription = (props: IWhenSubscriptionProps) => {
  const { children, loadingComponent, fallbackComponent } = props;
  const { response, loading } = useSubscriptionContext();

  if (loading) return loadingComponent ?? null;
  if (!response?.subscription) return fallbackComponent ?? null;
  return children;
};

/**
 * Renders children only when the current workspace has no subscription (or no current workspace).
 * Optionally pass loadingComponent (while loading) or fallbackComponent (when already subscribed).
 * Must be used within SubscriptionContextProvider.
 *
 * @param props - Component props
 * @param props.children - Content to render when not subscribed
 * @param props.loadingComponent - Optional component/element to show while loading
 * @param props.fallbackComponent - Optional component/element to show when already subscribed
 *
 * @example
 * ```tsx
 * <WhenNoSubscription>
 *   <UpgradePrompt />
 * </WhenNoSubscription>
 * ```
 *
 * @example
 * ```tsx
 * <WhenNoSubscription
 *   loadingComponent={<Spinner />}
 *   fallbackComponent={null}
 * >
 *   <UpgradePrompt />
 * </WhenNoSubscription>
 * ```
 */
export const WhenNoSubscription = (props: IWhenSubscriptionProps) => {
  const { children, loadingComponent, fallbackComponent } = props;
  const { response, loading } = useSubscriptionContext();

  if (loading) return loadingComponent ?? null;
  if (response?.subscription) return fallbackComponent ?? null;
  return children;
};

interface IWhenSubscriptionToPlansProps {
  /** Plan slugs to match (e.g. ['pro', 'enterprise']). Matching is case-insensitive. */
  plans: string[];
  children: React.ReactNode;
  /** Optional component/element to show while subscription is loading (e.g. <Skeleton />). */
  loadingComponent?: React.ReactNode;
  /** Optional component/element to show when not on a matching plan (e.g. <UpgradeToPro />). */
  fallbackComponent?: React.ReactNode;
}

/**
 * Renders children only when the current workspace is subscribed to one of the given plans.
 * Matches by plan slug only. Optionally pass loadingComponent (while loading) or fallbackComponent (when not on a matching plan).
 * Must be used within SubscriptionContextProvider.
 *
 * @param props - Component props
 * @param props.plans - Plan slugs to match (e.g. ['pro', 'enterprise'])
 * @param props.children - Content to render when on a matching plan
 * @param props.loadingComponent - Optional component/element to show while loading
 * @param props.fallbackComponent - Optional component/element to show when not on a matching plan
 *
 * @example
 * ```tsx
 * <WhenSubscriptionToPlans plans={['pro', 'enterprise']}>
 *   <AdvancedAnalytics />
 * </WhenSubscriptionToPlans>
 * ```
 *
 * @example
 * ```tsx
 * <WhenSubscriptionToPlans
 *   plans={['pro', 'enterprise']}
 *   loadingComponent={<Skeleton />}
 *   fallbackComponent={<UpgradeToPro />}
 * >
 *   <AdvancedAnalytics />
 * </WhenSubscriptionToPlans>
 * ```
 */
export const WhenSubscriptionToPlans = (props: IWhenSubscriptionToPlansProps) => {
  const { children, plans, loadingComponent, fallbackComponent } = props;
  const { response, loading } = useSubscriptionContext();

  if (loading) return loadingComponent ?? null;
  if (!response?.subscription) return fallbackComponent ?? null;

  const plan = response.plan ?? response.subscription?.plan;
  if (!plan) return fallbackComponent ?? null;

  const normalizedPlans = plans.map(p => p.trim().toLowerCase());
  const currentSlug = (plan.slug ?? '').toLowerCase();
  if (!normalizedPlans.includes(currentSlug)) return fallbackComponent ?? null;

  return children;
};
