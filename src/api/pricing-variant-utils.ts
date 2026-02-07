/**
 * Helpers for multi-currency plan version pricing (pricingVariants).
 */

import type { BillingInterval, IPlanVersion, IPlanVersionWithPlan, IPricingVariant } from './types';

/** Get the pricing variant for a currency, or null if not available. */
export function getPricingVariant(
  planVersion: IPlanVersion,
  currency: string
): IPricingVariant | null {
  const variants = planVersion.pricingVariants;
  if (!variants?.length) return null;
  const key = currency.toLowerCase();
  return variants.find(v => v.currency?.toLowerCase() === key) ?? null;
}

/**
 * Get base price in cents for a plan version and currency/interval.
 */
export function getBasePriceCents(
  planVersion: IPlanVersion,
  currency: string,
  interval: BillingInterval
): number | null {
  const variant = getPricingVariant(planVersion, currency);
  if (!variant?.basePricing) return null;
  const cents = variant.basePricing[interval];
  return cents != null ? cents : null;
}

/**
 * Get Stripe price ID for the given plan version, currency, and interval.
 */
export function getStripePriceIdForInterval(
  planVersion: IPlanVersion,
  currency: string,
  interval: BillingInterval
): string | null {
  const variant = getPricingVariant(planVersion, currency);
  if (!variant?.stripePrices) return null;
  const key =
    interval === 'monthly'
      ? 'monthlyPriceId'
      : interval === 'yearly'
        ? 'yearlyPriceId'
        : 'quarterlyPriceId';
  const altKey = interval === 'monthly' ? 'monthly' : interval === 'yearly' ? 'yearly' : undefined;
  const id =
    variant.stripePrices[key] ??
    (altKey ? variant.stripePrices[altKey as keyof typeof variant.stripePrices] : undefined);
  return id ?? null;
}

/**
 * Get overage amount in cents for a quota in a given currency and interval.
 * Returns undefined if not defined in the pricing variant.
 */
export function getQuotaOverageCents(
  planVersion: IPlanVersion,
  currency: string,
  quotaSlug: string,
  interval: BillingInterval
): number | undefined {
  const variant = getPricingVariant(planVersion, currency);
  const overages = variant?.quotaOverages?.[quotaSlug];
  if (!overages) return undefined;
  return overages[interval];
}

/**
 * Get display currency for a plan version when using a given currency.
 * Returns the requested currency if the variant exists; otherwise plan.currency or null.
 */
export function getDisplayCurrency(planVersion: IPlanVersionWithPlan, currency: string): string {
  const variant = getPricingVariant(planVersion, currency);
  if (variant) return variant.currency;
  return planVersion.plan?.currency ?? '';
}

/** Minimal shape for extracting currencies (IPlanVersionWithPlan or IPublicPlanVersion). */
export type PlanVersionWithPricingVariants = {
  pricingVariants?: IPricingVariant[];
};

/**
 * Collect all unique currency codes from plan versions (from their pricingVariants).
 * Use for currency selector. Accepts IPlanVersionWithPlan[] or IPublicPlanVersion[].
 */
export function getAvailableCurrenciesFromPlans(
  planVersions: PlanVersionWithPricingVariants[]
): string[] {
  const set = new Set<string>();
  for (const pv of planVersions) {
    pv.pricingVariants?.forEach(v => {
      if (v.currency) set.add(v.currency.toLowerCase());
    });
  }
  return Array.from(set).sort();
}

/**
 * Quota display shape: included count and optional overage (cents) and unitSize from plan + variant.
 */
export type QuotaDisplayWithOverage = {
  included: number;
  overage?: number;
  unitSize?: number;
} | null;

/**
 * Get quota display value for a slug/interval, merging plan version quotas (included, unitSize)
 * with pricing variant overage (cents) when available.
 */
export function getQuotaDisplayWithVariant(
  planVersion: IPlanVersion,
  currency: string,
  quotaSlug: string,
  interval: BillingInterval
): QuotaDisplayWithOverage {
  const quotaVal = planVersion.quotas?.[quotaSlug];
  if (quotaVal === null || quotaVal === undefined) return null;

  const slice = quotaVal[interval];
  if (!slice) return null;
  const overage = getQuotaOverageCents(planVersion, currency, quotaSlug, interval);
  return {
    included: slice.included,
    ...(slice.unitSize !== undefined && { unitSize: slice.unitSize }),
    ...(overage !== undefined && { overage }),
  };
}

/**
 * Resolve billing interval and currency from a Stripe price ID by checking all plan versions' pricingVariants.
 */
export function getBillingIntervalAndCurrencyFromPriceId(
  priceId: string | null | undefined,
  planVersions: IPlanVersionWithPlan[]
): { interval: BillingInterval; currency: string } | null {
  if (!priceId) return null;

  for (const plan of planVersions) {
    const variants = plan.pricingVariants;
    if (!variants?.length) continue;
    for (const v of variants) {
      const sp = v.stripePrices;
      if (!sp) continue;
      if (sp.monthlyPriceId === priceId || sp.monthly === priceId) {
        return { interval: 'monthly', currency: v.currency };
      }
      if (sp.yearlyPriceId === priceId || sp.yearly === priceId) {
        return { interval: 'yearly', currency: v.currency };
      }
      if (sp.quarterlyPriceId === priceId) {
        return { interval: 'quarterly', currency: v.currency };
      }
    }
  }
  return null;
}
