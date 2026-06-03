'use client';

import { ReactNode, useCallback } from 'react';
import type { IPublicCreditPackage } from '../../api/types';
import { BBAction, createBBUrl } from '../../lib/url-params';
import { useSaaSAuth } from '../../providers/auth/hooks';
import { workspaceSettingsManager } from '../../providers/workspace/settings-manager';
import { SettingsScreen } from '../../providers/workspace/ui/SettingsDialog';
import { usePublicCreditPackages } from '../../providers/workspace/credit-hooks';
import { Skeleton } from '../ui/skeleton';

export interface CreditStorePageDetails {
  /** Whether package data is being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Available credit packages with pricing */
  packages: IPublicCreditPackage[];
  /** Optional note from API (e.g. "Pricing is in cents.") */
  notes?: string;
  /** Refetch package data */
  refetch: () => Promise<void>;
  /**
   * Select a package to purchase. Handles everything automatically:
   * - If authenticated → opens the workspace settings Credits tab
   * - If not authenticated → saves a redirect URL and triggers sign-in
   *
   * @example
   * ```tsx
   * <button onClick={() => selectPackage(pkg._id)}>
   *   Buy {pkg.creditAmount} Credits
   * </button>
   * ```
   */
  selectPackage: (packageId: string) => void;
}

export interface CreditStorePageProps {
  /** Render prop receiving package details — build your own credit store UI */
  children: (details: CreditStorePageDetails) => ReactNode;
  /** Custom loading UI. Defaults to skeleton. */
  loadingFallback?: ReactNode;
  /** Custom error UI. Receives error message. */
  errorFallback?: (error: string) => ReactNode;
  /**
   * Base URL for post-login redirects (e.g. `"https://app.com/dashboard"`).
   * When set, `selectPackage()` can redirect unauthenticated users through login
   * and back to the dashboard with the credits screen open.
   */
  redirectBaseUrl?: string;
}

/**
 * Fetches and provides credit package details for public credit store pages (no login required).
 * Returns packages with pricing — the consumer constructs the layout.
 * Similar to `<PricingPage>` but for credit packages.
 *
 * @example
 * ```tsx
 * <CreditStorePage redirectBaseUrl="https://app.com/dashboard">
 *   {({ loading, error, packages, selectPackage }) => {
 *     if (loading) return <Loading />;
 *     if (error) return <Error message={error} />;
 *
 *     return (
 *       <div className="grid grid-cols-3 gap-4">
 *         {packages.map(pkg => (
 *           <div key={pkg._id}>
 *             <h3>{pkg.name}</h3>
 *             <p>{pkg.creditAmount} credits</p>
 *             <p>${(pkg.pricingVariants[0]?.amount / 100).toFixed(2)}</p>
 *             <button onClick={() => selectPackage(pkg._id)}>Buy</button>
 *           </div>
 *         ))}
 *       </div>
 *     );
 *   }}
 * </CreditStorePage>
 * ```
 */
export function CreditStorePage({
  children,
  loadingFallback,
  errorFallback,
  redirectBaseUrl,
}: CreditStorePageProps) {
  const { packages, notes, loading, error, refetch } = usePublicCreditPackages();
  const { isAuthenticated, signIn } = useSaaSAuth();

  const selectPackage = useCallback(
    (packageId: string) => {
      if (isAuthenticated) {
        workspaceSettingsManager.openWorkspaceSettings(SettingsScreen.Credits, {
          action: BBAction.CreditPurchase,
          packageId,
        });
        return;
      }
      // Not authenticated — redirect through sign-in, then back to credits
      if (redirectBaseUrl) {
        const returnUrl = createBBUrl(
          { action: BBAction.CreditPurchase, screen: 'credits', packageId },
          redirectBaseUrl
        );
        signIn(returnUrl);
      } else {
        signIn();
      }
    },
    [isAuthenticated, signIn, redirectBaseUrl]
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
            <Skeleton key={i} className="h-48 rounded-lg" />
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

  return <>{children({ loading, error, packages, notes, refetch, selectPackage })}</>;
}
