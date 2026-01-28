import { CreditCard, RefreshCcwIcon, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { 
  ICheckoutSessionResponse, 
  IInvoice,
  IPlanGroupVersionWithPlans,
  IPlanVersion, 
  IPlanVersionWithPlan, 
  ISubscriptionItem 
} from '../../../api/types';
import { Button } from '../../../components/ui/button';
import {
  useCreateCheckoutSession,
  useInvoices,
  usePlanGroupVersions,
  useSubscriptionManagement,
} from '../subscription-hooks';
import { IWorkspace } from '../types';
import SettingSkeleton from './Skeleton';
// Lazy load SubscriptionDialog to reduce bundle size
// This component is only rendered when subscription dialog is opened
import { lazy, Suspense } from 'react';
const SubscriptionDialog = lazy(() => import('./SubscriptionDialog').then(m => ({ default: m.default })));

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

// Helper function to format currency amount
const formatCurrency = (amount: number, currency: string = 'usd'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100); // Convert cents to dollars
};

// Helper function to format date
const formatDate = (timestamp: number | null): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper function to get invoice action button text and status color
const getInvoiceAction = (invoice: IInvoice) => {
  switch (invoice.status) {
    case 'draft':
    case 'open':
      return { text: 'Pay', color: 'bg-blue-600 hover:bg-blue-700' };
    case 'paid':
      return { text: 'View', color: 'bg-green-600 hover:bg-green-700' };
    case 'uncollectible':
    case 'void':
      return { text: 'View Details', color: 'bg-gray-600 hover:bg-gray-700' };
    default:
      return { text: 'View', color: 'bg-gray-600 hover:bg-gray-700' };
  }
};

// Helper function to get status badge color
const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'open':
      return 'bg-yellow-100 text-yellow-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'uncollectible':
      return 'bg-red-100 text-red-800';
    case 'void':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const WorkspaceSettingsSubscription: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const workspaceId = workspace._id?.toString();
  const { subscription, loading: subscriptionLoading, error: subscriptionError, updateSubscription, refetch: refetchSubscription } =
    useSubscriptionManagement(workspaceId);
  const { createCheckoutSession } = useCreateCheckoutSession(workspaceId);
  
  // Fetch plan group versions (includes currentVersion and availableVersions)
  const { versions: planGroupVersions, loading: versionsLoading, error: versionsError, refetch: refetchVersions } = 
    usePlanGroupVersions(workspaceId);
  
  // Fetch invoices (only if user has an active subscription)
  const { invoices, loading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = 
    useInvoices(workspaceId, 20);
  
  const loading = subscriptionLoading || versionsLoading;
  const error = subscriptionError || versionsError;
  
  // Determine if there's a newer version and which version to show
  // API behavior:
  // - With subscription: currentVersion = user's current, availableVersions = newer versions
  // - Without subscription: currentVersion = latest published, availableVersions = []
  const { currentVersion, latestVersion, hasNewerVersion, isDeprecated, whatsNew, plansToShow } = useMemo(() => {
    const userCurrentVersion = planGroupVersions?.currentVersion;
    const availableVersions = planGroupVersions?.availableVersions || [];
    const hasActiveSubscription = subscription?.subscription !== null;
    
    // Find the latest available version
    // If user has subscription: latest is the highest in availableVersions (newer versions)
    // If no subscription: currentVersion IS the latest (it's the latest published)
    let latest: IPlanGroupVersionWithPlans | null = null;
    
    if (availableVersions.length > 0) {
      // User has subscription - find latest from availableVersions (newer versions)
      latest = availableVersions.reduce((latest, current) => 
        current.version > latest.version ? current : latest
      );
    } else if (userCurrentVersion) {
      // No subscription - currentVersion is the latest published version
      latest = userCurrentVersion;
    }
    
    // Check if user's current version is older than the latest
    // Only relevant if user has an active subscription
    const hasNewer = hasActiveSubscription && latest && userCurrentVersion
      ? latest.version > userCurrentVersion.version
      : false;
    
    // Determine which plans to show: always show latest version plans
    const plans = latest?.plans && latest.plans.length > 0 
      ? latest.plans 
      : [];
    
    return {
      currentVersion: userCurrentVersion,
      latestVersion: latest,
      hasNewerVersion: hasNewer,
      // Only show deprecation if user has subscription AND there's a newer version
      isDeprecated: hasNewer && hasActiveSubscription,
      whatsNew: latest?.whatsNew,
      plansToShow: plans,
    };
  }, [planGroupVersions, subscription?.subscription]);
  
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const refetch = async () => {
    await Promise.all([refetchSubscription(), refetchVersions()]);
  };

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

  if (loading && !subscription && !planGroupVersions) {
    return <SettingSkeleton />;
  }

  const currentPlanVersionId = subscription?.planVersion?._id || null;

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

      {/* Deprecation Notice - Show if user's plan is on an older version */}
      {isDeprecated && subscription?.subscription && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">
                Your Current Plan is Deprecated
              </h3>
              <p className="text-sm text-amber-700 mb-2">
                A new version of the pricing plans is now available. Please upgrade to one of the new plans below to continue receiving updates and support.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-600 mb-3">
                <span>Current: Version {currentVersion?.version || 'N/A'}</span>
                <span>•</span>
                <span>Latest: Version {latestVersion?.version || 'N/A'}</span>
              </div>
              
              {/* Show What's New */}
              {whatsNew && (whatsNew.newPlans.length > 0 || whatsNew.updatedPlans.length > 0) && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <h4 className="text-xs font-semibold text-amber-800 mb-2">What's New in Version {latestVersion?.version}:</h4>
                  <div className="space-y-1.5 text-xs text-amber-700">
                    {whatsNew.newPlans.length > 0 && (
                      <div>
                        <span className="font-medium">New Plans: </span>
                        <span>{whatsNew.newPlans.map((p: IPlanVersionWithPlan) => p.plan.name).join(', ')}</span>
                      </div>
                    )}
                    {whatsNew.updatedPlans.length > 0 && (
                      <div>
                        <span className="font-medium">Updated Plans: </span>
                        <span>{whatsNew.updatedPlans.map((p: IPlanVersionWithPlan) => p.plan.name).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
            ) : plansToShow && plansToShow.length > 0 ? (
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
          <div className={`border rounded-lg p-4 space-y-3 ${isDeprecated ? 'border-amber-300 bg-amber-50/50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium">{subscription.plan?.name || 'No plan assigned'}</div>
                  {isDeprecated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle className="h-3 w-3" />
                      Deprecated
                    </span>
                  )}
                </div>
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
                  {isDeprecated && (
                    <span className="ml-2 text-xs text-amber-600">
                      (Version {currentVersion?.version || 'N/A'})
                    </span>
                  )}
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

      {/* Invoices Section - Only show if user has an active subscription */}
      {subscription?.subscription && (() => {
        // Filter invoices to only show those with download option (invoice_pdf)
        const invoicesWithDownload = invoices.filter(invoice => invoice.invoice_pdf);
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Invoices</h3>
                <p className="text-sm text-gray-600">View and download your subscription invoices</p>
              </div>
              <Button variant="ghost" size="sm" onClick={refetchInvoices} disabled={invoicesLoading}>
                <RefreshCcwIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {invoicesError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">Error loading invoices</p>
                <p className="text-sm">{invoicesError}</p>
              </div>
            )}

            {invoicesLoading && invoicesWithDownload.length === 0 ? (
              <div className="border rounded-lg p-6">
                <SettingSkeleton />
              </div>
            ) : invoicesWithDownload.length === 0 ? (
              <div className="border rounded-lg p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-500">No invoices with download option found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoicesWithDownload.map((invoice) => {
                  const action = getInvoiceAction(invoice);
                  return (
                    <div
                      key={invoice.id}
                      className="border rounded-lg bg-white hover:shadow-sm transition-shadow p-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: Invoice Info */}
                        <div className="flex-1 min-w-0">
                          {/* Invoice Name with Status */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-medium text-gray-900">
                              {invoice.description || `Invoice ${invoice.id.slice(-8)}`}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                                invoice.status
                              )}`}
                            >
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </div>
                          
                          {/* Amount, Created Date, and Due Date */}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(invoice.amount_due, invoice.currency)}
                            </span>
                            {invoice.created && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>Created: {formatDate(invoice.created)}</span>
                              </>
                            )}
                            {invoice.due_date && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>Due: {formatDate(invoice.due_date)}</span>
                              </>
                            )}
                            {invoice.amount_paid > 0 && invoice.amount_due > 0 && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500">
                                  Paid: {formatCurrency(invoice.amount_paid, invoice.currency)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                            className={action.color}
                          >
                            {action.text}
                            <ExternalLink className="h-3 w-3 ml-1.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Subscription Dialog */}
      {plansToShow && plansToShow.length > 0 && (
        <Suspense fallback={null}>
          <SubscriptionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            planVersions={plansToShow}
            currentPlanVersionId={currentPlanVersionId || null}
            onSelectPlan={handlePlanChange}
            loading={updating || loading}
          />
        </Suspense>
      )}

      {!planGroupVersions && !loading && (
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
