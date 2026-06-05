import { CheckCircle2, Coins, Loader2, RefreshCw, ShoppingCart } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreditTransactionTypeValue,
  ICreditPackage,
  ICreditTransaction,
} from '../../../api/types';
import { CreditTransactionType } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { useCreditBalanceContext } from '../../../contexts/CreditBalanceContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { invalidateCreditBalance } from '../../../lib/credit-balance-invalidation';
import { Permission } from '../../../lib/permissions';
import { safeRedirect } from '../../../lib/security';
import { BBAction, BBStatus, createCreditPurchaseRedirectUrls } from '../../../lib/url-params';
import { cn } from '../../../lib/utils';
import {
  useCreditPackages,
  useCreditTransactions,
  useExpiringCredits,
  usePurchaseCredits,
} from '../credit-hooks';
import { workspaceSettingsManager } from '../settings-manager';
import type { IWorkspace } from '../types';
import CreditPackagesDialog from './CreditPackagesDialog';
import NoPermission from './NoPermission';
import SettingSkeleton from './Skeleton';

import { formatDateTime as formatDate } from '../../../lib/format-utils';

const TX_TYPE_KEY: Record<string, TranslationKey> = {
  [CreditTransactionType.PlanGrant]: 'credits.type.plan_grant',
  [CreditTransactionType.PackPurchased]: 'credits.type.pack_purchased',
  [CreditTransactionType.Consumed]: 'credits.type.consumed',
  [CreditTransactionType.Expired]: 'credits.type.expired',
  [CreditTransactionType.AdminGrant]: 'credits.type.admin_grant',
  [CreditTransactionType.AdminRevoke]: 'credits.type.admin_revoke',
  [CreditTransactionType.Refund]: 'credits.type.refund',
};

function getTxBadgeColor(type: CreditTransactionTypeValue): string {
  switch (type) {
    case 'plan_grant':
    case 'admin_grant':
    case 'refund':
      return 'bg-green-100 text-green-800';
    case 'pack_purchased':
      return 'bg-blue-100 text-blue-800';
    case 'consumed':
      return 'bg-gray-100 text-gray-800';
    case 'expired':
    case 'admin_revoke':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

const WorkspaceSettingsCredits: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const workspaceId = workspace._id?.toString();
  const { t, fmtNum } = useTranslation();
  const { can } = usePermissions();
  const canViewBilling = can(Permission.WORKSPACE_BILLING_VIEW);
  const canManageBilling = can(Permission.WORKSPACE_BILLING_MANAGE);
  const {
    balance,
    loading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useCreditBalanceContext();
  const { packages, loading: packagesLoading } = useCreditPackages(workspaceId);
  const { expiringCredits, loading: expiringLoading } = useExpiringCredits(workspaceId, 7);

  // Transactions with "load more" accumulation
  const [txPage, setTxPage] = useState(1);
  const {
    transactions: txPageData,
    hasNextPage: txHasMore,
    loading: txLoading,
  } = useCreditTransactions(workspaceId, { limit: 10, page: txPage });

  const [allTransactions, setAllTransactions] = useState<ICreditTransaction[]>([]);

  useEffect(() => {
    if (txLoading || txPageData.length === 0) return;

    if (txPage === 1) {
      setAllTransactions(txPageData);
    } else {
      setAllTransactions(prev => {
        const existingIds = new Set(prev.map(tx => tx._id));
        const newItems = txPageData.filter(tx => !existingIds.has(tx._id));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    }
  }, [txPageData, txPage, txLoading]);

  const handleLoadMore = useCallback(() => {
    if (txHasMore && !txLoading) {
      setTxPage(p => p + 1);
    }
  }, [txHasMore, txLoading]);

  const transactions = allTransactions;
  const { purchaseCredits, loading: purchaseLoading } = usePurchaseCredits(workspaceId);

  const [refreshing, setRefreshing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseCanceled, setPurchaseCanceled] = useState(false);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const returnHandledRef = useRef(false);

  const loading = balanceLoading && !balance;

  // Detect params: purchase redirect OR openCreditStore
  useEffect(() => {
    if (returnHandledRef.current) return;
    const settingsState = workspaceSettingsManager.getState();
    if (!settingsState.params?.action) return;

    // Auto-open credit store dialog
    if (settingsState.params.action === BBAction.OpenCreditStore) {
      returnHandledRef.current = true;
      workspaceSettingsManager.clearParams();
      setDialogOpen(true);
      return;
    }

    if (settingsState.params.action !== BBAction.CreditPurchase) return;

    returnHandledRef.current = true;
    const status = settingsState.params.status;
    workspaceSettingsManager.clearParams();

    if (status === BBStatus.Success) {
      setPurchaseSuccess(true);
      invalidateCreditBalance();
      const timer = setTimeout(() => setPurchaseSuccess(false), 8000);
      return () => clearTimeout(timer);
    } else if (status === BBStatus.Cancel) {
      setPurchaseCanceled(true);
      const timer = setTimeout(() => setPurchaseCanceled(false), 5000);
      return () => clearTimeout(timer);
    } else if (status === BBStatus.Error) {
      setPurchaseError(t('credits.purchaseFailed'));
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchBalance();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePurchase = async (pkg: ICreditPackage) => {
    if (!workspaceId) return;
    setPurchaseError(null);
    setPurchasingPackageId(pkg._id);
    try {
      const { successUrl, cancelUrl } = createCreditPurchaseRedirectUrls(workspaceId);
      const result = await purchaseCredits({
        creditPackageId: pkg._id,
        successUrl,
        cancelUrl,
      });
      if (result.url) {
        safeRedirect(result.url);
      }
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : t('errors.purchaseCredits'));
      setPurchasingPackageId(null);
    }
  };

  if (loading) return <SettingSkeleton />;

  if (!canViewBilling) return <NoPermission />;

  if (!workspaceId) {
    return (
      <div className="border rounded-lg p-4 text-center text-gray-500">
        <p>{t('subscription.invalidWorkspace')}</p>
      </div>
    );
  }

  const hasPackages = !packagesLoading && packages.length > 0;

  return (
    <div className="space-y-6">
      {/* Header: description + actions */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600">{t('credits.description')}</p>
        <div className="flex flex-wrap items-center gap-2">
          {hasPackages && canManageBilling && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <ShoppingCart className="h-3.5 w-3.5 me-1.5" />
              {t('credits.buyCredits')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5 me-1.5', refreshing && 'animate-spin')} />
            {t('settings.common.refreshAction', { loading: String(refreshing) })}
          </Button>
        </div>
      </div>

      {/* Status banners */}
      {balanceError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">{t('credits.errorLoading')}</p>
          <p className="text-sm mt-1">{balanceError}</p>
        </div>
      )}

      {purchaseSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">{t('credits.purchaseSuccess')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPurchaseSuccess(false)}
            className="flex-shrink-0 border-green-200 text-green-700 hover:bg-green-100"
          >
            {t('settings.common.dismiss')}
          </Button>
        </div>
      )}

      {purchaseCanceled && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <p className="text-sm font-medium">{t('credits.purchaseCanceled')}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPurchaseCanceled(false)}
            className="flex-shrink-0 border-amber-200 text-amber-700 hover:bg-amber-100"
          >
            {t('settings.common.dismiss')}
          </Button>
        </div>
      )}

      {purchaseError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <p className="text-sm">{purchaseError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPurchaseError(null)}
            className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            {t('settings.common.dismiss')}
          </Button>
        </div>
      )}

      {/* Balance Card */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50/50 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {t('credits.balance')}
            </h3>
            <Coins className="h-5 w-5 text-gray-400" />
          </div>
          {balance ? (
            <>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                {fmtNum(balance.available)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">{t('credits.totalGranted')}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtNum(balance.totalGranted)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('credits.totalConsumed')}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtNum(balance.totalConsumed)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('credits.totalExpired')}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtNum(balance.totalExpired)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('credits.available')}</p>
                  <p className="text-sm font-semibold text-green-600">
                    {fmtNum(balance.available)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Coins className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{t('credits.noCredits')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('credits.noCreditsHint')}</p>
              {hasPackages && canManageBilling && (
                <Button size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                  <ShoppingCart className="h-3.5 w-3.5 me-1.5" />
                  {t('credits.buyCredits')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Expiring credits warning */}
        {!expiringLoading && expiringCredits > 0 && (
          <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 text-sm text-amber-800">
            {t('credits.expiringInDays', { count: expiringCredits, days: 7 })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('credits.transactions')}</h3>
        {txLoading && transactions.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            <span>{t('settings.common.loading')}</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500">{t('credits.noTransactions')}</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {transactions.map(tx => (
                <TransactionRow key={tx._id} tx={tx} />
              ))}
            </div>
            {txHasMore && (
              <div className="border-t border-gray-200 px-4 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={txLoading}
                  progress={txLoading && txPage > 1}
                >
                  {t('credits.loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credit Packages Dialog */}
      {hasPackages && canManageBilling && (
        <CreditPackagesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          packages={packages}
          billingCurrency={workspace.billingCurrency}
          workspaceName={workspace.name}
          onSelectPackage={handlePurchase}
          purchasingPackageId={purchasingPackageId}
          loading={purchaseLoading}
        />
      )}
    </div>
  );
};

/** A single transaction row */
function TransactionRow({ tx }: { tx: ICreditTransaction }) {
  const { t, formattingLocale, fmtNum } = useTranslation();
  const typeKey = TX_TYPE_KEY[tx.type] ?? 'credits.type.consumed';
  const badgeColor = getTxBadgeColor(tx.type);
  const isPositive = tx.amount > 0;

  return (
    <div className="px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                badgeColor
              )}
            >
              {t(typeKey)}
            </span>
            {tx.description && <p className="text-sm text-gray-700 truncate">{tx.description}</p>}
          </div>
          <p className="text-xs text-gray-400">{formatDate(tx.createdAt, formattingLocale)}</p>
        </div>
        <div className="text-end shrink-0">
          <span
            className={cn('text-sm font-semibold', isPositive ? 'text-green-600' : 'text-gray-900')}
          >
            {isPositive ? '+' : ''}
            {fmtNum(tx.amount)}
          </span>
          <p className="text-xs text-gray-400">{fmtNum(tx.balanceAfter)}</p>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceSettingsCredits;
