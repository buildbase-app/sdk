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
      <DialogContent className="max-w-7xl w-full h-[100vh] p-0 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <DialogTitle className="text-2xl font-bold">Choose Your Plan</DialogTitle>
            <DialogDescription className="mt-1">
              Compare plans and select the one that fits your needs
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {sortedPlans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No plans available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan Cards Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedPlans.map(planVersion => {
                  const isCurrent = planVersion._id === currentPlanVersionId;
                  const buttonState = getPlanButtonState(planVersion);
                  const isPlanLoading = isLoading && planVersion._id === processingPlanId;

                  return (
                    <div
                      key={planVersion._id}
                      className={`border rounded-lg p-4 ${
                        isCurrent ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{planVersion.plan.name}</h3>
                        {isCurrent && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      {planVersion.plan.description && (
                        <p className="text-sm text-gray-600 mb-4">{planVersion.plan.description}</p>
                      )}
                      <Button
                        className="w-full"
                        variant={buttonState.variant}
                        disabled={buttonState.disabled || isLoading}
                        progress={isPlanLoading}
                        onClick={() => handleSelectPlan(planVersion._id)}
                      >
                        {isPlanLoading ? 'Processing...' : buttonState.label}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Comparison Table */}
              <div className="border rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 p-4 border-b">
                  <h3 className="font-semibold text-lg">Compare all features</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-semibold text-sm sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                          Feature
                        </th>
                        {sortedPlans.map(planVersion => (
                          <th
                            key={planVersion._id}
                            className={`text-center p-4 font-semibold text-sm min-w-[150px] ${
                              planVersion._id === currentPlanVersionId
                                ? 'bg-blue-50 border-l-2 border-r-2 border-blue-500'
                                : ''
                            }`}
                          >
                            <div className="font-semibold">{planVersion.plan.name}</div>
                            {planVersion._id === currentPlanVersionId && (
                              <div className="text-xs text-blue-600 font-normal mt-1">
                                Current Plan
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Features Section */}
                      {features.length > 0 && (
                        <>
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <td
                              colSpan={sortedPlans.length + 1}
                              className="p-3 font-bold text-sm uppercase tracking-wide text-gray-700"
                            >
                              Features
                            </td>
                          </tr>
                          {features.map(item => (
                            <tr key={item._id} className="border-b hover:bg-gray-50">
                              <td className="p-4 sticky left-0 bg-white z-10">
                                <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-1">
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
                                    className={`text-center p-4 align-middle ${
                                      planVersion._id === currentPlanVersionId
                                        ? 'bg-blue-50 border-l-2 border-r-2 border-blue-500'
                                        : ''
                                    }`}
                                  >
                                    <span
                                      className={`text-sm ${
                                        isEnabled
                                          ? 'text-green-600 font-semibold'
                                          : formatted === '—'
                                            ? 'text-gray-400'
                                            : 'text-gray-700'
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
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <td
                              colSpan={sortedPlans.length + 1}
                              className="p-3 font-bold text-sm uppercase tracking-wide text-gray-700"
                            >
                              Limits
                            </td>
                          </tr>
                          {limits.map(item => (
                            <tr key={item._id} className="border-b hover:bg-gray-50">
                              <td className="p-4 sticky left-0 bg-white z-10">
                                <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-1">
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
                                    className={`text-center p-4 align-middle ${
                                      planVersion._id === currentPlanVersionId
                                        ? 'bg-blue-50 border-l-2 border-r-2 border-blue-500'
                                        : ''
                                    }`}
                                  >
                                    <span
                                      className={`text-sm ${
                                        formatted === '—'
                                          ? 'text-gray-400'
                                          : 'text-gray-700 font-medium'
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
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <td
                              colSpan={sortedPlans.length + 1}
                              className="p-3 font-bold text-sm uppercase tracking-wide text-gray-700"
                            >
                              Quotas
                            </td>
                          </tr>
                          {quotas.map(item => (
                            <tr key={item._id} className="border-b hover:bg-gray-50">
                              <td className="p-4 sticky left-0 bg-white z-10">
                                <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-1">
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
                                    className={`text-center p-4 align-middle ${
                                      planVersion._id === currentPlanVersionId
                                        ? 'bg-blue-50 border-l-2 border-r-2 border-blue-500'
                                        : ''
                                    }`}
                                  >
                                    <span
                                      className={`text-sm ${
                                        formatted === '—'
                                          ? 'text-gray-400'
                                          : 'text-gray-700 font-medium'
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;
