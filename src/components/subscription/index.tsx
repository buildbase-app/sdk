import { useSubscriptionContext } from '../../contexts/SubscriptionContext';

interface IWhenSubscriptionProps {
  /** Content to render when the condition is met (workspace has an active subscription). */
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
 * @returns ReactNode - children when subscribed, loadingComponent when loading, fallbackComponent when not subscribed, or null
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
 * @returns ReactNode - children when not subscribed, loadingComponent when loading, fallbackComponent when subscribed, or null
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
  /** Content to render when the workspace is on one of the given plans. */
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
 * @returns ReactNode - children when on a matching plan, loadingComponent when loading, fallbackComponent when not matching, or null
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

interface IWhenTrialingProps {
  /** Content to render when the condition is met. */
  children: React.ReactNode;
  /** Optional component/element to show while subscription is loading. */
  loadingComponent?: React.ReactNode;
  /** Optional component/element to show when condition is not met. */
  fallbackComponent?: React.ReactNode;
}

/**
 * Renders children only when the current workspace subscription is in trial (status === 'trialing').
 * Must be used within SubscriptionContextProvider.
 *
 * @example
 * ```tsx
 * <WhenTrialing fallbackComponent={<NormalContent />}>
 *   <TrialBanner />
 * </WhenTrialing>
 * ```
 */
export const WhenTrialing = (props: IWhenTrialingProps) => {
  const { children, loadingComponent, fallbackComponent } = props;
  const { response, loading } = useSubscriptionContext();

  if (loading) return loadingComponent ?? null;
  if (response?.subscription?.subscriptionStatus !== 'trialing') return fallbackComponent ?? null;
  return children;
};

/**
 * Renders children only when the current workspace subscription is NOT in trial.
 * This includes: no subscription, active, canceled, past_due, etc.
 * Must be used within SubscriptionContextProvider.
 *
 * @example
 * ```tsx
 * <WhenNotTrialing>
 *   <RegularPricingPage />
 * </WhenNotTrialing>
 * ```
 */
export const WhenNotTrialing = (props: IWhenTrialingProps) => {
  const { children, loadingComponent, fallbackComponent } = props;
  const { response, loading } = useSubscriptionContext();

  if (loading) return loadingComponent ?? null;
  if (response?.subscription?.subscriptionStatus === 'trialing') return fallbackComponent ?? null;
  return children;
};

interface IWhenTrialEndingProps {
  /** Content to render when trial is ending soon. */
  children: React.ReactNode;
  /** Optional component/element to show while subscription is loading. */
  loadingComponent?: React.ReactNode;
  /** Optional component/element to show when trial is not ending soon. */
  fallbackComponent?: React.ReactNode;
  /** Number of days threshold to consider "ending soon". Defaults to 3. */
  daysThreshold?: number;
}

/**
 * Renders children only when the subscription is trialing AND the trial ends within
 * the given threshold (default 3 days). Useful for showing urgent upgrade prompts.
 * Must be used within SubscriptionContextProvider.
 *
 * @example
 * ```tsx
 * <WhenTrialEnding daysThreshold={5}>
 *   <UpgradeBanner />
 * </WhenTrialEnding>
 * ```
 */
export const WhenTrialEnding = (props: IWhenTrialEndingProps) => {
  const { children, loadingComponent, fallbackComponent, daysThreshold = 3 } = props;
  const { response, loading } = useSubscriptionContext();

  if (loading) return loadingComponent ?? null;

  const subscription = response?.subscription;
  if (!subscription || subscription.subscriptionStatus !== 'trialing') {
    return fallbackComponent ?? null;
  }

  // Prefer trialEnd; fall back to stripeCurrentPeriodEnd (equals trial end during Stripe trials)
  const trialEndStr = subscription.trialEnd || subscription.stripeCurrentPeriodEnd;
  if (!trialEndStr) return fallbackComponent ?? null;

  const trialEnd = new Date(trialEndStr);
  if (isNaN(trialEnd.getTime())) return fallbackComponent ?? null; // Guard against Invalid Date
  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  if (daysRemaining > daysThreshold) return fallbackComponent ?? null;
  return children;
};

WhenSubscription.displayName = 'WhenSubscription';
WhenNoSubscription.displayName = 'WhenNoSubscription';
WhenSubscriptionToPlans.displayName = 'WhenSubscriptionToPlans';
WhenTrialing.displayName = 'WhenTrialing';
WhenNotTrialing.displayName = 'WhenNotTrialing';
WhenTrialEnding.displayName = 'WhenTrialEnding';
