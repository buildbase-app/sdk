import { AlertTriangle, BarChart3, Calendar, RefreshCw } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getCurrencySymbol } from '../../../api/currency-utils';
import { getQuotaOverageCents } from '../../../api/pricing-variant-utils';
import type { IQuotaUsageStatus } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { useQuotaUsageContext } from '../../../contexts/QuotaUsageContext';
import { useSubscriptionContext } from '../../../contexts/SubscriptionContext';
import { cn } from '../../../lib/utils';
import SettingSkeleton from './Skeleton';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function formatSlug(slug: string): string {
  return slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getUsagePercent(consumed: number, included: number): number {
  if (included <= 0) return consumed > 0 ? 100 : 0;
  return Math.min((consumed / included) * 100, 100);
}

function getStatusColor(percent: number, hasOverage: boolean): {
  bar: string;
  bg: string;
  badge: string;
  badgeText: string;
} {
  if (hasOverage) return { bar: 'bg-red-500', bg: 'bg-red-100', badge: 'bg-red-100', badgeText: 'text-red-800' };
  if (percent >= 90) return { bar: 'bg-amber-500', bg: 'bg-amber-100', badge: 'bg-amber-100', badgeText: 'text-amber-800' };
  if (percent >= 75) return { bar: 'bg-yellow-500', bg: 'bg-yellow-100', badge: 'bg-yellow-100', badgeText: 'text-yellow-800' };
  return { bar: 'bg-blue-500', bg: 'bg-blue-100', badge: 'bg-blue-100', badgeText: 'text-blue-800' };
}

interface QuotaOverageInfo {
  overageCents: number;
  unitSize: number;
  currency: string;
  currencySymbol: string;
  estimatedCost: number;
}

function formatCost(amount: number, symbol: string): string {
  return symbol + amount.toFixed(2);
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

function getDaysRemaining(isoDate: string): number | null {
  try {
    const end = new Date(isoDate);
    if (isNaN(end.getTime())) return null;
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return null;
  }
}

/** Sort quota entries by urgency: overage first, then by usage % descending. */
function sortByUrgency(entries: [string, IQuotaUsageStatus][]): [string, IQuotaUsageStatus][] {
  return [...entries].sort(([, a], [, b]) => {
    // Overage items first
    if (a.hasOverage && !b.hasOverage) return -1;
    if (!a.hasOverage && b.hasOverage) return 1;

    // Then by usage percent descending
    const pctA = a.included > 0 ? a.consumed / a.included : a.consumed > 0 ? 1 : 0;
    const pctB = b.included > 0 ? b.consumed / b.included : b.consumed > 0 ? 1 : 0;
    return pctB - pctA;
  });
}

const WorkspaceSettingsUsage: React.FC = () => {
  const { quotas, loading, error, refetch } = useQuotaUsageContext();
  const { response: subResponse } = useSubscriptionContext();
  const [refreshing, setRefreshing] = useState(false);

  const overagePricing = useMemo(() => {
    const map: Record<string, QuotaOverageInfo> = {};
    if (!subResponse?.planVersion || !subResponse?.subscription) return map;

    const planVersion = subResponse.planVersion;
    const subscription = subResponse.subscription;
    const interval = subscription.billingInterval ?? 'monthly';
    const currency = subscription.plan?.currency ?? 'usd';
    const symbol = getCurrencySymbol(currency);

    if (!quotas) return map;

    for (const slug of Object.keys(quotas)) {
      const overageCents = getQuotaOverageCents(planVersion, currency, slug, interval);
      if (overageCents == null || overageCents <= 0) continue;

      const quotaVal = planVersion.quotas?.[slug];
      const slice = quotaVal?.[interval];
      const unitSize = slice?.unitSize ?? 1;

      const quota = quotas[slug];
      const overageUnits = quota.overage;
      const billableBlocks = unitSize > 1 ? Math.ceil(overageUnits / unitSize) : overageUnits;
      const estimatedCost = (billableBlocks * overageCents) / 100;

      map[slug] = { overageCents, unitSize, currency, currencySymbol: symbol, estimatedCost };
    }

    return map;
  }, [subResponse, quotas]);

  // Billing period info — only show when Stripe provides the period end date
  const billingPeriod = useMemo(() => {
    const periodEnd = subResponse?.subscription?.stripeCurrentPeriodEnd;
    if (!periodEnd) return null;

    const endFormatted = formatDate(periodEnd);
    if (!endFormatted) return null;

    return { endDate: endFormatted, daysRemaining: getDaysRemaining(periodEnd) };
  }, [subResponse]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !quotas) {
    return <SettingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">Failed to load usage data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
        >
          {refreshing ? 'Retrying...' : 'Retry'}
        </Button>
      </div>
    );
  }

  const rawEntries = quotas ? Object.entries(quotas) : [];
  const entries = sortByUrgency(rawEntries);

  if (entries.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600">No quota usage data available for this workspace.</p>
        <p className="text-xs text-gray-500 mt-1">Quotas will appear here once your plan includes metered resources.</p>
      </div>
    );
  }

  const overageCount = entries.filter(([, q]) => q.hasOverage).length;
  const totalConsumed = entries.reduce((sum, [, q]) => sum + q.consumed, 0);
  const totalIncluded = entries.reduce((sum, [, q]) => sum + q.included, 0);

  const totalOverageCost = Object.values(overagePricing).reduce((sum, info) => sum + info.estimatedCost, 0);
  const anyCurrency = Object.values(overagePricing)[0]?.currencySymbol ?? '$';

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Monitor your resource consumption and quotas</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Billing period */}
      {billingPeriod && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>
            Usage resets on <span className="font-medium text-gray-900">{billingPeriod.endDate}</span>
            {billingPeriod.daysRemaining !== null && billingPeriod.daysRemaining > 0 && (
              <span className="text-gray-500"> ({billingPeriod.daysRemaining} {billingPeriod.daysRemaining === 1 ? 'day' : 'days'} remaining)</span>
            )}
            {billingPeriod.daysRemaining !== null && billingPeriod.daysRemaining <= 0 && (
              <span className="text-amber-600 font-medium"> (renewing soon)</span>
            )}
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs text-gray-500 font-medium">Total Resources</p>
          <p className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">{entries.length}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs text-gray-500 font-medium">Overall Usage</p>
          <p className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">
            {totalIncluded > 0
              ? Math.round((totalConsumed / totalIncluded) * 100) + '%'
              : '0%'}
          </p>
        </div>
        <div className={cn(
          'border rounded-lg p-3 sm:p-4',
          overageCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'
        )}>
          <p className="text-xs text-gray-500 font-medium">In Overage</p>
          <p className={cn('text-lg sm:text-xl font-semibold mt-1', overageCount > 0 ? 'text-red-600' : 'text-gray-900')}>
            {overageCount}
          </p>
        </div>
        {overageCount > 0 && totalOverageCost > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3 sm:p-4">
            <p className="text-xs text-gray-500 font-medium">Est. Overage Cost</p>
            <p className="text-lg sm:text-xl font-semibold mt-1 text-red-600">
              {formatCost(totalOverageCost, anyCurrency)}
            </p>
          </div>
        )}
      </div>

      {/* Overage warning */}
      {overageCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5 hidden sm:block" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Overage Detected</h3>
              <p className="text-sm text-amber-700">
                {overageCount} {overageCount === 1 ? 'resource has' : 'resources have'} exceeded
                the included quota. Additional usage will be billed as overage on your next invoice.
              </p>
              {totalOverageCost > 0 && (
                <p className="text-sm text-amber-700 font-medium mt-1">
                  Estimated overage charges this period: {formatCost(totalOverageCost, anyCurrency)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quota items */}
      <div className="space-y-3">
        {entries.map(([slug, quota]) => {
          const percent = getUsagePercent(quota.consumed, quota.included);
          const colors = getStatusColor(percent, quota.hasOverage);
          const pricing = overagePricing[slug];

          return (
            <QuotaCard
              key={slug}
              slug={slug}
              quota={quota}
              percent={percent}
              colors={colors}
              pricing={pricing}
            />
          );
        })}
      </div>
    </div>
  );
};

function QuotaCard({
  slug,
  quota,
  percent,
  colors,
  pricing,
}: {
  slug: string;
  quota: IQuotaUsageStatus;
  percent: number;
  colors: { bar: string; bg: string; badge: string; badgeText: string };
  pricing?: QuotaOverageInfo;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-y-1 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{formatSlug(slug)}</h3>
          {quota.hasOverage && (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors.badge, colors.badgeText)}>
              Overage
            </span>
          )}
          {!quota.hasOverage && percent >= 90 && (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors.badge, colors.badgeText)}>
              Almost full
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {formatNumber(quota.consumed)} / {formatNumber(quota.included)}
        </span>
      </div>

      {/* Progress bar */}
      <div className={cn('h-2 rounded-full w-full', colors.bg)}>
        <div
          className={cn('h-2 rounded-full transition-all duration-500', colors.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Details row */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{Math.round(percent)}% used</span>
        <span>
          {quota.available > 0
            ? `${formatNumber(quota.available)} remaining`
            : quota.hasOverage
              ? `${formatNumber(quota.overage)} over limit`
              : 'Fully used'}
        </span>
      </div>

      {/* Billable overage breakdown */}
      {quota.hasOverage && pricing && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Overage units</span>
            <span className="font-medium text-gray-900">{formatNumber(quota.overage)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Rate</span>
            <span className="font-medium text-gray-900">
              {pricing.currencySymbol}{(pricing.overageCents / 100).toFixed(2)}
              {pricing.unitSize > 1
                ? ` / ${pricing.unitSize.toLocaleString()} units`
                : ' / unit'}
            </span>
          </div>
          {pricing.unitSize > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Billable blocks</span>
              <span className="font-medium text-gray-900">
                {Math.ceil(quota.overage / pricing.unitSize).toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
            <span className="font-medium text-red-600">Estimated charge</span>
            <span className="font-semibold text-red-600">
              {formatCost(pricing.estimatedCost, pricing.currencySymbol)}
            </span>
          </div>
        </div>
      )}

      {/* Overage rate info when not yet in overage but pricing exists */}
      {!quota.hasOverage && pricing && (
        <div className="mt-2 text-xs text-gray-500">
          Overage rate: {pricing.currencySymbol}{(pricing.overageCents / 100).toFixed(2)}
          {pricing.unitSize > 1
            ? ` / ${pricing.unitSize.toLocaleString()} units`
            : ' / unit'}
        </div>
      )}
    </div>
  );
}

export default WorkspaceSettingsUsage;
