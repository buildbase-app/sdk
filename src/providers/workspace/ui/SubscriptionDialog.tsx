import React, { useMemo, useState } from 'react';
import { IPlanVersion, IPlanVersionWithPlan, ISubscriptionItem } from '../../../api/types';
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
  onSelectPlan: (planVersionId: string) => Promise<void>;
  loading?: boolean;
}

// Helper function to get plan details from subscriptionItems
const getPlanDetailsFromItems = (planVersion: IPlanVersion | null | undefined) => {
  if (!planVersion?.subscriptionItems) {
    return { features: [], limits: [], quotas: [] };
  }

  const features: Array<{ item: ISubscriptionItem; enabled: boolean }> = [];
  const limits: Array<{ item: ISubscriptionItem; value: number }> = [];
  const quotas: Array<{
    item: ISubscriptionItem;
    value: number | { included: number; overage?: number; stripePriceId?: string } | null;
  }> = [];

  planVersion.subscriptionItems.forEach(item => {
    const slug = item.slug;

    if (item.type === 'feature') {
      const enabled = planVersion.features?.[slug] ?? false;
      features.push({ item, enabled });
    } else if (item.type === 'limit') {
      const value = planVersion.limits?.[slug] ?? 0;
      limits.push({ item, value });
    } else if (item.type === 'quota') {
      const value = planVersion.quotas?.[slug] ?? null;
      if (value !== null && value !== undefined) {
        quotas.push({ item, value });
      }
    }
  });

  return { features, limits, quotas };
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

const SubscriptionDialog: React.FC<SubscriptionDialogProps> = ({
  open,
  onOpenChange,
  planVersions: propPlanVersions,
  currentPlanVersionId,
  onSelectPlan,
  loading: isUpdating = false,
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // Sort plans by version number
  const sortedPlans = useMemo(() => {
    return [...propPlanVersions].sort((a, b) => a.version - b.version);
  }, [propPlanVersions]);

  const allItems = getAllSubscriptionItems(sortedPlans);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const categories = new Map<string, ISubscriptionItem[]>();
    allItems.forEach(item => {
      const categoryId = item.category || 'other';
      if (!categories.has(categoryId)) {
        categories.set(categoryId, []);
      }
      categories.get(categoryId)!.push(item);
    });
    return categories;
  }, [allItems]);

  const features = allItems.filter(item => item.type === 'feature');
  const limits = allItems.filter(item => item.type === 'limit');
  const quotas = allItems.filter(item => item.type === 'quota');

  const handleSelectPlan = async (planVersionId: string) => {
    if (planVersionId === currentPlanVersionId || isUpdating || localLoading) return;

    setLocalLoading(true);
    setProcessingPlanId(planVersionId);
    try {
      await onSelectPlan(planVersionId);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLocalLoading(false);
      setProcessingPlanId(null);
    }
  };

  const isLoading = isUpdating || localLoading;

  const getPlanButtonState = (planVersion: IPlanVersionWithPlan) => {
    if (planVersion._id === currentPlanVersionId) {
      return { label: 'Current Plan', variant: 'outline' as const, disabled: true };
    }

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
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {sortedPlans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No plans available</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden bg-white">
              {/* Single scroll container - required for sticky to work */}
              <div
                className="overflow-auto h-full"
                style={{ maxHeight: 'calc(100vh - 12rem)' }}
              >
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
                      <th className="sticky top-0 left-0 z-30 p-0 bg-white   text-left">

                      </th>
                      {sortedPlans.map(planVersion => {
                        const isCurrent = planVersion._id === currentPlanVersionId;
                        const buttonState = getPlanButtonState(planVersion);
                        const isPlanLoading = isLoading && planVersion._id === processingPlanId;

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
                              {planVersion.plan.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
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
                          <td colSpan={sortedPlans.length} className="border-t border-slate-200 bg-slate-100" />
                        </tr>
                        {features.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                              )}
                            </td>
                            {sortedPlans.map(planVersion => {
                              const value = getValueForPlan(planVersion, item);
                              const formatted = formatValue(value, item);
                              const isEnabled = item.type === 'feature' && value === true;
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId
                                      ? 'bg-blue-50/50'
                                      : 'bg-white'
                                    }`}
                                >
                                  <span
                                    className={`text-sm font-medium ${isEnabled
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
                          <td colSpan={sortedPlans.length} className="border-t border-slate-200 bg-slate-100" />
                        </tr>
                        {limits.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                              )}
                            </td>
                            {sortedPlans.map(planVersion => {
                              const value = getValueForPlan(planVersion, item);
                              const formatted = formatValue(value, item);
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId
                                      ? 'bg-blue-50/50'
                                      : 'bg-white'
                                    }`}
                                >
                                  <span
                                    className={`text-sm font-medium ${formatted === '—' ? 'text-slate-400' : 'text-slate-700'
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
                          <td colSpan={sortedPlans.length} className="border-t border-slate-200 bg-slate-100" />
                        </tr>
                        {quotas.map(item => (
                          <tr key={item._id} className="group hover:bg-slate-50/50">
                            <td className="sticky left-0 z-10 border-t border-slate-100 bg-white p-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/80">
                              <div className="font-medium text-sm text-slate-900">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                              )}
                            </td>
                            {sortedPlans.map(planVersion => {
                              const value = getValueForPlan(planVersion, item);
                              const formatted = formatValue(value, item);
                              return (
                                <td
                                  key={planVersion._id}
                                  className={`border-t border-slate-100 p-4 text-center align-middle ${planVersion._id === currentPlanVersionId
                                      ? 'bg-blue-50/50'
                                      : 'bg-white'
                                    }`}
                                >
                                  <span
                                    className={`text-sm font-medium ${formatted === '—' ? 'text-slate-400' : 'text-slate-700'
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
