'use client';

import type {
  IConsumeCreditsRequest,
  IConsumeCreditsResponse,
  ICreditBalance,
  ICreditPackage,
} from '../../api/types';
import { useCreditBalanceContext } from '../../contexts/CreditBalanceContext';
import { safeRedirect } from '../../lib/security';
import { createCreditPurchaseRedirectUrls } from '../../lib/url-params';
import {
  useConsumeCredits,
  useCreditPackages,
  usePurchaseCredits,
} from '../../providers/workspace/credit-hooks';
import { useSaaSWorkspaces } from '../../providers/workspace/hooks';

export interface CreditActionsDetails {
  /** Current credit balance. Null while loading. */
  balance: ICreditBalance | null;
  /** Whether balance is loading. */
  loading: boolean;
  /** Available credit packages for purchase. */
  packages: ICreditPackage[];
  /** Whether packages are loading. */
  packagesLoading: boolean;
  /**
   * Consume credits from the workspace balance.
   * Throws with `code: 'INSUFFICIENT_CREDITS'` if balance is too low.
   *
   * @example
   * ```ts
   * try {
   *   const result = await consume({ amount: 10, description: 'AI generation' });
   *   console.log(`Balance: ${result.balanceAfter}`);
   * } catch (err) {
   *   if (err.code === 'INSUFFICIENT_CREDITS') showUpgradePrompt();
   * }
   * ```
   */
  consume: (request: IConsumeCreditsRequest) => Promise<IConsumeCreditsResponse>;
  /** Whether a consume operation is in progress. */
  consuming: boolean;
  /**
   * Purchase a credit package. Redirects to Stripe Checkout.
   * On success, user returns to the app with the credits screen open.
   *
   * @example
   * ```ts
   * await purchase(packages[0]); // Redirects to Stripe
   * ```
   */
  purchase: (pkg: ICreditPackage) => Promise<void>;
  /** Whether a purchase redirect is in progress. */
  purchasing: boolean;
  /** Refetch the balance. */
  refetch: () => Promise<void>;
  /** Error from the last consume or purchase operation. */
  error: string | null;
}

export interface CreditActionsProviderProps {
  /** Render prop receiving credit actions — build your own UI. */
  children: (details: CreditActionsDetails) => React.ReactNode;
}

/**
 * Provides credit balance, packages, and action functions (consume, purchase) via render prop.
 * Must be inside SaaSOSProvider. Handles Stripe redirect URLs automatically.
 *
 * @example
 * ```tsx
 * <CreditActionsProvider>
 *   {({ balance, packages, consume, purchase, consuming, purchasing }) => (
 *     <div>
 *       <p>{balance?.available ?? 0} credits</p>
 *
 *       <button onClick={() => consume({ amount: 5 })} disabled={consuming}>
 *         Use 5 Credits
 *       </button>
 *
 *       {packages.map(pkg => (
 *         <button key={pkg._id} onClick={() => purchase(pkg)} disabled={purchasing}>
 *           Buy {pkg.creditAmount} for ${pkg.pricingVariants[0]?.amount / 100}
 *         </button>
 *       ))}
 *     </div>
 *   )}
 * </CreditActionsProvider>
 * ```
 */
export const CreditActionsProvider = ({ children }: CreditActionsProviderProps) => {
  const { currentWorkspace } = useSaaSWorkspaces();
  const workspaceId = currentWorkspace?._id;
  const { balance, loading, error: balanceError, refetch } = useCreditBalanceContext();
  const { packages, loading: packagesLoading } = useCreditPackages(workspaceId);
  const {
    consumeCredits,
    loading: consuming,
    error: consumeError,
  } = useConsumeCredits(workspaceId);
  const {
    purchaseCredits,
    loading: purchasing,
    error: purchaseError,
  } = usePurchaseCredits(workspaceId);

  const purchase = async (pkg: ICreditPackage) => {
    if (!workspaceId) throw new Error('No workspace selected');
    const { successUrl, cancelUrl } = createCreditPurchaseRedirectUrls(workspaceId);
    const result = await purchaseCredits({
      creditPackageId: pkg._id,
      successUrl,
      cancelUrl,
    });
    if (result.url) {
      safeRedirect(result.url);
    }
  };

  return children({
    balance,
    loading,
    packages,
    packagesLoading,
    consume: consumeCredits,
    consuming,
    purchase,
    purchasing,
    refetch,
    error: consumeError || purchaseError || balanceError,
  });
};

CreditActionsProvider.displayName = 'CreditActionsProvider';
