import React, { useEffect, useMemo, useState } from 'react';
import { formatCents, getCurrencyFlag } from '../../../api/currency-utils';
import {
  getAvailableCurrenciesFromPlans,
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getPerSeatPriceCents,
  getQuotaDisplayWithVariant,
  getSeatPricing,
} from '../../../api/pricing-variant-utils';
import { formatQuotaWithPrice, getQuotaDisplayValue } from '../../../api/quota-utils';
import { BillingInterval, IPlanVersionWithPlan, ISubscriptionItem } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planVersions: IPlanVersionWithPlan[];
  currentPlanVersionId?: string | null;
  currentStripePriceId?: string | null;
  /**
   * When set, only this currency is allowed (workspace has existing Stripe billing; Stripe does not allow multiple currencies per customer).
   * When null/undefined, all plan currencies are available.
   */
  billingCurrency?: string | null;
  /** Called when user selects a plan. Currency is optional (for display/logging only; not sent to API). */
  onSelectPlan: (
    planVersionId: string,
    billingInterval: BillingInterval,
    currency?: string
  ) => Promise<void>;
  loading?: boolean;
}

// Get all unique subscription items across all plans
const getAllSubscriptionItems = (planVersions: IPlanVersionWithPlan[]) => {
  const allItems = new Map<string, ISubscriptionItem>();

  planVersions.forEach(planVersion => {
    planVersion.subscriptionItems?.forEach(item => {
      if (!allItems.has(item._id)) {
        allItems.set(item._id, item);
      }
    });
  });

  return Array.from(allItems.values());
};

// Format price for display (cents → localized amount with correct currency symbol). Caller must pass currency.
const formatPrice = (priceInCents: number | undefined | null, currency: string): string => {
  if (priceInCents === undefined || priceInCents === null) return 'Free';
  if (priceInCents === 0) return 'Free';
  return formatCents(priceInCents, currency);
};

// Get interval label
const getIntervalLabel = (interval: BillingInterval): string => {
  switch (interval) {
    case 'monthly':
      return '/mo';
    case 'quarterly':
      return '/qtr';
    case 'yearly':
      return '/yr';
    default:
      return '/mo';
  }
};

// Calculate savings percentage for yearly/quarterly vs monthly
const calculateSavings = (
  monthlyPrice: number,
  intervalPrice: number,
  interval: BillingInterval
): number | null => {
  if (!monthlyPrice || monthlyPrice === 0) return null;

  let monthlyEquivalent: number;
  switch (interval) {
    case 'yearly':
      monthlyEquivalent = intervalPrice / 12;
      break;
    case 'quarterly':
      monthlyEquivalent = intervalPrice / 3;
      break;
    default:
      return null;
  }

  const savings = ((monthlyPrice - monthlyEquivalent) / monthlyPrice) * 100;
  return savings > 0 ? Math.round(savings) : null;
};

const SubscriptionDialog: React.FC<SubscriptionDialogProps> = ({
  open,
  onOpenChange,
  planVersions: propPlanVersions,
  currentPlanVersionId,
  currentStripePriceId,
  billingCurrency: workspaceBillingCurrency,
  onSelectPlan,
  loading: isUpdating = false,
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // Derive current billing interval and currency from price ID
  const currentIntervalAndCurrency = useMemo(() => {
    return getBillingIntervalAndCurrencyFromPriceId(currentStripePriceId, propPlanVersions);
  }, [currentStripePriceId, propPlanVersions]);

  const currentBillingInterval = currentIntervalAndCurrency?.interval ?? null;
  const currentCurrency = currentIntervalAndCurrency?.currency ?? null;

  const allPlanCurrencies = useMemo(
    () => getAvailableCurrenciesFromPlans(propPlanVersions),
    [propPlanVersions]
  );

  // When workspace has billingCurrency set, only allow that currency (Stripe single-currency per customer). Otherwise show all.
  const availableCurrencies = useMemo(() => {
    const locked = workspaceBillingCurrency?.trim().toLowerCase();
    if (locked) {
      return allPlanCurrencies.includes(locked) ? [locked] : [];
    }
    return allPlanCurrencies;
  }, [workspaceBillingCurrency, allPlanCurrencies]);

  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(
    currentBillingInterval || 'monthly'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    if (currentCurrency && availableCurrencies.includes(currentCurrency)) return currentCurrency;
    return availableCurrencies.length > 0 ? availableCurrencies[0]! : '';
  });

  // Effective currency for display/checkout: workspace lock or user selection (never hardcoded).
  const effectiveCurrency = workspaceBillingCurrency?.trim() || selectedCurrency;

  // Sync selected interval and currency when dialog opens or current subscription changes
  useEffect(() => {
    if (open) {
      setSelectedInterval(currentBillingInterval || 'monthly');
      if (currentCurrency && availableCurrencies.includes(currentCurrency)) {
        setSelectedCurrency(currentCurrency);
      } else if (
        availableCurrencies.length > 0 &&
        !availableCurrencies.includes(selectedCurrency)
      ) {
        setSelectedCurrency(availableCurrencies[0]!);
      }
    }
  }, [open, currentBillingInterval, currentCurrency, availableCurrencies]);

  // Sort plans by version number
  const sortedPlans = useMemo(() => {
    return [...propPlanVersions].sort((a, b) => a.version - b.version);
  }, [propPlanVersions]);

  const allItems = getAllSubscriptionItems(sortedPlans);

  const features = allItems.filter(item => item.type === 'feature');
  const limits = allItems.filter(item => item.type === 'limit');
  const quotas = allItems.filter(item => item.type === 'quota');

  const handleSelectPlan = async (planVersionId: string) => {
    // Block if same plan AND same interval, or if already loading
    const isSamePlanAndInterval =
      planVersionId === currentPlanVersionId && currentBillingInterval === selectedInterval;
    if (isSamePlanAndInterval || isUpdating || localLoading) return;

    setLocalLoading(true);
    setProcessingPlanId(planVersionId);
    try {
      await onSelectPlan(planVersionId, selectedInterval, effectiveCurrency);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLocalLoading(false);
      setProcessingPlanId(null);
    }
  };

  // Get price for a plan based on effective currency and interval (multi-currency aware)
  const getPriceForInterval = (planVersion: IPlanVersionWithPlan): number | null => {
    return getBasePriceCents(planVersion, effectiveCurrency, selectedInterval);
  };

  // Whether this plan has a pricing variant for the effective currency (for disabling subscribe when unavailable)
  const hasVariantForCurrency = (planVersion: IPlanVersionWithPlan): boolean =>
    !!planVersion.pricingVariants?.some(
      v => v.currency?.toLowerCase() === effectiveCurrency.toLowerCase()
    );

  const isLoading = isUpdating || localLoading;

  // Get interval display name
  const getIntervalDisplayName = (interval: BillingInterval): string => {
    switch (interval) {
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return 'Monthly';
    }
  };

  const getPlanButtonState = (planVersion: IPlanVersionWithPlan) => {
    const isSamePlan = planVersion._id === currentPlanVersionId;
    const isSameInterval = currentBillingInterval === selectedInterval;

    // Same plan + same interval = Current Plan (disabled)
    if (isSamePlan && isSameInterval) {
      return { label: 'Current Plan', variant: 'outline' as const, disabled: true };
    }

    // Same plan + different interval = Allow switching interval
    if (isSamePlan && !isSameInterval) {
      return {
        label: `Switch to ${getIntervalDisplayName(selectedInterval)}`,
        variant: 'default' as const,
        disabled: false,
      };
    }

    // No current subscription
    if (!currentPlanVersionId) {
      return { label: 'Subscribe', variant: 'default' as const, disabled: false };
    }

    // Find current plan index in sorted array
    const currentIndex = sortedPlans.findIndex(pv => pv._id === currentPlanVersionId);
    const planIndex = sortedPlans.findIndex(pv => pv._id === planVersion._id);

    if (currentIndex === -1 || planIndex === -1) {
      return { label: 'Select', variant: 'default' as const, disabled: false };
    }

    if (planIndex < currentIndex) {
      return { label: 'Downgrade', variant: 'outline' as const, disabled: false };
    } else if (planIndex > currentIndex) {
      return { label: 'Upgrade', variant: 'default' as const, disabled: false };
    }

    return { label: 'Select', variant: 'default' as const, disabled: false };
  };

  const getValueForPlan = (
    planVersion: IPlanVersionWithPlan,
    item: ISubscriptionItem,
    interval: BillingInterval = 'monthly'
  ): boolean | number | { included: number; overage?: number; unitSize?: number } | null => {
    if (item.type === 'feature') {
      return planVersion.features?.[item.slug] ?? false;
    } else if (item.type === 'limit') {
      return planVersion.limits?.[item.slug] ?? null;
    } else if (item.type === 'quota') {
      const withVariant = getQuotaDisplayWithVariant(
        planVersion,
        effectiveCurrency,
        item.slug,
        interval
      );
      if (withVariant) return withVariant;
      return getQuotaDisplayValue(planVersion.quotas?.[item.slug], interval);
    }
    return null;
  };

  const formatValue = (
    value: boolean | number | { included: number; overage?: number; unitSize?: number } | null,
    item: ISubscriptionItem,
    currency: string
  ): string => {
    if (item.type === 'feature') {
      return value === true ? '✓' : '—';
    } else if (item.type === 'limit') {
      return value !== null && value !== undefined ? String(value) : '—';
    } else if (item.type === 'quota') {
      const quotaValue =
        typeof value === 'object' && value !== null && 'included' in value ? value : null;
      return formatQuotaWithPrice(quotaValue, item.name.toLowerCase(), { currency });
    }
    return '—';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="inset-0 w-screen h-screen max-w-none rounded-none translate-x-0 translate-y-0 p-0 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b space-y-4">
          <div>
            <DialogTitle className="text-2xl font-bold">Choose Your Plan</DialogTitle>
            <DialogDescription className="mt-1">
              Compare plans and select the one that fits your needs
            </DialogDescription>
          </div>
          {/* Row below title: currency on the left (only when workspace has no billingCurrency), interval on the right */}
          <div className="flex items-center justify-between gap-4">
            {/* Currency selector (left) – only show when workspace has no locked billing currency */}
            <div className="flex items-center gap-2">
              {!workspaceBillingCurrency?.trim() && availableCurrencies.length > 1 && (
                <>
                  <span className="text-sm text-slate-600">Currency</span>
                  <select
                    aria-label="Select billing currency"
                    value={selectedCurrency}
                    onChange={e => setSelectedCurrency(e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {availableCurrencies.map(code => {
                      const flag = getCurrencyFlag(code);
                      return (
                        <option key={code} value={code}>
                          {flag ? `${flag} ${code.toUpperCase()}` : code.toUpperCase()}
                        </option>
                      );
                    })}
                  </select>
                </>
              )}
            </div>
            {/* Billing interval selector (right) */}
            <div
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
              role="group"
              aria-label="Billing interval"
            >
              {(['monthly', 'quarterly', 'yearly'] as BillingInterval[]).map(interval => {
                const isCurrentInterval = currentBillingInterval === interval;
                return (
                  <button
                    key={interval}
                    onClick={() => setSelectedInterval(interval)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all relative ${
                      selectedInterval === interval
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {interval === 'monthly' && 'Monthly'}
                      {interval === 'quarterly' && 'Quarterly'}
                      {interval === 'yearly' && 'Yearly'}
                      {interval === 'yearly' && (
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                          Save
                        </span>
                      )}
                      {isCurrentInterval && currentPlanVersionId && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                          Current
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {workspaceBillingCurrency?.trim() && availableCurrencies.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-slate-600 font-medium">
                No plans available for your billing currency.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Something went wrong. Please contact support.
              </p>
            </div>
          ) : sortedPlans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No plans available</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden bg-white">
              {/* Single scroll container - required for sticky to work */}
              <div className="overflow-auto h-full" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
                <table
                  className="w-full border-separate border-spacing-0"
                  style={{
                    minWidth: `${280 + sortedPlans.length * 200}px`,
                    borderCollapse: 'separate',
                  }}
                >
                  <colgroup>
                    <col style={{ width: 280, minWidth: 280 }} />
                    {sortedPlans.map(planVersion => (
                      <col key={planVersion._id} style={{ width: 200, minWidth: 200 }} />
                    ))}
                  </colgroup>
                  <thead>
                    {/* Sticky header row - plan cards */}
                    <tr className="align-top">
                      <th className="sticky top-0 left-0 z-30 p-0 bg-white   text-left"></th>
                      {sortedPlans.map(planVersion => {
                        const isCurrent = planVersion._id === currentPlanVersionId;
                        const buttonState = getPlanButtonState(planVersion);
                        const isPlanLoading = isLoading && planVersion._id === processingPlanId;
                        const price = getPriceForInterval(planVersion);
                        const monthlyPrice =
                          getBasePriceCents(planVersion, effectiveCurrency, 'monthly') ?? 0;
                        const savings =
                          selectedInterval !== 'monthly' && price !== null
                            ? calculateSavings(monthlyPrice, price, selectedInterval)
                            : null;
                        const hasVariant = hasVariantForCurrency(planVersion);
                        const displayCurrency =
                          planVersion.pricingVariants?.length &&
                          planVersion.pricingVariants.some(
                            v => v.currency?.toLowerCase() === effectiveCurrency.toLowerCase()
                          )
                            ? effectiveCurrency
                            : (planVersion.plan?.currency ?? effectiveCurrency ?? '');

                        return (
                          <th
                            key={planVersion._id}
                            className={`sticky top-0 z-20 border-b border-slate-200 p-3 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.06)] ${
                              planVersion._id === currentPlanVersionId
                                ? 'bg-blue-50/80'
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex h-full flex-col gap-3">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-bold text-slate-900 truncate">
                                  {planVersion.plan.name}
                                </h3>
                                {isCurrent && (
                                  <span className="shrink-0 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                                    Current
                                  </span>
                                )}
                              </div>

                              {/* Pricing Display */}
                              <div className="flex flex-col items-start">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-bold text-slate-900">
                                    {hasVariant && price !== null
                                      ? formatPrice(price, displayCurrency)
                                      : !hasVariant
                                        ? '—'
                                        : formatPrice(price, displayCurrency)}
                                  </span>
                                  {price !== null && price > 0 && hasVariant && (
                                    <span className="text-sm text-slate-500">
                                      {getIntervalLabel(selectedInterval)}
                                    </span>
                                  )}
                                </div>
                                {savings !== null && savings > 0 && hasVariant && (
                                  <span className="text-xs text-emerald-600 font-medium mt-0.5">
                                    Save {savings}% vs monthly
                                  </span>
                                )}
                                {/* Seat pricing info */}
                                {(() => {
                                  const seatConfig = getSeatPricing(planVersion, effectiveCurrency);
                                  if (!seatConfig) return null;
                                  const perSeat = getPerSeatPriceCents(planVersion, effectiveCurrency, selectedInterval);
                                  if (!perSeat || perSeat <= 0) return null;
                                  return (
                                    <div className="text-xs text-slate-500 mt-1 border-t border-slate-100 pt-1">
                                      <span>+ {formatCents(perSeat, displayCurrency)}/seat{getIntervalLabel(selectedInterval)}</span>
                                      {seatConfig.includedSeats > 0 && (
                                        <span className="text-slate-400"> ({seatConfig.includedSeats} included)</span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {planVersion.plan.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed text-left">
                                  {planVersion.plan.description}
                                </p>
                              )}
                              <Button
                                className="mt-auto w-full"
                                variant={buttonState.variant}
                                disabled={buttonState.disabled || isLoading || !hasVariant}
                                progress={isPlanLoading}
                                onClick={() => handleSelectPlan(planVersion._id)}
                              >
                                {isPlanLoading
                                  ? 'Processing...'
                                  : !hasVariant
                                    ? 'Unavailable'
                                    : buttonState.label}
                              </Button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Features Section */}
                    {features.length > 0 && (
                      <>
                        <tr>
                          <td className="sticky left-0 z-10 border-t border-slate-200 bg-slate-100 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            Features
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-slate-200 bg-slate-100"
                          />
                        </tr>
                        {features.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            {sortedPlans.map(planVersion => {
                              const value = getValueForPlan(planVersion, item, selectedInterval);
                              const displayCurrency = planVersion.pricingVariants?.length
                                ? effectiveCurrency
                                : (planVersion.plan?.currency ?? effectiveCurrency ?? '');
                              const formatted = formatValue(value, item, displayCurrency);
                              const isEnabled = item.type === 'feature' && value === true;
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${
                                    planVersion._id === currentPlanVersionId
                                      ? 'bg-blue-50/50'
                                      : 'bg-white'
                                  }`}
                                >
                                  <span
                                    className={`text-sm font-medium ${
                                      isEnabled
                                        ? 'text-emerald-600'
                                        : formatted === '—'
                                          ? 'text-slate-400'
                                          : 'text-slate-700'
                                    }`}
                                  >
                                    {formatted}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Limits Section */}
                    {limits.length > 0 && (
                      <>
                        <tr>
                          <td className="sticky left-0 z-10 border-t border-slate-200 bg-slate-100 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            Limits
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-slate-200 bg-slate-100"
                          />
                        </tr>
                        {limits.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            {sortedPlans.map(planVersion => {
                              const value = getValueForPlan(planVersion, item, selectedInterval);
                              const displayCurrency = planVersion.pricingVariants?.length
                                ? effectiveCurrency
                                : (planVersion.plan?.currency ?? effectiveCurrency ?? '');
                              const formatted = formatValue(value, item, displayCurrency);
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${
                                    planVersion._id === currentPlanVersionId
                                      ? 'bg-blue-50/50'
                                      : 'bg-white'
                                  }`}
                                >
                                  <span
                                    className={`text-sm font-medium ${
                                      formatted === '—' ? 'text-slate-400' : 'text-slate-700'
                                    }`}
                                  >
                                    {formatted}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Quotas Section */}
                    {quotas.length > 0 && (
                      <>
                        <tr>
                          <td className="sticky left-0 z-10 border-t border-slate-200 bg-slate-100 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            Quotas
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-slate-200 bg-slate-100"
                          />
                        </tr>
                        {quotas.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            {sortedPlans.map(planVersion => {
                              const value = getValueForPlan(planVersion, item, selectedInterval);
                              const displayCurrency = planVersion.pricingVariants?.length
                                ? effectiveCurrency
                                : (planVersion.plan?.currency ?? effectiveCurrency ?? '');
                              const formatted = formatValue(value, item, displayCurrency);
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${
                                    planVersion._id === currentPlanVersionId
                                      ? 'bg-blue-50/50'
                                      : 'bg-white'
                                  }`}
                                >
                                  <span
                                    className={`text-sm font-medium ${
                                      formatted === '—' ? 'text-slate-400' : 'text-slate-700'
                                    }`}
                                  >
                                    {formatted}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Seats Section */}
                    {sortedPlans.some(pv => {
                      const sp = getSeatPricing(pv, effectiveCurrency);
                      return sp?.enabled;
                    }) && (
                      <>
                        <tr>
                          <td className="sticky left-0 z-10 border-t border-emerald-200 bg-emerald-50 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-emerald-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            Seats
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-emerald-200 bg-emerald-50"
                          />
                        </tr>
                        {/* Included seats row */}
                        <tr className="group hover:bg-slate-50/50">
                          <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                            <div className="font-medium text-sm text-slate-900">Included seats</div>
                            <div className="text-xs text-slate-500 mt-0.5">Free with base price</div>
                          </td>
                          {sortedPlans.map(planVersion => {
                            const sp = getSeatPricing(planVersion, effectiveCurrency);
                            return (
                              <td key={planVersion._id} className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}>
                                <span className="text-sm font-medium text-slate-700">
                                  {sp?.enabled ? (sp.includedSeats || 0) : '—'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        {/* Max seats row */}
                        <tr className="group hover:bg-slate-50/50">
                          <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                            <div className="font-medium text-sm text-slate-900">Max seats</div>
                          </td>
                          {sortedPlans.map(planVersion => {
                            const sp = getSeatPricing(planVersion, effectiveCurrency);
                            return (
                              <td key={planVersion._id} className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}>
                                <span className="text-sm font-medium text-slate-700">
                                  {sp?.enabled ? ((sp as any).maxSeats > 0 ? (sp as any).maxSeats : 'Unlimited') : '—'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        {/* Per seat price row */}
                        <tr className="group hover:bg-slate-50/50">
                          <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                            <div className="font-medium text-sm text-slate-900">Per extra seat</div>
                          </td>
                          {sortedPlans.map(planVersion => {
                            const perSeat = getPerSeatPriceCents(planVersion, effectiveCurrency, selectedInterval);
                            const displayCurrency = planVersion.pricingVariants?.length
                              ? effectiveCurrency : (planVersion.plan?.currency ?? effectiveCurrency ?? '');
                            return (
                              <td key={planVersion._id} className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}>
                                <span className="text-sm font-medium text-slate-700">
                                  {perSeat && perSeat > 0 ? `${formatCents(perSeat, displayCurrency)}${getIntervalLabel(selectedInterval)}` : '—'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;
