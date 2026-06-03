'use client';

import type { ICreditBalance } from '../../api/types';
import { useCreditBalanceContext } from '../../contexts/CreditBalanceContext';

export interface CreditBalanceDetails {
  /** Credit balance data. Null while loading or if no workspace. */
  balance: ICreditBalance | null;
  /** Whether data is being fetched. */
  loading: boolean;
  /** Error message if fetch failed. */
  error: string | null;
  /** Manually refresh the balance. */
  refetch: () => Promise<void>;
}

export interface CreditBalanceProps {
  /** Render prop receiving balance details — build your own UI. */
  children: (details: CreditBalanceDetails) => React.ReactNode;
}

/**
 * Provides credit balance data for the current workspace via render prop.
 * Must be inside SaaSOSProvider. Balance auto-updates after consume/purchase.
 *
 * @example
 * ```tsx
 * <CreditBalance>
 *   {({ balance, loading }) => {
 *     if (loading) return <Skeleton />;
 *     return <span>{balance?.available ?? 0} credits</span>;
 *   }}
 * </CreditBalance>
 * ```
 *
 * @example
 * ```tsx
 * // Navbar credit indicator
 * <CreditBalance>
 *   {({ balance, loading, refetch }) => (
 *     <button onClick={refetch} disabled={loading}>
 *       <CoinIcon />
 *       {loading ? '...' : balance?.available ?? 0}
 *     </button>
 *   )}
 * </CreditBalance>
 * ```
 */
export const CreditBalance = ({ children }: CreditBalanceProps) => {
  const { balance, loading, error, refetch } = useCreditBalanceContext();
  return children({ balance, loading, error, refetch });
};

CreditBalance.displayName = 'CreditBalance';
