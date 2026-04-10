/**
 * Helpers for multi-currency plan version pricing (pricingVariants).
 */

import type { BillingInterval, IPlanVersion, IPlanVersionWithPlan, IPricingVariant } from '../types';

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

// --- Seat Pricing Utilities ---

/** Get per-seat pricing config for a plan version and currency. Null if not enabled. */
export function getSeatPricing(
  planVersion: IPlanVersion,
  currency: string
): IPricingVariant['seatPricing'] | null {
  const variant = getPricingVariant(planVersion, currency);
  return variant?.seatPricing?.enabled ? variant.seatPricing : null;
}

/** Get per-seat price in cents for a billing interval. Null if seat pricing not enabled. */
export function getPerSeatPriceCents(
  planVersion: IPlanVersion,
  currency: string,
  interval: BillingInterval
): number | null {
  const seatPricing = getSeatPricing(planVersion, currency);
  if (!seatPricing?.perSeat) return null;
  return seatPricing.perSeat[interval] ?? null;
}

/** Calculate billable seats: max(0, currentSeats - includedSeats). */
export function calculateBillableSeats(
  currentSeatCount: number,
  includedSeats: number
): number {
  return Math.max(0, currentSeatCount - (includedSeats || 0));
}

/** Calculate total seat overage cost in cents. Null if seat pricing not enabled. */
export function calculateSeatOverageCents(
  planVersion: IPlanVersion,
  currency: string,
  interval: BillingInterval,
  currentSeatCount: number
): number | null {
  const seatPricing = getSeatPricing(planVersion, currency);
  if (!seatPricing) return null;
  const billable = calculateBillableSeats(currentSeatCount, seatPricing.includedSeats);
  const perSeat = getPerSeatPriceCents(planVersion, currency, interval);
  return billable * (perSeat ?? 0);
}

/**
 * Calculate total subscription price in cents: base + seat overage (if enabled).
 * Does not include metered usage (billed at period end).
 */
export function calculateTotalSubscriptionCents(
  planVersion: IPlanVersion,
  currency: string,
  interval: BillingInterval,
  currentSeatCount?: number
): number | null {
  const basePrice = getBasePriceCents(planVersion, currency, interval);
  if (basePrice === null) return null;
  if (currentSeatCount === undefined) return basePrice;
  const seatOverage = calculateSeatOverageCents(planVersion, currency, interval, currentSeatCount);
  return basePrice + (seatOverage ?? 0);
}

// --- Max Users / Seat Limit Utilities ---

export interface MaxUsersConfig {
  /** The resolved maximum number of users allowed. 0 = unlimited. */
  maxUsers: number;
  /** Where the limit comes from. */
  source: 'seat_pricing' | 'settings' | 'none';
  /** Seats included in the base plan price (0 if no seat pricing). */
  includedSeats: number;
  /** Whether seat-based pricing is active. */
  hasSeatPricing: boolean;
}

/**
 * Resolve the effective max users limit from the plan's seat pricing config,
 * falling back to settings when no seat pricing is configured.
 *
 * Priority:
 * 1. Seat pricing `maxSeats` (from plan version's pricing variant) — the plan controls the limit
 * 2. Settings fallback (`workspace.maxWorkspaceUsers`) — for workspaces without a subscription
 *
 * Returns 0 if no limit is set (unlimited).
 */
export function resolveMaxUsers(opts: {
  planVersion?: IPlanVersion | null;
  currency?: string;
  settingsMaxUsers?: number | null;
}): MaxUsersConfig {
  const { planVersion, currency = 'usd', settingsMaxUsers } = opts;

  // 1. Check seat pricing config on the plan
  if (planVersion) {
    const seatConfig = getSeatPricing(planVersion, currency);
    if (seatConfig) {
      return {
        maxUsers: seatConfig.maxSeats ?? 0,
        source: 'seat_pricing',
        includedSeats: seatConfig.includedSeats ?? 0,
        hasSeatPricing: true,
      };
    }
  }

  // 2. Settings fallback (no seat pricing on the plan)
  if (settingsMaxUsers != null && settingsMaxUsers > 0) {
    return {
      maxUsers: settingsMaxUsers,
      source: 'settings',
      includedSeats: 0,
      hasSeatPricing: false,
    };
  }

  return {
    maxUsers: 0,
    source: 'none',
    includedSeats: 0,
    hasSeatPricing: false,
  };
}

export type InviteBlockReason =
  | 'seat_limit_reached'
  | 'settings_user_limit_reached'
  | 'no_subscription'
  | null;

export interface InviteValidation {
  /** Whether a new user can be invited. */
  canInvite: boolean;
  /** Reason the invite is blocked, or null if allowed. */
  blockReason: InviteBlockReason;
  /** Human-readable message for the block reason. */
  blockMessage: string | null;
}

/**
 * Validate whether a new member can be invited given current seat/user limits.
 */
export function validateInvite(opts: {
  memberCount: number;
  maxUsersConfig: MaxUsersConfig;
  hasSubscription?: boolean;
  requireSubscription?: boolean;
}): InviteValidation {
  const { memberCount, maxUsersConfig, hasSubscription = true, requireSubscription = false } = opts;

  if (requireSubscription && !hasSubscription) {
    return {
      canInvite: false,
      blockReason: 'no_subscription',
      blockMessage: 'A subscription is required to invite members.',
    };
  }

  const { maxUsers, source } = maxUsersConfig;

  // 0 = unlimited
  if (maxUsers <= 0) {
    return { canInvite: true, blockReason: null, blockMessage: null };
  }

  if (memberCount >= maxUsers) {
    const reasonMap: Record<string, InviteBlockReason> = {
      seat_pricing: 'seat_limit_reached',
      settings: 'settings_user_limit_reached',
    };
    const messageMap: Record<string, string> = {
      seat_pricing: `Your plan allows up to ${maxUsers} members. Upgrade for more seats.`,
      settings: `This workspace allows up to ${maxUsers} members.`,
    };
    return {
      canInvite: false,
      blockReason: reasonMap[source] ?? 'seat_limit_reached',
      blockMessage: messageMap[source] ?? `Member limit of ${maxUsers} reached.`,
    };
  }

  return { canInvite: true, blockReason: null, blockMessage: null };
}
