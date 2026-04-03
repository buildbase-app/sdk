import { useMemo } from 'react';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { getSeatPricing, getPerSeatPriceCents } from '../api/pricing-variant-utils';
import type { BillingInterval } from '../api/types';

export interface SeatStatus {
  /** Whether the current plan uses seat-based pricing. */
  hasSeatPricing: boolean;
  /** Total workspace members. */
  memberCount: number;
  /** Seats included in the base price (free). */
  includedSeats: number;
  /** Maximum seats allowed. 0 = unlimited. */
  maxSeats: number;
  /** Seats beyond included that are being billed. */
  billableSeats: number;
  /** Remaining seats before hitting max. Infinity if unlimited. */
  availableSeats: number;
  /** Whether workspace is at max seat capacity. */
  isAtMax: boolean;
  /** Whether workspace is near max (>= 80% used). */
  isNearMax: boolean;
  /** Per-seat price in cents for the current billing interval. Null if not applicable. */
  perSeatPriceCents: number | null;
  /** Billing currency. */
  currency: string;
}

/**
 * Hook that computes seat status from subscription context and workspace data.
 * Must be used within SubscriptionContextProvider.
 *
 * @param workspace - The current workspace (needs users array)
 * @returns SeatStatus — computed seat information
 *
 * @example
 * ```tsx
 * const { isAtMax, availableSeats, billableSeats } = useSeatStatus(workspace);
 *
 * if (isAtMax) {
 *   return <UpgradeBanner />;
 * }
 * ```
 */
export function useSeatStatus(workspace: { users?: any[]; billingCurrency?: string | null } | null): SeatStatus {
  const { response } = useSubscriptionContext();

  return useMemo(() => {
    const empty: SeatStatus = {
      hasSeatPricing: false,
      memberCount: 0,
      includedSeats: 0,
      maxSeats: 0,
      billableSeats: 0,
      availableSeats: Infinity,
      isAtMax: false,
      isNearMax: false,
      perSeatPriceCents: null,
      currency: '',
    };

    if (!response?.subscription || !workspace) return empty;

    const sub = response.subscription;
    if (!sub.seatPricingEnabled) return { ...empty, memberCount: workspace.users?.length ?? 0 };

    const planVersion = response.planVersion;
    const currency = workspace.billingCurrency || 'usd';
    const seatConfig = planVersion ? getSeatPricing(planVersion as any, currency) : null;
    if (!seatConfig) return { ...empty, hasSeatPricing: true, memberCount: workspace.users?.length ?? 0 };

    const memberCount = workspace.users?.length ?? 0;
    const includedSeats = seatConfig.includedSeats ?? 0;
    const maxSeats = (seatConfig as any).maxSeats ?? 0;
    const billableSeats = Math.max(0, memberCount - includedSeats);
    const availableSeats = maxSeats > 0 ? Math.max(0, maxSeats - memberCount) : Infinity;
    const isAtMax = maxSeats > 0 && memberCount >= maxSeats;
    const isNearMax = maxSeats > 0 && memberCount >= maxSeats * 0.8 && !isAtMax;

    const billingInterval: BillingInterval = (sub.billingInterval as BillingInterval) ?? 'monthly';
    const perSeatPriceCents = planVersion
      ? getPerSeatPriceCents(planVersion as any, currency, billingInterval)
      : null;

    return {
      hasSeatPricing: true,
      memberCount,
      includedSeats,
      maxSeats,
      billableSeats,
      availableSeats,
      isAtMax,
      isNearMax,
      perSeatPriceCents,
      currency,
    };
  }, [response, workspace]);
}
