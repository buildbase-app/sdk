import { useMemo } from 'react';
import type { InviteBlockReason, MaxUsersConfig } from '../api/billing/pricing-variant-utils';
import {
  getPerSeatPriceCents,
  resolveMaxUsers,
  validateInvite,
} from '../api/billing/pricing-variant-utils';
import type { BillingInterval, IPlanVersion } from '../api/types';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';

export interface SeatStatus {
  /** Whether the current plan uses seat-based pricing. */
  hasSeatPricing: boolean;
  /** Total workspace members. */
  memberCount: number;
  /** Seats included in the base price (free). */
  includedSeats: number;
  /** Maximum users allowed (resolved from seat pricing, plan limits, or settings). 0 = unlimited. */
  maxUsers: number;
  /**
   * Maximum seats allowed from seat pricing config. 0 = unlimited.
   * @deprecated Use `maxUsers` for the unified limit.
   */
  maxSeats: number;
  /** Where the max user limit comes from. */
  limitSource: MaxUsersConfig['source'];
  /** Seats beyond included that are being billed. */
  billableSeats: number;
  /** Remaining seats before hitting max. Infinity if unlimited. */
  availableSeats: number;
  /** Whether workspace is at max seat/user capacity. */
  isAtMax: boolean;
  /** Whether workspace is near max (>= 80% used). */
  isNearMax: boolean;
  /** Per-seat price in cents for the current billing interval. Null if not applicable. */
  perSeatPriceCents: number | null;
  /** Billing currency. */
  currency: string;
  /** Whether a new member can be invited. */
  canInvite: boolean;
  /** Reason the invite is blocked, or null if allowed. */
  inviteBlockReason: InviteBlockReason;
  /** i18n key for the block message. Resolve with t(key, values). */
  inviteBlockMessageKey: string | null;
  /** Values for ICU interpolation in the block message. */
  inviteBlockMessageValues: Record<string, string | number> | null;
}

/**
 * Hook that computes seat status from subscription context and workspace data.
 * Resolves max user limits from seat pricing, plan limits, and settings in priority order.
 * Must be used within SubscriptionContextProvider.
 *
 * @param workspace - The current workspace (needs users array, limits, billingCurrency)
 * @param options - Optional overrides (e.g. settingsMaxUsers fallback)
 * @returns SeatStatus — computed seat and invite information
 *
 * @example
 * ```tsx
 * const { isAtMax, canInvite, inviteBlockMessage, availableSeats } = useSeatStatus(workspace);
 *
 * if (!canInvite) {
 *   return <div>{inviteBlockMessage}</div>;
 * }
 * ```
 */
export function useSeatStatus(
  workspace: {
    users?: any[];
    billingCurrency?: string | null;
  } | null,
  options?: { settingsMaxUsers?: number | null }
): SeatStatus {
  const { response } = useSubscriptionContext();

  return useMemo(() => {
    const empty: SeatStatus = {
      hasSeatPricing: false,
      memberCount: 0,
      includedSeats: 0,
      maxUsers: 0,
      maxSeats: 0,
      limitSource: 'none',
      billableSeats: 0,
      availableSeats: Infinity,
      isAtMax: false,
      isNearMax: false,
      perSeatPriceCents: null,
      currency: '',
      canInvite: true,
      inviteBlockReason: null,
      inviteBlockMessageKey: null,
      inviteBlockMessageValues: null,
    };

    if (!workspace) return empty;

    const memberCount = workspace.users?.length ?? 0;
    const planVersion = response?.planVersion as IPlanVersion | null;
    const sub = response?.subscription;
    const currency = workspace.billingCurrency || 'usd';

    // Resolve the effective max users limit from seat pricing config on the plan
    const maxUsersConfig = resolveMaxUsers({
      planVersion,
      currency,
      settingsMaxUsers: options?.settingsMaxUsers,
    });

    const { maxUsers, hasSeatPricing, includedSeats } = maxUsersConfig;

    // Compute seat pricing details
    const billableSeats = hasSeatPricing ? Math.max(0, memberCount - includedSeats) : 0;
    const availableSeats = maxUsers > 0 ? Math.max(0, maxUsers - memberCount) : Infinity;
    const isAtMax = maxUsers > 0 && memberCount >= maxUsers;
    const isNearMax = maxUsers > 0 && memberCount >= maxUsers * 0.8 && !isAtMax;

    const billingInterval: BillingInterval = (sub?.billingInterval as BillingInterval) ?? 'monthly';
    const perSeatPriceCents =
      hasSeatPricing && planVersion
        ? getPerSeatPriceCents(planVersion, currency, billingInterval)
        : null;

    // Validate invite
    const inviteValidation = validateInvite({
      memberCount,
      maxUsersConfig,
    });

    return {
      hasSeatPricing,
      memberCount,
      includedSeats,
      maxUsers,
      maxSeats: maxUsers, // backward compat
      limitSource: maxUsersConfig.source,
      billableSeats,
      availableSeats,
      isAtMax,
      isNearMax,
      perSeatPriceCents,
      currency,
      canInvite: inviteValidation.canInvite,
      inviteBlockReason: inviteValidation.blockReason,
      inviteBlockMessageKey: inviteValidation.blockMessageKey,
      inviteBlockMessageValues: inviteValidation.blockMessageValues,
    };
  }, [response, workspace, options?.settingsMaxUsers]);
}
