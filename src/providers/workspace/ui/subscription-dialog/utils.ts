import {
  BillingInterval,
  BillingIntervals,
  IPlanVersionWithPlan,
  ISubscriptionItem,
} from '../../../../api/types';
import { type TranslationKey } from '../../../../i18n';

// Get all unique subscription items across all plans
export const getAllSubscriptionItems = (planVersions: IPlanVersionWithPlan[]) => {
  const allItems = new Map<string, ISubscriptionItem>();

  planVersions.forEach(planVersion => {
    planVersion.subscriptionItems?.forEach(item => {
      if (!allItems.has(item._id)) {
        allItems.set(item._id, item);
      }
    });
  });

  return Array.from(allItems.values());
};

// Interval label keys — resolved via t() inside the component
export const INTERVAL_LABEL_KEYS: Record<string, TranslationKey> = {
  [BillingIntervals.Monthly]: 'subscription.billingInterval.perMonth',
  [BillingIntervals.Quarterly]: 'subscription.billingInterval.perQuarter',
  [BillingIntervals.Yearly]: 'subscription.billingInterval.perYear',
};

// Calculate savings percentage for yearly/quarterly vs monthly
export const calculateSavings = (
  monthlyPrice: number,
  intervalPrice: number,
  interval: BillingInterval
): number | null => {
  if (!monthlyPrice || monthlyPrice === 0) return null;

  let monthlyEquivalent: number;
  switch (interval) {
    case BillingIntervals.Yearly:
      monthlyEquivalent = intervalPrice / 12;
      break;
    case BillingIntervals.Quarterly:
      monthlyEquivalent = intervalPrice / 3;
      break;
    default:
      return null;
  }

  const savings = ((monthlyPrice - monthlyEquivalent) / monthlyPrice) * 100;
  return savings > 0 ? Math.round(savings) : null;
};

/**
 * Resolve the currency used to display a plan's price: the effective currency when the plan
 * has a pricing variant for it, otherwise the plan's base currency (falling back to the
 * effective currency).
 */
export const getDisplayCurrency = (
  planVersion: IPlanVersionWithPlan,
  effectiveCurrency: string
): string =>
  planVersion.pricingVariants?.length &&
  planVersion.pricingVariants.some(
    v => v.currency?.toLowerCase() === effectiveCurrency.toLowerCase()
  )
    ? effectiveCurrency
    : (planVersion.plan?.currency ?? effectiveCurrency ?? '');

/** Renewal-mode label key for a plan's credit grant (shared by mobile card and desktop table). */
export const getCreditRenewalModeKey = (
  creditGrant: NonNullable<IPlanVersionWithPlan['creditGrant']>
): TranslationKey =>
  !creditGrant.renewOnPeriod
    ? 'subscription.items.creditModeLifetime'
    : creditGrant.mode === 'reset'
      ? 'subscription.items.creditModeReset'
      : 'subscription.items.creditModeTopup';
