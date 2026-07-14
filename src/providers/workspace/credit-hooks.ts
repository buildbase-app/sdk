import { useCallback, useEffect, useState } from 'react';
import type {
  IConsumeCreditsRequest,
  IConsumeCreditsResponse,
  ICreditBalance,
  ICreditPackage,
  ICreditPurchaseRequest,
  ICreditPurchaseResponse,
  ICreditTransaction,
  ICreditTransactionsQuery,
  IExpiringCreditsResponse,
  IPublicCreditPackage,
} from '../../api/types';
import { useTranslation } from '../../i18n';
import { invalidateCreditBalance } from '../../lib/credit-balance-invalidation';
import { getHookErrorMessage, handleError } from '../../lib/error-handler';
import { useLatestRequest } from '../../lib/use-latest-request';
import { isOsConfigReady } from '../os/types';
import { useWorkspaceApiWithOs } from './use-workspace-api';

// ── useCreditBalance ──────────────────────────────────────────────────────────

/**
 * Hook to get the credit balance for a workspace.
 * Automatically fetches when workspaceId changes.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined to disable fetching.
 * @returns { balance, loading, error, refetch }
 *
 * @example
 * ```tsx
 * function CreditDisplay() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { balance, loading } = useCreditBalance(currentWorkspace?._id);
 *
 *   if (loading) return <Loading />;
 *   if (!balance) return null;
 *
 *   return <p>{balance.available} credits available</p>;
 * }
 * ```
 */
export const useCreditBalance = (workspaceId: string | null | undefined) => {
  const { t } = useTranslation();
  const { api } = useWorkspaceApiWithOs();

  const [balance, setBalance] = useState<ICreditBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { begin, settle } = useLatestRequest();

  const fetchBalance = useCallback(async () => {
    if (!workspaceId) {
      begin();
      setBalance(null);
      setLoading(false);
      return;
    }
    const req = begin();
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCreditBalance(workspaceId);
      if (req.signal.aborted) return;
      setBalance(data);
    } catch (err) {
      if (req.signal.aborted) return;
      const errorMessage = getHookErrorMessage(err, 'errors.fetchCreditBalance', t);
      setError(errorMessage);
      handleError(err, {
        component: 'useCreditBalance',
        action: 'fetchBalance',
        metadata: { workspaceId },
      });
    } finally {
      if (settle(req)) setLoading(false);
    }
  }, [api, workspaceId, begin, settle]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
};

// ── useConsumeCredits ─────────────────────────────────────────────────────────

/**
 * Hook to consume credits from a workspace balance.
 * Returns a mutation function. Throws with `code: 'INSUFFICIENT_CREDITS'` on 402.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined.
 * @returns { consumeCredits, loading, error }
 *
 * @example
 * ```tsx
 * function GenerateButton() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { consumeCredits, loading } = useConsumeCredits(currentWorkspace?._id);
 *
 *   const handleGenerate = async () => {
 *     try {
 *       const result = await consumeCredits({
 *         amount: 10,
 *         description: 'AI image generation',
 *         idempotencyKey: `gen-${crypto.randomUUID()}`,
 *       });
 *       console.log(`Balance after: ${result.balanceAfter}`);
 *     } catch (err: any) {
 *       if (err.code === 'INSUFFICIENT_CREDITS') {
 *         alert(`Not enough credits. Available: ${err.available}`);
 *       }
 *     }
 *   };
 *
 *   return <button onClick={handleGenerate} disabled={loading}>Generate</button>;
 * }
 * ```
 */
export const useConsumeCredits = (workspaceId: string | null | undefined) => {
  const { t } = useTranslation();
  const { api } = useWorkspaceApiWithOs();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consumeCredits = useCallback(
    async (request: IConsumeCreditsRequest): Promise<IConsumeCreditsResponse> => {
      if (!workspaceId) throw new Error('Workspace ID is required');

      setLoading(true);
      setError(null);
      try {
        const result = await api.consumeCredits(workspaceId, request);
        invalidateCreditBalance();
        return result;
      } catch (err: any) {
        const errorMessage =
          err.code === 'INSUFFICIENT_CREDITS'
            ? t('credits.insufficientDetail', {
                available: err.available,
                requested: err.requested,
              })
            : getHookErrorMessage(err, 'errors.consumeCredits', t);
        setError(errorMessage);
        handleError(err, {
          component: 'useConsumeCredits',
          action: 'consumeCredits',
          metadata: { workspaceId, request },
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api, workspaceId]
  );

  return { consumeCredits, loading, error };
};

// ── usePurchaseCredits ────────────────────────────────────────────────────────

/**
 * Hook to create a Stripe checkout session for purchasing a credit package.
 * Returns a mutation function that resolves with { sessionId, url }.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined.
 * @returns { purchaseCredits, loading, error }
 *
 * @example
 * ```tsx
 * function BuyCreditsButton({ packageId }) {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { purchaseCredits, loading } = usePurchaseCredits(currentWorkspace?._id);
 *
 *   const handleBuy = async () => {
 *     const result = await purchaseCredits({
 *       creditPackageId: packageId,
 *       successUrl: `${window.location.origin}/credits/success`,
 *       cancelUrl: `${window.location.origin}/credits`,
 *     });
 *     window.location.href = result.url;
 *   };
 *
 *   return <button onClick={handleBuy} disabled={loading}>Buy Credits</button>;
 * }
 * ```
 */
export const usePurchaseCredits = (workspaceId: string | null | undefined) => {
  const { t } = useTranslation();
  const { api } = useWorkspaceApiWithOs();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseCredits = useCallback(
    async (request: ICreditPurchaseRequest): Promise<ICreditPurchaseResponse> => {
      if (!workspaceId) throw new Error('Workspace ID is required');

      setLoading(true);
      setError(null);
      try {
        const result = await api.purchaseCredits(workspaceId, request);
        return result;
      } catch (err) {
        const errorMessage = getHookErrorMessage(err, 'errors.purchaseCredits', t);
        setError(errorMessage);
        handleError(err, {
          component: 'usePurchaseCredits',
          action: 'purchaseCredits',
          metadata: { workspaceId, request },
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api, workspaceId]
  );

  return { purchaseCredits, loading, error };
};

// ── useCreditPackages ─────────────────────────────────────────────────────────

/**
 * Hook to list available credit packages for purchase.
 * Automatically fetches when workspaceId changes.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined to disable fetching.
 * @returns { packages, loading, error, refetch }
 *
 * @example
 * ```tsx
 * function CreditStore() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { packages, loading } = useCreditPackages(currentWorkspace?._id);
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {packages.map(pkg => (
 *         <div key={pkg._id}>
 *           <h3>{pkg.name}</h3>
 *           <p>{pkg.creditAmount} credits</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useCreditPackages = (workspaceId: string | null | undefined) => {
  const { t } = useTranslation();
  const { api } = useWorkspaceApiWithOs();

  const [packages, setPackages] = useState<ICreditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { begin, settle } = useLatestRequest();

  const fetchPackages = useCallback(async () => {
    if (!workspaceId) {
      begin();
      setPackages([]);
      setLoading(false);
      return;
    }
    const req = begin();
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCreditPackages(workspaceId);
      if (req.signal.aborted) return;
      setPackages(data);
    } catch (err) {
      if (req.signal.aborted) return;
      const errorMessage = getHookErrorMessage(err, 'errors.fetchCreditPackages', t);
      setError(errorMessage);
      handleError(err, {
        component: 'useCreditPackages',
        action: 'fetchPackages',
        metadata: { workspaceId },
      });
    } finally {
      if (settle(req)) setLoading(false);
    }
  }, [api, workspaceId, begin, settle]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return { packages, loading, error, refetch: fetchPackages };
};

// ── useCreditTransactions ─────────────────────────────────────────────────────

/**
 * Hook to get paginated credit transaction history.
 * Automatically fetches when workspaceId or query params change.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined to disable fetching.
 * @param query - Optional filters: type, page, limit
 * @returns { transactions, totalDocs, totalPages, page, hasNextPage, hasPrevPage, loading, error, refetch }
 *
 * @example
 * ```tsx
 * function TransactionHistory() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { transactions, totalPages, page, loading } = useCreditTransactions(
 *     currentWorkspace?._id,
 *     { limit: 20 }
 *   );
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {transactions.map(tx => (
 *         <div key={tx._id}>
 *           {tx.type}: {tx.amount} (balance: {tx.balanceAfter})
 *         </div>
 *       ))}
 *       <p>Page {page} of {totalPages}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export const useCreditTransactions = (
  workspaceId: string | null | undefined,
  query?: ICreditTransactionsQuery
) => {
  const { t } = useTranslation();
  const { api } = useWorkspaceApiWithOs();

  const [transactions, setTransactions] = useState<ICreditTransaction[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { begin, settle } = useLatestRequest();

  const type = query?.type;
  const pageNum = query?.page;
  const limit = query?.limit;

  const fetchTransactions = useCallback(async () => {
    if (!workspaceId) {
      begin();
      setTransactions([]);
      setTotalDocs(0);
      setTotalPages(0);
      setPage(1);
      setHasNextPage(false);
      setHasPrevPage(false);
      setLoading(false);
      return;
    }
    const req = begin();
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCreditTransactions(workspaceId, { type, page: pageNum, limit });
      if (req.signal.aborted) return;
      setTransactions(data.docs || []);
      setTotalDocs(data.totalDocs || 0);
      setTotalPages(data.totalPages || 0);
      setPage(data.page || 1);
      setHasNextPage(data.hasNextPage || false);
      setHasPrevPage(data.hasPrevPage || false);
    } catch (err) {
      if (req.signal.aborted) return;
      const errorMessage = getHookErrorMessage(err, 'errors.fetchCreditTransactions', t);
      setError(errorMessage);
      handleError(err, {
        component: 'useCreditTransactions',
        action: 'fetchTransactions',
        metadata: { workspaceId },
      });
    } finally {
      if (settle(req)) setLoading(false);
    }
  }, [api, workspaceId, type, pageNum, limit, begin, settle]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    totalDocs,
    totalPages,
    page,
    hasNextPage,
    hasPrevPage,
    loading,
    error,
    refetch: fetchTransactions,
  };
};

// ── useExpiringCredits ────────────────────────────────────────────────────────

/**
 * Hook to get credits expiring within N days.
 * Automatically fetches when workspaceId or days changes.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined to disable fetching.
 * @param days - Look-ahead window in days (1-90, default 7)
 * @returns { expiringCredits, buckets, days, loading, error, refetch }
 *
 * @example
 * ```tsx
 * function ExpiringCreditsWarning() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { expiringCredits, loading } = useExpiringCredits(currentWorkspace?._id, 7);
 *
 *   if (loading || expiringCredits === 0) return null;
 *
 *   return <p>Warning: {expiringCredits} credits expire within 7 days</p>;
 * }
 * ```
 */
export const useExpiringCredits = (workspaceId: string | null | undefined, days?: number) => {
  const { t } = useTranslation();
  const { api } = useWorkspaceApiWithOs();

  const [data, setData] = useState<IExpiringCreditsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { begin, settle } = useLatestRequest();

  const fetchExpiring = useCallback(async () => {
    if (!workspaceId) {
      begin();
      setData(null);
      setLoading(false);
      return;
    }
    const req = begin();
    setLoading(true);
    setError(null);
    try {
      const result = await api.getExpiringCredits(workspaceId, days);
      if (req.signal.aborted) return;
      setData(result);
    } catch (err) {
      if (req.signal.aborted) return;
      const errorMessage = getHookErrorMessage(err, 'errors.fetchExpiringCredits', t);
      setError(errorMessage);
      handleError(err, {
        component: 'useExpiringCredits',
        action: 'fetchExpiring',
        metadata: { workspaceId, days },
      });
    } finally {
      if (settle(req)) setLoading(false);
    }
  }, [api, workspaceId, days, begin, settle]);

  useEffect(() => {
    fetchExpiring();
  }, [fetchExpiring]);

  return {
    expiringCredits: data?.expiringCredits ?? 0,
    buckets: data?.buckets ?? [],
    days: data?.days ?? days ?? 7,
    loading,
    error,
    refetch: fetchExpiring,
  };
};

// ── usePublicCreditPackages ───────────────────────────────────────────────────

/**
 * Hook to fetch credit packages publicly (no auth required).
 * Uses orgId from SaaSOSProvider — must be inside the provider.
 *
 * @returns { packages, notes, loading, error, refetch }
 *
 * @example
 * ```tsx
 * function CreditStore() {
 *   const { packages, loading } = usePublicCreditPackages();
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {packages.map(pkg => (
 *         <div key={pkg._id}>
 *           <h3>{pkg.name}</h3>
 *           <p>{pkg.creditAmount} credits</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const usePublicCreditPackages = () => {
  const { t } = useTranslation();
  const { os, api } = useWorkspaceApiWithOs();
  const isConfigReady = isOsConfigReady(os);

  const [packages, setPackages] = useState<IPublicCreditPackage[]>([]);
  const [notes, setNotes] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { begin, settle } = useLatestRequest();

  const fetchPackages = useCallback(async () => {
    if (!isConfigReady) {
      begin();
      setPackages([]);
      setLoading(false);
      return;
    }
    const req = begin();
    setLoading(true);
    setError(null);
    try {
      const result = await api.getPublicCreditPackages();
      if (req.signal.aborted) return;
      setPackages(result.packages || []);
      setNotes(result.notes);
    } catch (err) {
      if (req.signal.aborted) return;
      const errorMessage = getHookErrorMessage(err, 'errors.fetchCreditPackages', t);
      setError(errorMessage);
      handleError(err, {
        component: 'usePublicCreditPackages',
        action: 'fetchPackages',
      });
    } finally {
      if (settle(req)) setLoading(false);
    }
  }, [api, isConfigReady, begin, settle]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const isLoading = !isConfigReady || loading;

  return { packages, notes, loading: isLoading, error, refetch: fetchPackages };
};
