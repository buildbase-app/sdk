'use client';

import { ReactNode, useCallback } from 'react';
import type { BillingInterval, IPublicPlanItem, IPublicPlanVersion } from '../../api/types';
import { createBBUrl } from '../../lib/url-params';
import { useSaaSAuth } from '../../providers/auth/hooks';
import { workspaceSettingsManager } from '../../providers/workspace/settings-manager';
import { SettingsScreen } from '../../providers/workspace/ui/SettingsDialog';
import { usePublicPlans } from '../../providers/workspace/subscription-hooks';
import { Skeleton } from '../ui/skeleton';

export interface PricingPageDetails {
  /** Whether plan data is being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Subscription items (features, limits, quotas) */
  items: IPublicPlanItem[];
  /** Plan versions with pricing, features, limits, quotas */
  plans: IPublicPlanVersion[];
  /** Optional note from API (e.g. "Pricing is in cents. Please convert to dollars for display.") */
  notes?: string;
  /** Refetch plan data */
  refetch: () => Promise<void>;
  /**
   * Select a plan. Handles everything automatically:
   * - If authenticated → opens the "Choose Your Plan" dialog
   * - If not authenticated → saves a redirect URL and triggers sign-in
   *
   * Requires `redirectBaseUrl` to be set on `<PricingPage>` for the
   * unauthenticated flow.
   *
   * @example
   * ```tsx
   * <button onClick={() => selectPlan(plan._id, 'monthly', 'usd')}>
   *   Select Plan
   * </button>
   * ```
   */
  selectPlan: (planVersionId: string, interval: BillingInterval, currency: string) => void;
}

export interface PricingPageProps {
  /** Plan group slug (e.g. 'main-pricing', 'enterprise') */
  slug: string;
  /** Render prop receiving plan details - construct layout from items and plans */
  children: (details: PricingPageDetails) => ReactNode;
  /** Custom loading UI. Defaults to skeleton. */
  loadingFallback?: ReactNode;
  /** Custom error UI. Receives error message. */
  errorFallback?: (error: string) => ReactNode;
  /**
   * Base URL for post-login redirects (e.g. `"https://app.com/dashboard"`).
   * When set, `selectPlan()` can redirect unauthenticated users through login
   * and back to the dashboard with the plan selection pre-filled.
   */
  redirectBaseUrl?: string;
}

/**
 * Fetches and provides plan/pricing details for public pricing pages (no login required).
 * Returns items (features, limits, quotas) and plans (with pricing) - user constructs layout.
 *
 * @example
 * ```tsx
 * <PricingPage slug="main-pricing">
 *   {({ loading, error, items, plans, refetch }) => {
 *     if (loading) return <Loading />;
 *     if (error) return <Error message={error} />;
 *
 *     return (
 *       <div>
 *         {plans.map(plan => (
 *           <PlanCard key={plan._id} plan={plan} items={items} />
 *         ))}
 *       </div>
 *     );
 *   }}
 * </PricingPage>
 * ```
 */
export function PricingPage({
  slug,
  children,
  loadingFallback,
  errorFallback,
  redirectBaseUrl,
}: PricingPageProps) {
  const { items, plans, notes, loading, error, refetch } = usePublicPlans(slug);
  const { isAuthenticated, signIn } = useSaaSAuth();

  const getCheckoutUrl = useCallback(
    (planVersionId: string, interval: BillingInterval, currency: string): string | null => {
      if (!redirectBaseUrl) return null;
      return createBBUrl(
        { action: 'selectPlan', plan: planVersionId, interval, currency },
        redirectBaseUrl
      );
    },
    [redirectBaseUrl]
  );

  const selectPlan = useCallback(
    (planVersionId: string, interval: BillingInterval, currency: string) => {
      if (isAuthenticated) {
        workspaceSettingsManager.openWorkspaceSettings(SettingsScreen.Subscription, {
          action: 'selectPlan',
          plan: planVersionId,
          interval,
          currency,
        });
        return;
      }
      const checkoutUrl = getCheckoutUrl(planVersionId, interval, currency);
      signIn(checkoutUrl ?? undefined);
    },
    [isAuthenticated, signIn, getCheckoutUrl]
  );

  if (loading) {
    if (loadingFallback !== undefined) {
      return <>{loadingFallback}</>;
    }
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    if (errorFallback) {
      return <>{errorFallback(error)}</>;
    }
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return <>{children({ loading, error, items, plans, notes, refetch, selectPlan })}</>;
}
