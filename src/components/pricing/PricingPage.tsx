'use client';

import React, { ReactNode } from 'react';
import { Skeleton } from '../ui/skeleton';
import { usePublicPlans } from '../../providers/workspace/subscription-hooks';
import type { IPublicPlanItem, IPublicPlanVersion } from '../../api/types';

export interface PricingPageDetails {
  /** Whether plan data is being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Subscription items (features, limits, quotas) */
  items: IPublicPlanItem[];
  /** Plan versions with pricing, features, limits, quotas */
  plans: IPublicPlanVersion[];
  /** Refetch plan data */
  refetch: () => Promise<void>;
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
}: PricingPageProps) {
  const { items, plans, loading, error, refetch } = usePublicPlans(slug);

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

  return <>{children({ loading, error, items, plans, refetch })}</>;
}
