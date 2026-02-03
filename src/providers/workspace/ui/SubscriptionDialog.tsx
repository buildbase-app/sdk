import React, { useEffect, useMemo, useState } from 'react';
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
  onSelectPlan: (planVersionId: string, billingInterval: BillingInterval) => Promise<void>;
  loading?: boolean;
}

// Helper to determine billing interval from price ID by comparing with plan's stripe prices
const getBillingIntervalFromPriceId = (
  priceId: string | null | undefined,
  planVersions: IPlanVersionWithPlan[]
): BillingInterval | null => {
  if (!priceId) return null;

  for (const plan of planVersions) {
    const stripePrices = plan.stripePrices;
    if (!stripePrices) continue;

    if (stripePrices.monthlyPriceId === priceId || stripePrices.monthly === priceId) {
      return 'monthly';
    }
    if (stripePrices.yearlyPriceId === priceId || stripePrices.yearly === priceId) {
      return 'yearly';
    }
    if (stripePrices.quarterlyPriceId === priceId) {
      return 'quarterly';
    }
  }

  return null;
};

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

// Format price for display (converts cents to dollars)
const formatPrice = (priceInCents: number | undefined | null): string => {
  if (priceInCents === undefined || priceInCents === null) return 'Free';
  if (priceInCents === 0) return 'Free';
  const priceInDollars = priceInCents / 100;
  return `$${priceInDollars.toFixed(2)}`;
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
  onSelectPlan,
  loading: isUpdating = false,
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // Derive current billing interval from price ID comparison
  const currentBillingInterval = useMemo(() => {
    return getBillingIntervalFromPriceId(currentStripePriceId, propPlanVersions);
  }, [currentStripePriceId, propPlanVersions]);

  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(
    currentBillingInterval || 'monthly'
  );

  // Sync selected interval when dialog opens or current billing changes
  useEffect(() => {
    if (open) {
      setSelectedInterval(currentBillingInterval || 'monthly');
    }
  }, [open, currentBillingInterval]);

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
      await onSelectPlan(planVersionId, selectedInterval);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLocalLoading(false);
      setProcessingPlanId(null);
    }
  };

  // Get price for a plan based on selected interval
  const getPriceForInterval = (planVersion: IPlanVersionWithPlan): number | null => {
    const pricing = planVersion.basePricing;
    if (!pricing) return null;
    return pricing[selectedInterval] ?? null;
  };

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
    item: ISubscriptionItem
  ): boolean | number | { included: number; overage?: number; stripePriceId?: string } | null => {
    if (item.type === 'feature') {
      return planVersion.features?.[item.slug] ?? false;
    } else if (item.type === 'limit') {
      return planVersion.limits?.[item.slug] ?? null;
    } else if (item.type === 'quota') {
      return planVersion.quotas?.[item.slug] ?? null;
    }
    return null;
  };

  const formatValue = (
    value: boolean | number | { included: number; overage?: number } | null,
    item: ISubscriptionItem
  ): string => {
    if (item.type === 'feature') {
      return value === true ? '✓' : '—';
    } else if (item.type === 'limit') {
      return value !== null && value !== undefined ? String(value) : '—';
    } else if (item.type === 'quota') {
      if (typeof value === 'object' && value !== null && 'included' in value) {
        return `${value.included}${value.overage ? ` (+${value.overage})` : ''}`;
      }
      return value !== null && value !== undefined ? String(value) : '—';
    }
    return '—';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="inset-0 w-screen h-screen max-w-none rounded-none translate-x-0 translate-y-0 p-0 flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
          <div>
            <DialogTitle className="text-2xl font-bold">Choose Your Plan</DialogTitle>
            <DialogDescription className="mt-1">
              Compare plans and select the one that fits your needs
            </DialogDescription>
          </div>
          {/* Billing Interval Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
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

        <div className="flex-1 min-h-0 flex flex-col">
          {sortedPlans.length === 0 ? (
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
                        const monthlyPrice = planVersion.basePricing?.monthly ?? 0;
                        const savings =
                          selectedInterval !== 'monthly' && price !== null
                            ? calculateSavings(monthlyPrice, price, selectedInterval)
                            : null;

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
                                    {formatPrice(price)}
                                  </span>
                                  {price !== null && price > 0 && (
                                    <span className="text-sm text-slate-500">
                                      {getIntervalLabel(selectedInterval)}
                                    </span>
                                  )}
                                </div>
                                {savings !== null && savings > 0 && (
                                  <span className="text-xs text-emerald-600 font-medium mt-0.5">
                                    Save {savings}% vs monthly
                                  </span>
                                )}
                              </div>

                              {planVersion.plan.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed text-left">
                                  {planVersion.plan.description}
                                </p>
                              )}
                              <Button
                                className="mt-auto w-full"
                                variant={buttonState.variant}
                                disabled={buttonState.disabled || isLoading}
                                progress={isPlanLoading}
                                onClick={() => handleSelectPlan(planVersion._id)}
                              >
                                {isPlanLoading ? 'Processing...' : buttonState.label}
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
                              const value = getValueForPlan(planVersion, item);
                              const formatted = formatValue(value, item);
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
                              const value = getValueForPlan(planVersion, item);
                              const formatted = formatValue(value, item);
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
                              const value = getValueForPlan(planVersion, item);
                              const formatted = formatValue(value, item);
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
