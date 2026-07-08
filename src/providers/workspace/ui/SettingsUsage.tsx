import { AlertTriangle, BarChart3, Calendar, RefreshCw } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getCurrencySymbol } from '../../../api/billing/currency-utils';
import { getQuotaOverageCents } from '../../../api/billing/pricing-variant-utils';
import type { IQuotaUsageStatus } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { StatusBanner } from '../../../components/ui/status-banner';
import { useQuotaUsageContext } from '../../../contexts/QuotaUsageContext';
import { useSubscriptionContext } from '../../../contexts/SubscriptionContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../i18n';
import { Permission } from '../../../lib/permissions';
import { cn } from '../../../lib/utils';
import SettingSkeleton from './Skeleton';

function formatNumber(n: number, locale?: string): string {
  if (n >= 1_000_000)
    return (n / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'M';
  if (n >= 1_000) return (n / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'K';
  return n.toLocaleString(locale);
}

function formatSlug(slug: string): string {
  return slug.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getUsagePercent(consumed: number, included: number): number {
  if (included <= 0) return consumed > 0 ? 100 : 0;
  return Math.min((consumed / included) * 100, 100);
}

function getStatusColor(
  percent: number,
  hasOverage: boolean
): {
  bar: string;
  bg: string;
  badge: string;
  badgeText: string;
} {
  if (hasOverage)
    return {
      bar: 'bg-destructive',
      bg: 'bg-destructive/15',
      badge: 'bg-destructive/15',
      badgeText: 'text-destructive',
    };
  if (percent >= 90)
    return {
      bar: 'bg-warning',
      bg: 'bg-warning/15',
      badge: 'bg-warning/15',
      badgeText: 'text-warning',
    };
  if (percent >= 75)
    return {
      bar: 'bg-warning/70',
      bg: 'bg-warning/15',
      badge: 'bg-warning/15',
      badgeText: 'text-warning',
    };
  return {
    bar: 'bg-info',
    bg: 'bg-info/15',
    badge: 'bg-info/15',
    badgeText: 'text-info',
  };
}

interface QuotaOverageInfo {
  overageCents: number;
  unitSize: number;
  currency: string;
  currencySymbol: string;
  estimatedCost: number;
}

function formatCost(amount: number, symbol: string, locale?: string): string {
  return (
    symbol + amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

import { formatDate } from '../../../lib/format-utils';

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
  const { t, formattingLocale, fmtNum } = useTranslation();
  const { can } = usePermissions();
  const fmtCost = (amount: number, symbol: string) => formatCost(amount, symbol, formattingLocale);
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

  // Usage reset period — quotas reset monthly (usageCurrentPeriodEnd), falls back to Stripe period
  const billingPeriod = useMemo(() => {
    const periodEnd =
      subResponse?.subscription?.usageCurrentPeriodEnd ||
      subResponse?.subscription?.stripeCurrentPeriodEnd;
    if (!periodEnd) return null;

    const endFormatted = formatDate(periodEnd, formattingLocale);
    if (!endFormatted) return null;

    return { endDate: endFormatted, daysRemaining: getDaysRemaining(periodEnd) };
  }, [subResponse, formattingLocale]);

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

  if (!can(Permission.WORKSPACE_USAGE_VIEW)) return null;

  if (error) {
    return (
      <StatusBanner
        variant="error"
        title={t('usage.errorLoading')}
        message={error}
        actionLabel={t('settings.common.retryAction', { loading: String(refreshing) })}
        onAction={handleRefresh}
        actionDisabled={refreshing}
      />
    );
  }

  const rawEntries = quotas ? Object.entries(quotas) : [];
  const entries = sortByUrgency(rawEntries);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
        title={t('usage.noData')}
        description={t('usage.noDataHint')}
        action={
          <Button variant="outline" size="sm" progress={refreshing} onClick={handleRefresh}>
            {t('settings.common.refreshAction', { loading: String(refreshing) })}
          </Button>
        }
      />
    );
  }

  const overageCount = entries.filter(([, q]) => q.hasOverage).length;
  // Compute average usage percentage across quotas (each quota weighted equally)
  const avgUsagePercent =
    entries.length > 0
      ? Math.round(
          entries.reduce(
            (sum, [, q]) => sum + (q.included > 0 ? (q.consumed / q.included) * 100 : 0),
            0
          ) / entries.length
        )
      : 0;

  const totalOverageCost = Object.values(overagePricing).reduce(
    (sum, info) => sum + info.estimatedCost,
    0
  );
  const anyCurrency = Object.values(overagePricing)[0]?.currencySymbol ?? '$';

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('usage.description')}</p>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5 me-1.5', refreshing && 'animate-spin')} />
          {t('settings.common.refreshAction', { loading: String(refreshing) })}
        </Button>
      </div>

      {/* Billing period */}
      {billingPeriod && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
          <span>
            {t('usage.resetDateDisplay', { date: billingPeriod.endDate })}
            {billingPeriod.daysRemaining !== null && billingPeriod.daysRemaining > 0 && (
              <span className="text-muted-foreground">
                {' '}
                ({t('usage.daysRemainingDisplay', { count: billingPeriod.daysRemaining })})
              </span>
            )}
            {billingPeriod.daysRemaining !== null && billingPeriod.daysRemaining <= 0 && (
              <span className="text-warning font-medium"> ({t('usage.renewingSoon')})</span>
            )}
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="border border-border rounded-lg p-3 sm:p-4">
          <p className="text-xs text-muted-foreground font-medium">{t('usage.totalResources')}</p>
          <p className="text-lg sm:text-xl font-semibold text-foreground mt-1">
            {fmtNum(entries.length)}
          </p>
        </div>
        <div className="border border-border rounded-lg p-3 sm:p-4">
          <p className="text-xs text-muted-foreground font-medium">{t('usage.overallUsage')}</p>
          <p className="text-lg sm:text-xl font-semibold text-foreground mt-1">
            {fmtNum(avgUsagePercent) + '%'}
          </p>
        </div>
        <div
          className={cn(
            'border rounded-lg p-3 sm:p-4',
            overageCount > 0 ? 'border-destructive/20 bg-destructive/10' : 'border-border'
          )}
        >
          <p className="text-xs text-muted-foreground font-medium">{t('usage.inOverage')}</p>
          <p
            className={cn(
              'text-lg sm:text-xl font-semibold mt-1',
              overageCount > 0 ? 'text-destructive' : 'text-foreground'
            )}
          >
            {fmtNum(overageCount)}
          </p>
        </div>
        {overageCount > 0 && totalOverageCost > 0 && (
          <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-3 sm:p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('usage.estOverageCost')}</p>
            <p className="text-lg sm:text-xl font-semibold mt-1 text-destructive">
              {fmtCost(totalOverageCost, anyCurrency)}
            </p>
          </div>
        )}
      </div>

      {/* Overage warning */}
      {overageCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5 hidden sm:block" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-warning mb-1">
                {t('usage.overageDetected')}
              </h3>
              <p className="text-sm text-warning">
                {t('usage.overageWarning', { count: overageCount })}
              </p>
              {totalOverageCost > 0 && (
                <p className="text-sm text-warning font-medium mt-1">
                  {t('usage.estOverageCharges', { amount: fmtCost(totalOverageCost, anyCurrency) })}
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
  const { t, formattingLocale } = useTranslation();
  const fmtN = (n: number) => formatNumber(n, formattingLocale);
  const fmtCost = (amount: number, symbol: string) => formatCost(amount, symbol, formattingLocale);
  return (
    <div className="border border-border rounded-lg p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-y-1 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">{formatSlug(slug)}</h3>
          {quota.hasOverage && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                colors.badge,
                colors.badgeText
              )}
            >
              {t('usage.overage')}
            </span>
          )}
          {!quota.hasOverage && percent >= 90 && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                colors.badge,
                colors.badgeText
              )}
            >
              {t('usage.almostFull')}
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {fmtN(quota.consumed)} / {fmtN(quota.included)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={formatSlug(slug)}
        className={cn('h-2 rounded-full w-full', colors.bg)}
      >
        <div
          className={cn('h-2 rounded-full transition-all duration-500', colors.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Details row */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{t('usage.percentUsed', { percent: Math.round(percent) })}</span>
        <span>
          {quota.available > 0
            ? t('usage.availableRemaining', { count: fmtN(quota.available) })
            : quota.hasOverage
              ? t('usage.overLimitCount', { count: fmtN(quota.overage) })
              : t('usage.fullyUsed')}
        </span>
      </div>

      {/* Billable overage breakdown */}
      {quota.hasOverage && pricing && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('usage.overageUnits')}</span>
            <span className="font-medium text-foreground">{fmtN(quota.overage)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('usage.rate')}</span>
            <span className="font-medium text-foreground">
              {t('usage.rateDisplay', {
                rate: fmtCost(pricing.overageCents / 100, pricing.currencySymbol),
                unitSize: pricing.unitSize,
              })}
            </span>
          </div>
          {pricing.unitSize > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('usage.billableBlocks')}</span>
              <span className="font-medium text-foreground">
                {fmtN(Math.ceil(quota.overage / pricing.unitSize))}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
            <span className="font-medium text-destructive">{t('usage.estimatedCharge')}</span>
            <span className="font-semibold text-destructive">
              {fmtCost(pricing.estimatedCost, pricing.currencySymbol)}
            </span>
          </div>
        </div>
      )}

      {/* Overage rate info when not yet in overage but pricing exists */}
      {!quota.hasOverage && pricing && (
        <div className="mt-2 text-xs text-muted-foreground">
          {t('usage.overageRateDisplay', {
            rate: t('usage.rateDisplay', {
              rate: fmtCost(pricing.overageCents / 100, pricing.currencySymbol),
              unitSize: pricing.unitSize,
            }),
          })}
        </div>
      )}
    </div>
  );
}

export default WorkspaceSettingsUsage;
