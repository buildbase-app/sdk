import React, { useEffect, useMemo, useState } from 'react';
import { getCurrencyFlag } from '../../../api/billing/currency-utils';
import {
  getAvailableCurrenciesFromPlans,
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getPerSeatPriceCents,
  getQuotaDisplayWithVariant,
  getSeatPricing,
} from '../../../api/billing/pricing-variant-utils';
import { getQuotaDisplayParts, getQuotaDisplayValue } from '../../../api/billing/quota-utils';
import {
  BillingInterval,
  BillingIntervals,
  IPlanVersionWithPlan,
  ISubscriptionItem,
  SubscriptionItemType,
} from '../../../api/types';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useSaaSSettings } from '../../os/hooks';
import { WorkspaceModes } from '../../types';

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
  /** Current workspace member count — used to show billable seats in the comparison table. */
  currentMemberCount?: number;
  /** When set, workspace has used a trial — hide trial badges/buttons. */
  trialUsedAt?: string | null;
  /** Workspace name — displayed in the dialog header so users know which workspace they're subscribing for. */
  workspaceName?: string;
  /** Pre-select billing interval when dialog opens (e.g. from pricing page BB params). */
  initialInterval?: BillingInterval;
  /** Pre-select currency when dialog opens (e.g. from pricing page BB params). */
  initialCurrency?: string;
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

// formatPrice is defined inside the component to use formattingLocale (see fmtPrice)

// Interval label keys — resolved via t() inside the component
const INTERVAL_LABEL_KEYS: Record<string, TranslationKey> = {
  [BillingIntervals.Monthly]: 'subscription.billingInterval.perMonth',
  [BillingIntervals.Quarterly]: 'subscription.billingInterval.perQuarter',
  [BillingIntervals.Yearly]: 'subscription.billingInterval.perYear',
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
    case BillingIntervals.Yearly:
      monthlyEquivalent = intervalPrice / 12;
      break;
    case BillingIntervals.Quarterly:
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
  currentMemberCount,
  trialUsedAt,
  workspaceName,
  initialInterval,
  initialCurrency,
  onSelectPlan,
  loading: isUpdating = false,
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const { t, formattingLocale, dir, fmtNum, fmtCents } = useTranslation();
  const { settings: orgSettings } = useSaaSSettings();
  const isPersonalMode = orgSettings?.workspace?.mode === WorkspaceModes.Personal;
  /** Format price in cents for display. Returns '' for 0/null. */
  const formatPrice = (priceInCents: number | undefined | null, currency: string): string => {
    if (priceInCents === undefined || priceInCents === null || priceInCents === 0) return '';
    return fmtCents(priceInCents, currency);
  };
  const getIntervalLabel = (interval: BillingInterval): string =>
    t(INTERVAL_LABEL_KEYS[interval] ?? INTERVAL_LABEL_KEYS[BillingIntervals.Monthly]);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  // Synchronous guard against double-clicks (state updates are async and can be bypassed by rapid clicks)
  const submittingRef = React.useRef(false);

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
    initialInterval || currentBillingInterval || BillingIntervals.Monthly
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    if (initialCurrency && availableCurrencies.includes(initialCurrency)) return initialCurrency;
    if (currentCurrency && availableCurrencies.includes(currentCurrency)) return currentCurrency;
    return availableCurrencies.length > 0 ? availableCurrencies[0]! : '';
  });

  // Effective currency for display/checkout: workspace lock or user selection (never hardcoded).
  const effectiveCurrency = workspaceBillingCurrency?.trim() || selectedCurrency;

  // Sync selected interval and currency when dialog opens or current subscription changes.
  // Priority: initialInterval/initialCurrency (from BB params) > current subscription > defaults.
  useEffect(() => {
    if (open) {
      setSelectedInterval(initialInterval || currentBillingInterval || BillingIntervals.Monthly);
      const preferredCurrency = initialCurrency || currentCurrency;
      if (preferredCurrency && availableCurrencies.includes(preferredCurrency)) {
        setSelectedCurrency(preferredCurrency);
      } else if (
        availableCurrencies.length > 0 &&
        !availableCurrencies.includes(selectedCurrency)
      ) {
        setSelectedCurrency(availableCurrencies[0]!);
      }
    }
  }, [
    open,
    initialInterval,
    initialCurrency,
    currentBillingInterval,
    currentCurrency,
    availableCurrencies,
  ]);

  // Preserve plan order from planVersionIds (admin-configured display order)
  const sortedPlans = useMemo(() => {
    return [...propPlanVersions];
  }, [propPlanVersions]);

  const allItems = getAllSubscriptionItems(sortedPlans);

  const features = allItems.filter(item => item.type === SubscriptionItemType.Feature);
  const limits = allItems.filter(item => item.type === SubscriptionItemType.Limit);
  const quotas = allItems.filter(item => item.type === SubscriptionItemType.Quota);

  const handleSelectPlan = async (planVersionId: string) => {
    // Block if same plan AND same interval, or if already loading
    const isSamePlanAndInterval =
      planVersionId === currentPlanVersionId && currentBillingInterval === selectedInterval;
    if (isSamePlanAndInterval || isUpdating || localLoading || submittingRef.current) return;

    // Synchronous ref guard prevents double-click (state updates are batched/async)
    submittingRef.current = true;
    setLocalLoading(true);
    setProcessingPlanId(planVersionId);
    try {
      await onSelectPlan(planVersionId, selectedInterval, effectiveCurrency);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      submittingRef.current = false;
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
      case BillingIntervals.Monthly:
        return t('subscription.billingInterval.monthly');
      case BillingIntervals.Quarterly:
        return t('subscription.billingInterval.quarterly');
      case BillingIntervals.Yearly:
        return t('subscription.billingInterval.yearly');
      default:
        return t('subscription.billingInterval.monthly');
    }
  };

  const getPlanButtonState = (
    planVersion: IPlanVersionWithPlan
  ): {
    labelKey: string;
    dynamicLabel?: string;
    variant: 'default' | 'outline';
    disabled: boolean;
  } => {
    const isSamePlan = planVersion._id === currentPlanVersionId;
    const isSameInterval = currentBillingInterval === selectedInterval;

    // Same plan + same interval = Current Plan (disabled)
    if (isSamePlan && isSameInterval) {
      return {
        labelKey: 'subscription.currentPlan' as TranslationKey,
        variant: 'outline' as const,
        disabled: true,
      };
    }

    // Same plan + different interval = Allow switching interval (skip for freemium — $0 at any interval)
    if (isSamePlan && !isSameInterval) {
      if (planVersion.plan?.isFreemium) {
        return {
          labelKey: 'subscription.currentPlan' as TranslationKey,
          variant: 'outline' as const,
          disabled: true,
        };
      }
      return {
        labelKey: '_dynamic',
        dynamicLabel: t('subscription.switchToInterval', {
          interval: getIntervalDisplayName(selectedInterval),
        }),
        variant: 'default' as const,
        disabled: false,
      };
    }

    // Trial is only available when: plan has trial, workspace hasn't trialed before, AND no existing Stripe subscription
    const trialAvailable =
      planVersion.trial?.enabled &&
      planVersion.trial.durationDays > 0 &&
      !trialUsedAt &&
      !currentStripePriceId;

    // No current subscription
    if (!currentPlanVersionId) {
      if (trialAvailable) {
        return {
          labelKey: '_dynamic',
          dynamicLabel: t('subscription.startTrialDays', { days: planVersion.trial!.durationDays }),
          variant: 'default' as const,
          disabled: false,
        };
      }
      return {
        labelKey: 'subscription.subscribe' as TranslationKey,
        variant: 'default' as const,
        disabled: false,
      };
    }

    // Find current plan index in sorted array
    const currentIndex = sortedPlans.findIndex(pv => pv._id === currentPlanVersionId);
    const planIndex = sortedPlans.findIndex(pv => pv._id === planVersion._id);

    if (currentIndex === -1 || planIndex === -1) {
      if (trialAvailable) {
        return {
          labelKey: '_dynamic',
          dynamicLabel: t('subscription.startTrialDays', { days: planVersion.trial!.durationDays }),
          variant: 'default' as const,
          disabled: false,
        };
      }
      return {
        labelKey: 'subscription.checkout.select' as TranslationKey,
        variant: 'default' as const,
        disabled: false,
      };
    }

    if (planIndex < currentIndex) {
      return {
        labelKey: 'subscription.checkout.downgrade' as TranslationKey,
        variant: 'outline' as const,
        disabled: false,
      };
    } else if (planIndex > currentIndex) {
      if (trialAvailable) {
        return {
          labelKey: '_dynamic',
          dynamicLabel: t('subscription.startTrialDays', { days: planVersion.trial!.durationDays }),
          variant: 'default' as const,
          disabled: false,
        };
      }
      return {
        labelKey: 'subscription.checkout.upgrade' as TranslationKey,
        variant: 'default' as const,
        disabled: false,
      };
    }

    return {
      labelKey: 'subscription.checkout.select' as TranslationKey,
      variant: 'default' as const,
      disabled: false,
    };
  };

  const getValueForPlan = (
    planVersion: IPlanVersionWithPlan,
    item: ISubscriptionItem,
    interval: BillingInterval = BillingIntervals.Monthly
  ): boolean | number | { included: number; overage?: number; unitSize?: number } | null => {
    if (item.type === SubscriptionItemType.Feature) {
      return planVersion.features?.[item.slug] ?? false;
    } else if (item.type === SubscriptionItemType.Limit) {
      return planVersion.limits?.[item.slug] ?? null;
    } else if (item.type === SubscriptionItemType.Quota) {
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
    if (item.type === SubscriptionItemType.Feature) {
      return value === true ? '✓' : '—';
    } else if (item.type === SubscriptionItemType.Limit) {
      return value !== null && value !== undefined && typeof value === 'number'
        ? fmtNum(value)
        : '—';
    } else if (item.type === SubscriptionItemType.Quota) {
      const quotaValue =
        typeof value === 'object' && value !== null && 'included' in value ? value : null;
      const parts = getQuotaDisplayParts(quotaValue, item.name.toLowerCase(), {
        currency,
        locale: formattingLocale,
      });
      if (!parts) return '—';
      if (!parts.allowOverage) {
        return t('quota.includedHardLimit', { count: parts.included });
      }
      return parts.hasOverage
        ? t('quota.includedWithOverage', {
            count: parts.included,
            price: parts.price,
            unit: parts.unit,
          })
        : t('quota.includedOnly', { count: parts.included });
    }
    return '—';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        className="inset-0 w-screen h-screen max-w-none rounded-none translate-x-0 translate-y-0 p-0 flex flex-col"
      >
        <div className="flex-shrink-0 px-4 py-4 sm:px-6 sm:py-6 border-b space-y-3 sm:space-y-4">
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {t('pricing.title')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {t('subscription.choosePlanDescription')}
              {workspaceName && (
                <span className="ml-1 font-medium text-foreground">
                  {t('subscription.forWorkspace', { name: workspaceName })}
                </span>
              )}
            </DialogDescription>
          </div>
          {/* Controls: currency + interval — stack vertically on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Currency selector – only show when workspace has no locked billing currency */}
            <div className="flex items-center gap-2">
              {!workspaceBillingCurrency?.trim() && availableCurrencies.length > 1 && (
                <>
                  <span className="text-sm text-slate-600">{t('pricing.currency')}</span>
                  <select
                    aria-label={t('pricing.selectCurrency')}
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
              {workspaceBillingCurrency?.trim() && (
                <span className="text-xs text-slate-500">
                  {t('subscription.billingInCurrency', {
                    currency: workspaceBillingCurrency.toUpperCase(),
                  })}
                </span>
              )}
            </div>
            {/* Billing interval selector */}
            <div
              className="flex items-center gap-0.5 sm:gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto"
              role="group"
              aria-label={t('pricing.billingInterval')}
            >
              {(
                [
                  BillingIntervals.Monthly,
                  BillingIntervals.Quarterly,
                  BillingIntervals.Yearly,
                ] as BillingInterval[]
              ).map(interval => {
                const isCurrentInterval = currentBillingInterval === interval;
                return (
                  <button
                    key={interval}
                    onClick={() => setSelectedInterval(interval)}
                    aria-pressed={selectedInterval === interval}
                    className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all relative ${
                      selectedInterval === interval
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1 sm:gap-1.5">
                      {interval === BillingIntervals.Monthly &&
                        t('subscription.billingInterval.monthly')}
                      {interval === BillingIntervals.Quarterly &&
                        t('subscription.billingInterval.quarterly')}
                      {interval === BillingIntervals.Yearly &&
                        t('subscription.billingInterval.yearly')}
                      {interval === BillingIntervals.Yearly && (
                        <span className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                          {t('pricing.save')}
                        </span>
                      )}
                      {isCurrentInterval && currentPlanVersionId && (
                        <span className="hidden sm:inline text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                          {t('pricing.current')}
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
              <p className="text-slate-600 font-medium">{t('pricing.noPlansCurrency')}</p>
              <p className="text-slate-500 text-sm mt-2">{t('pricing.noPlansCurrencyHint')}</p>
            </div>
          ) : sortedPlans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>{t('pricing.noPlans')}</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden bg-white">
              {/* ─── Mobile Layout: Stacked plan cards ─── */}
              <div
                className="md:hidden overflow-auto h-full"
                style={{ maxHeight: 'calc(100vh - 13rem)' }}
              >
                <div className="p-4 space-y-4">
                  {sortedPlans.map(planVersion => {
                    const isCurrent = planVersion._id === currentPlanVersionId;
                    const buttonState = getPlanButtonState(planVersion);
                    const isPlanLoading = isLoading && planVersion._id === processingPlanId;
                    const price = getPriceForInterval(planVersion);
                    const hasVariant = hasVariantForCurrency(planVersion);
                    const displayCurrency =
                      planVersion.pricingVariants?.length &&
                      planVersion.pricingVariants.some(
                        v => v.currency?.toLowerCase() === effectiveCurrency.toLowerCase()
                      )
                        ? effectiveCurrency
                        : (planVersion.plan?.currency ?? effectiveCurrency ?? '');
                    const monthlyPrice =
                      getBasePriceCents(planVersion, effectiveCurrency, BillingIntervals.Monthly) ??
                      0;
                    const savings =
                      selectedInterval !== BillingIntervals.Monthly && price !== null
                        ? calculateSavings(monthlyPrice, price, selectedInterval)
                        : null;
                    const sp = getSeatPricing(planVersion, effectiveCurrency);
                    const perSeat = sp
                      ? getPerSeatPriceCents(planVersion, effectiveCurrency, selectedInterval)
                      : null;

                    return (
                      <div
                        key={planVersion._id}
                        className={`rounded-xl border-2 p-4 ${isCurrent ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-white'}`}
                      >
                        {/* Plan header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900">
                                {planVersion.plan.name}
                              </h3>
                              {planVersion.trial?.enabled &&
                                planVersion.trial.durationDays > 0 &&
                                !isCurrent &&
                                !trialUsedAt &&
                                !currentStripePriceId && (
                                  <span className="shrink-0 rounded-md bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                    {t('subscription.trialBadge', {
                                      days: planVersion.trial.durationDays,
                                    })}
                                  </span>
                                )}
                            </div>
                            {planVersion.plan.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {planVersion.plan.description}
                              </p>
                            )}
                          </div>
                          {isCurrent && (
                            <span className="shrink-0 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                              {t('pricing.current')}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="mb-4">
                          <div className="flex items-baseline gap-1 whitespace-nowrap">
                            <span className="text-2xl font-bold text-slate-900">
                              {hasVariant && price !== null
                                ? formatPrice(price, displayCurrency) || t('pricing.free')
                                : !hasVariant
                                  ? '—'
                                  : formatPrice(price, displayCurrency) || t('pricing.free')}
                            </span>
                            {price !== null && price > 0 && hasVariant && (
                              <span className="text-sm text-slate-500">
                                {getIntervalLabel(selectedInterval)}
                              </span>
                            )}
                          </div>
                          {savings !== null && savings > 0 && hasVariant && (
                            <span className="text-xs text-emerald-600 font-medium">
                              {t('subscription.savingsPercent', { percent: savings })}
                            </span>
                          )}
                          {sp?.enabled && perSeat && perSeat > 0 && !isPersonalMode && (
                            <div className="text-xs text-slate-500 mt-1">
                              {t('subscription.seatPriceDisplay', {
                                price: fmtCents(perSeat, displayCurrency),
                                interval: getIntervalLabel(selectedInterval),
                                included: fmtNum(sp.includedSeats),
                                includedLabel: t('pricing.included'),
                              })}
                            </div>
                          )}
                        </div>

                        {/* Features list */}
                        {features.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                              {t('subscription.items.features')}
                            </div>
                            <div className="space-y-1">
                              {features.map(item => {
                                const value = getValueForPlan(planVersion, item, selectedInterval);
                                const isEnabled =
                                  item.type === SubscriptionItemType.Feature && value === true;
                                return (
                                  <div key={item._id} className="flex items-center gap-2 text-sm">
                                    {item.type === SubscriptionItemType.Feature ? (
                                      isEnabled ? (
                                        <span className="text-emerald-500 text-xs">&#10003;</span>
                                      ) : (
                                        <span className="text-slate-300 text-xs">&#10005;</span>
                                      )
                                    ) : null}
                                    <span
                                      className={isEnabled ? 'text-slate-700' : 'text-slate-400'}
                                    >
                                      {item.name}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Limits */}
                        {limits.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                              {t('subscription.items.limits')}
                            </div>
                            <div className="space-y-1">
                              {limits.map(item => {
                                const value = getValueForPlan(planVersion, item, selectedInterval);
                                return (
                                  <div
                                    key={item._id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-slate-600">{item.name}</span>
                                    <span className="font-medium text-slate-700">
                                      {typeof value === 'number' ? fmtNum(value) : '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Seats */}
                        {sp?.enabled && !isPersonalMode && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1.5">
                              {t('subscription.seats.title')}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">
                                  {t('subscription.seats.included')}
                                </span>
                                <span className="font-medium">{fmtNum(sp.includedSeats || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">
                                  {t('subscription.seats.maxSeats')}
                                </span>
                                <span className="font-medium">
                                  {(sp?.maxSeats ?? 0) > 0
                                    ? fmtNum(sp!.maxSeats!)
                                    : t('subscription.seats.unlimited')}
                                </span>
                              </div>
                              {currentMemberCount != null &&
                                currentMemberCount > 0 &&
                                (() => {
                                  const billable = Math.max(
                                    0,
                                    currentMemberCount - (sp.includedSeats || 0)
                                  );
                                  return (
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">
                                        {t('subscription.seats.billable')}
                                      </span>
                                      <span
                                        className={`font-medium ${billable === 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                                      >
                                        {billable === 0
                                          ? t('subscription.seats.allIncluded')
                                          : `${fmtNum(billable)} ${t('subscription.seats.extra')}`}
                                      </span>
                                    </div>
                                  );
                                })()}
                            </div>
                          </div>
                        )}

                        {/* Credits */}
                        {planVersion.creditGrant?.enabled &&
                          typeof planVersion.creditGrant.creditPackage === 'object' &&
                          planVersion.creditGrant.creditPackage !== null && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1.5">
                                {t('subscription.items.credits')}
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">
                                    {planVersion.creditGrant.renewOnPeriod
                                      ? t('subscription.items.creditsPerMonth')
                                      : t('subscription.items.creditsOneTime')}
                                  </span>
                                  <span className="font-semibold text-purple-700">
                                    {fmtNum(planVersion.creditGrant.creditPackage.creditAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">
                                    {t('subscription.items.creditRenewal')}
                                  </span>
                                  <span className="font-medium text-slate-700">
                                    {!planVersion.creditGrant.renewOnPeriod
                                      ? t('subscription.items.creditModeLifetime')
                                      : planVersion.creditGrant.mode === 'reset'
                                        ? t('subscription.items.creditModeReset')
                                        : t('subscription.items.creditModeTopup')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Action button */}
                        <Button
                          className="w-full mt-2"
                          variant={buttonState.variant}
                          disabled={buttonState.disabled || isLoading || !hasVariant}
                          progress={isPlanLoading}
                          onClick={() => handleSelectPlan(planVersion._id)}
                        >
                          {isPlanLoading
                            ? t('pricing.processing')
                            : !hasVariant
                              ? t('pricing.unavailable')
                              : (buttonState.dynamicLabel ??
                                t(buttonState.labelKey as TranslationKey))}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── Desktop Layout: Comparison table ─── */}
              <div
                className="hidden md:block overflow-auto h-full"
                style={{ maxHeight: 'calc(100vh - 12rem)' }}
              >
                <table
                  className="w-full border-separate border-spacing-0"
                  style={{
                    minWidth: `${260 + sortedPlans.length * 220}px`,
                    borderCollapse: 'separate',
                  }}
                >
                  <colgroup>
                    <col style={{ width: 260, minWidth: 260 }} />
                    {sortedPlans.map(planVersion => (
                      <col key={planVersion._id} style={{ width: 220, minWidth: 220 }} />
                    ))}
                  </colgroup>
                  <thead>
                    {/* Sticky header row - plan cards */}
                    <tr className="align-top">
                      <th className="sticky top-0 start-0 z-30 p-0 bg-white   text-start"></th>
                      {sortedPlans.map(planVersion => {
                        const isCurrent = planVersion._id === currentPlanVersionId;
                        const buttonState = getPlanButtonState(planVersion);
                        const isPlanLoading = isLoading && planVersion._id === processingPlanId;
                        const price = getPriceForInterval(planVersion);
                        const monthlyPrice =
                          getBasePriceCents(
                            planVersion,
                            effectiveCurrency,
                            BillingIntervals.Monthly
                          ) ?? 0;
                        const savings =
                          selectedInterval !== BillingIntervals.Monthly && price !== null
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
                            <div className="flex h-full flex-col gap-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h3 className="text-base font-bold text-slate-900 truncate">
                                    {planVersion.plan.name}
                                  </h3>
                                  {planVersion.trial?.enabled &&
                                    planVersion.trial.durationDays > 0 &&
                                    !isCurrent &&
                                    !trialUsedAt &&
                                    !currentStripePriceId && (
                                      <span className="shrink-0 rounded-md bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                        {t('subscription.trialBadge', {
                                          days: planVersion.trial.durationDays,
                                        })}
                                      </span>
                                    )}
                                </div>
                                {isCurrent && (
                                  <span className="shrink-0 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                                    {t('pricing.current')}
                                  </span>
                                )}
                              </div>

                              {/* Pricing Display */}
                              <div className="flex flex-col items-start min-h-[3rem]">
                                <div className="flex items-baseline gap-1 flex-wrap">
                                  <span className="text-2xl font-bold text-slate-900">
                                    {hasVariant && price !== null
                                      ? formatPrice(price, displayCurrency) || t('pricing.free')
                                      : !hasVariant
                                        ? '—'
                                        : formatPrice(price, displayCurrency) || t('pricing.free')}
                                  </span>
                                  {price !== null && price > 0 && hasVariant && (
                                    <span className="text-sm text-slate-500">
                                      {getIntervalLabel(selectedInterval)}
                                    </span>
                                  )}
                                  {savings !== null && savings > 0 && hasVariant && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold whitespace-nowrap">
                                      {t('subscription.savingsPercent', { percent: savings })}
                                    </span>
                                  )}
                                </div>
                                {/* Seat pricing info */}
                                {(() => {
                                  if (isPersonalMode) return null;
                                  const seatConfig = getSeatPricing(planVersion, effectiveCurrency);
                                  if (!seatConfig) return null;
                                  const perSeat = getPerSeatPriceCents(
                                    planVersion,
                                    effectiveCurrency,
                                    selectedInterval
                                  );
                                  if (!perSeat || perSeat <= 0) return null;
                                  return (
                                    <div className="text-[11px] text-slate-500 mt-1.5 border-t border-slate-100 pt-1 leading-tight">
                                      <div>
                                        {t('subscription.seatPriceDisplay', {
                                          price: fmtCents(perSeat, displayCurrency),
                                          interval: getIntervalLabel(selectedInterval),
                                          included: fmtNum(seatConfig.includedSeats),
                                          includedLabel: t('pricing.included'),
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {planVersion.plan.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed text-start">
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
                                  ? t('pricing.processing')
                                  : !hasVariant
                                    ? t('pricing.unavailable')
                                    : (buttonState.dynamicLabel ??
                                      t(buttonState.labelKey as TranslationKey))}
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
                          <td className="sticky start-0 z-10 border-t border-slate-200 bg-slate-100 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {t('subscription.items.features')}
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-slate-200 bg-slate-100"
                          />
                        </tr>
                        {features.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
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
                              const isEnabled =
                                item.type === SubscriptionItemType.Feature && value === true;
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
                          <td className="sticky start-0 z-10 border-t border-slate-200 bg-slate-100 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {t('subscription.items.limits')}
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-slate-200 bg-slate-100"
                          />
                        </tr>
                        {limits.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
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
                          <td className="sticky start-0 z-10 border-t border-slate-200 bg-slate-100 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {t('subscription.items.quotas')}
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-slate-200 bg-slate-100"
                          />
                        </tr>
                        {quotas.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
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
                    {!isPersonalMode &&
                      sortedPlans.some(pv => {
                        const sp = getSeatPricing(pv, effectiveCurrency);
                        return sp?.enabled;
                      }) && (
                        <>
                          <tr>
                            <td className="sticky start-0 z-10 border-t border-emerald-200 bg-emerald-50 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-emerald-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              {t('subscription.seats.title')}
                            </td>
                            <td
                              colSpan={sortedPlans.length}
                              className="border-t border-emerald-200 bg-emerald-50"
                            />
                          </tr>
                          {/* Included seats row */}
                          <tr className="group hover:bg-slate-50/50">
                            <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">
                                {t('subscription.seats.includedSeats')}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {t('subscription.seats.freeWithBase')}
                              </div>
                            </td>
                            {sortedPlans.map(planVersion => {
                              const sp = getSeatPricing(planVersion, effectiveCurrency);
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}
                                >
                                  <span className="text-sm font-medium text-slate-700">
                                    {sp?.enabled ? fmtNum(sp.includedSeats || 0) : '—'}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                          {/* Max seats row */}
                          <tr className="group hover:bg-slate-50/50">
                            <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">
                                {t('subscription.seats.maxSeats')}
                              </div>
                            </td>
                            {sortedPlans.map(planVersion => {
                              const sp = getSeatPricing(planVersion, effectiveCurrency);
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}
                                >
                                  <span className="text-sm font-medium text-slate-700">
                                    {sp?.enabled
                                      ? (sp?.maxSeats ?? 0) > 0
                                        ? fmtNum(sp!.maxSeats!)
                                        : t('subscription.seats.unlimited')
                                      : '—'}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                          {/* Per seat price row */}
                          <tr className="group hover:bg-slate-50/50">
                            <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">
                                {t('subscription.seats.perExtraSeat')}
                              </div>
                            </td>
                            {sortedPlans.map(planVersion => {
                              const perSeat = getPerSeatPriceCents(
                                planVersion,
                                effectiveCurrency,
                                selectedInterval
                              );
                              const displayCurrency = planVersion.pricingVariants?.length
                                ? effectiveCurrency
                                : (planVersion.plan?.currency ?? effectiveCurrency ?? '');
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}
                                >
                                  <span className="text-sm font-medium text-slate-700">
                                    {perSeat && perSeat > 0
                                      ? `${fmtCents(perSeat, displayCurrency)}${getIntervalLabel(selectedInterval)}`
                                      : '—'}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                          {/* Billable seats row — only show when we know the member count */}
                          {currentMemberCount != null && currentMemberCount > 0 && (
                            <tr className="group hover:bg-slate-50/50">
                              <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                                <div className="font-medium text-sm text-slate-900">
                                  {t('subscription.seats.billable')}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {t('subscription.membersInWorkspace', {
                                    count: currentMemberCount,
                                  })}
                                </div>
                              </td>
                              {sortedPlans.map(planVersion => {
                                const sp = getSeatPricing(planVersion, effectiveCurrency);
                                if (!sp?.enabled) {
                                  return (
                                    <td
                                      key={planVersion._id}
                                      className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}
                                    >
                                      <span className="text-sm text-slate-400">—</span>
                                    </td>
                                  );
                                }
                                const included = sp.includedSeats || 0;
                                const billable = Math.max(0, currentMemberCount - included);
                                return (
                                  <td
                                    key={planVersion._id}
                                    className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}
                                  >
                                    {billable === 0 ? (
                                      <span className="text-sm font-medium text-emerald-600">
                                        {t('subscription.seats.allIncluded')}
                                      </span>
                                    ) : (
                                      <span className="text-sm font-medium text-amber-600">
                                        {fmtNum(billable)} {t('subscription.seats.extra')}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </>
                      )}

                    {/* Credits Section */}
                    {sortedPlans.some(
                      pv =>
                        pv.creditGrant?.enabled &&
                        typeof pv.creditGrant.creditPackage === 'object' &&
                        pv.creditGrant.creditPackage !== null
                    ) && (
                      <>
                        <tr>
                          <td className="sticky start-0 z-10 border-t border-purple-200 bg-purple-50 px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-purple-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {t('subscription.items.credits')}
                          </td>
                          <td
                            colSpan={sortedPlans.length}
                            className="border-t border-purple-200 bg-purple-50"
                          />
                        </tr>
                        {/* Credits per month row */}
                        <tr className="group hover:bg-slate-50/50">
                          <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                            <div className="font-medium text-sm text-slate-900">
                              {sortedPlans.every(
                                v => !v.creditGrant?.enabled || !v.creditGrant.renewOnPeriod
                              )
                                ? t('subscription.items.creditsOneTime')
                                : t('subscription.items.creditsPerMonth')}
                            </div>
                          </td>
                          {sortedPlans.map(planVersion => {
                            const cg = planVersion.creditGrant;
                            const pkg =
                              cg?.enabled &&
                              typeof cg.creditPackage === 'object' &&
                              cg.creditPackage !== null
                                ? cg.creditPackage
                                : null;
                            return (
                              <td
                                key={planVersion._id}
                                className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}
                              >
                                {pkg ? (
                                  <span className="text-sm font-semibold text-purple-700">
                                    {fmtNum(pkg.creditAmount)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Credit renewal row */}
                        <tr className="group hover:bg-slate-50/50">
                          <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                            <div className="font-medium text-sm text-slate-900">
                              {t('subscription.items.creditRenewal')}
                            </div>
                          </td>
                          {sortedPlans.map(planVersion => {
                            const cg = planVersion.creditGrant;
                            return (
                              <td
                                key={planVersion._id}
                                className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId ? 'bg-blue-50/50' : 'bg-white'}`}
                              >
                                {cg?.enabled ? (
                                  <span className="text-sm font-medium text-slate-700">
                                    {!cg.renewOnPeriod
                                      ? t('subscription.items.creditModeLifetime')
                                      : cg.mode === 'reset'
                                        ? t('subscription.items.creditModeReset')
                                        : t('subscription.items.creditModeTopup')}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">—</span>
                                )}
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
