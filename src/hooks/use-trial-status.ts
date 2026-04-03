import { useMemo } from 'react';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';

export interface TrialStatus {
  /** Whether the current subscription is in trial. */
  isTrialing: boolean;
  /** Number of days remaining in the trial. 0 if not trialing or expired. */
  daysRemaining: number;
  /** Trial end date as a Date object. null if not trialing. */
  trialEndsAt: Date | null;
  /** Trial start date as a Date object. null if not trialing. */
  trialStartedAt: Date | null;
  /** Whether the trial is ending soon (<= 3 days remaining). */
  isTrialEnding: boolean;
}

/**
 * Hook that computes trial status from the current subscription context.
 * Must be used within SubscriptionContextProvider.
 *
 * @returns TrialStatus — computed trial information
 *
 * @example
 * ```tsx
 * const { isTrialing, daysRemaining, isTrialEnding } = useTrialStatus();
 *
 * if (isTrialEnding) {
 *   return <UpgradeBanner daysLeft={daysRemaining} />;
 * }
 * ```
 */
export function useTrialStatus(): TrialStatus {
  const { response } = useSubscriptionContext();

  return useMemo(() => {
    const subscription = response?.subscription;

    if (!subscription || subscription.subscriptionStatus !== 'trialing') {
      return {
        isTrialing: false,
        daysRemaining: 0,
        trialEndsAt: null,
        trialStartedAt: null,
        isTrialEnding: false,
      };
    }

    // Prefer trialEnd (explicitly set), fall back to stripeCurrentPeriodEnd
    // (during a Stripe trial, current_period_end equals the trial end date)
    const trialEndsAt = subscription.trialEnd
      ? new Date(subscription.trialEnd)
      : subscription.stripeCurrentPeriodEnd
        ? new Date(subscription.stripeCurrentPeriodEnd)
        : null;

    const trialStartedAt = subscription.trialStart
      ? new Date(subscription.trialStart)
      : null;

    const daysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    const isTrialEnding = daysRemaining <= 3;

    return {
      isTrialing: true,
      daysRemaining,
      trialEndsAt,
      trialStartedAt,
      isTrialEnding,
    };
  }, [response]);
}
