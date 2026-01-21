import { CreditCard, RefreshCcwIcon } from 'lucide-react';
import React, { useState } from 'react';
import { ICheckoutSessionResponse, IPlanVersion, ISubscriptionItem } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import {
  useCreateCheckoutSession,
  useSubscriptionManagement,
} from '../subscription-hooks';
import { IWorkspace } from '../types';
import SettingSkeleton from './Skeleton';
import SubscriptionDialog from './SubscriptionDialog';

// Helper function to get plan details from subscriptionItems
const getPlanDetailsFromItems = (planVersion: IPlanVersion | null | undefined) => {
  if (!planVersion?.subscriptionItems) {
    return { features: [], limits: [], quotas: [] };
  }

  const features: Array<{ item: ISubscriptionItem; enabled: boolean }> = [];
  const limits: Array<{ item: ISubscriptionItem; value: number }> = [];
  const quotas: Array<{
    item: ISubscriptionItem;
    value: number | { included: number; overage: number };
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
      const value = planVersion.quotas?.[slug] ?? 0;
      quotas.push({ item, value });
    }
  });

  return { features, limits, quotas };
};

const WorkspaceSettingsSubscription: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const workspaceId = workspace._id?.toString();
  const { subscription, planGroup, loading, error, updateSubscription, refetch } =
    useSubscriptionManagement(workspaceId);
  const { createCheckoutSession } = useCreateCheckoutSession(workspaceId);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePlanChange = async (planVersionId: string) => {
    if (!workspaceId) return;

    // Don't update if it's the same plan
    if (subscription?.planVersion?._id === planVersionId) {
      return;
    }

    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      // Generate success and cancel URLs based on current location
      // Ensure URLs have proper scheme (https:// or http://)
      let successUrl: string;
      let cancelUrl: string;
      
      try {
        const currentUrl = new URL(window.location.href);
        successUrl = currentUrl.toString();
        cancelUrl = currentUrl.toString();
      } catch {
        // Fallback if URL construction fails
        const protocol = window.location.protocol || 'https:';
        const host = window.location.host || window.location.hostname || '';
        const pathname = window.location.pathname || '/';
        const baseUrl = `${protocol}//${host}${pathname}`;
        successUrl = baseUrl;
        cancelUrl = baseUrl;
      }

      let result: ICheckoutSessionResponse | any;

      // If no active subscription, create checkout session
      if (!subscription?.subscription) {
        result = await createCheckoutSession({
          planVersionId,
          billingInterval: 'monthly', // Default to monthly, can be made configurable
          successUrl,
          cancelUrl,
        });
      } else {
        // If subscription exists, update it (may return checkout session)
        result = await updateSubscription(planVersionId, {
          billingInterval: 'monthly', // Default to monthly, can be made configurable
          successUrl,
          cancelUrl,
        });
      }

      // Check if result is a checkout session response
      if (result && 'checkoutUrl' in result && result.checkoutUrl) {
        // Redirect to checkout URL
        window.location.href = result.checkoutUrl;
        return;
      }

      // If no checkout URL, subscription was updated directly
      setUpdateSuccess('Subscription updated successfully!');
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process subscription';
      setUpdateError(errorMessage);
    } finally {
      setUpdating(false);
      setTimeout(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      }, 5000);
    }
  };

  if (loading && !subscription && !planGroup) {
    return <SettingSkeleton />;
  }

  const currentPlanVersionId = subscription?.planVersion?._id;

  // Show error if workspaceId is missing
  if (!workspaceId) {
    return (
      <div className="border rounded-lg p-4 text-center text-gray-500">
        <p>Invalid workspace ID</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error loading subscription data</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2 text-red-600">
            Please check your connection and try refreshing the page.
          </p>
        </div>
      )}

      {updateError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Update failed</p>
          <p className="text-sm">{updateError}</p>
        </div>
      )}

      {updateSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">Success!</p>
          <p className="text-sm">{updateSuccess}</p>
        </div>
      )}

      {/* Current Subscription Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Subscription</h3>
            <p className="text-sm text-gray-600">Manage your workspace subscription plan</p>
          </div>
          <div className="flex items-center gap-2">
            {subscription?.subscription ? (
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                Change Plan
              </Button>
            ) : planGroup?.plans && planGroup.plans.length > 0 ? (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                View Pricing Plans
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCcwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {subscription?.subscription ? (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{subscription.plan?.name || 'No plan assigned'}</div>
                <div className="text-sm text-gray-600">
                  Status:{' '}
                  <span
                    className={`font-medium ${
                      subscription.subscription.subscriptionStatus === 'active'
                        ? 'text-green-600'
                        : subscription.subscription.subscriptionStatus === 'trialing'
                          ? 'text-blue-600'
                          : 'text-red-600'
                    }`}
                  >
                    {subscription.subscription.subscriptionStatus}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {subscription.planVersion &&
              (() => {
                const planDetails = getPlanDetailsFromItems(subscription.planVersion);
                return (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-3">Current Plan Details</div>
                    <div className="space-y-4 text-sm">
                      <div>
                        <span className="text-gray-600">Plan:</span>{' '}
                        <span className="font-medium">{subscription.plan?.name || 'N/A'}</span>
                      </div>

                      {planDetails.features.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-2">Features:</div>
                          <ul className="space-y-1.5">
                            {planDetails.features.map(({ item, enabled }) => (
                              <li key={item._id} className="flex items-start gap-2">
                                <span
                                  className={
                                    enabled ? 'text-green-500 mt-0.5' : 'text-gray-300 mt-0.5'
                                  }
                                >
                                  {enabled ? '✓' : '○'}
                                </span>
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500">{item.description}</div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {planDetails.limits.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-2">Limits:</div>
                          <ul className="space-y-1.5">
                            {planDetails.limits.map(({ item, value }) => (
                              <li key={item._id} className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <div className="flex-1">
                                  <div>
                                    <span className="font-medium">{item.name}:</span>{' '}
                                    <span className="text-gray-700">{value}</span>
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500">{item.description}</div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {planDetails.quotas.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-2">Quotas:</div>
                          <ul className="space-y-1.5">
                            {planDetails.quotas.map(({ item, value }) => {
                              const quotaDisplay =
                                typeof value === 'object' && value !== null && 'included' in value
                                  ? `${value.included} included${value.overage ? `, ${value.overage} overage` : ''}`
                                  : String(value);
                              return (
                                <li key={item._id} className="flex items-start gap-2">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <div className="flex-1">
                                    <div>
                                      <span className="font-medium">{item.name}:</span>{' '}
                                      <span className="text-gray-700">{quotaDisplay}</span>
                                    </div>
                                    {item.description && (
                                      <div className="text-xs text-gray-500">
                                        {item.description}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>
        ) : (
          <div className="border rounded-lg p-6 text-center">
            <div className="mb-4">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-lg font-medium text-gray-700">
                You don't have an active subscription
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Choose a plan to get started with your workspace
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Dialog */}
      {planGroup?.plans && planGroup.plans.length > 0 && (
        <SubscriptionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          planVersions={planGroup.plans}
          currentPlanVersionId={currentPlanVersionId || null}
          onSelectPlan={handlePlanChange}
          loading={updating || loading}
        />
      )}

      {!planGroup && !loading && (
        <div className="border rounded-lg p-4 text-center">
          <div className="text-gray-500 mb-2">
            <p className="font-medium">Unable to load plan information</p>
            {error && <p className="text-sm mt-2 text-red-600">Error: {error}</p>}
            {!error && (
              <p className="text-sm mt-2">
                No plan groups are available for this workspace. Please contact support if you
                believe this is an error.
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="mt-4">
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsSubscription;
