import { safeRedirect } from '../../../lib/security';
import { AlertTriangle, Calendar, CreditCard, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatCents } from '../../../api/billing/currency-utils';
import {
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getPerSeatPriceCents,
  getQuotaDisplayWithVariant,
  getSeatPricing,
  getStripePriceIdForInterval,
} from '../../../api/billing/pricing-variant-utils';
import type { QuotaDisplayValue } from '../../../api/billing/quota-utils';
import { formatQuotaWithPrice, getQuotaDisplayValue } from '../../../api/billing/quota-utils';
import {
  BillingInterval,
  CheckoutResult,
  ICheckoutSessionResponse,
  IPlanGroupVersionWithPlans,
  IPlanVersion,
  IPlanVersionWithPlan,
  ISubscriptionItem,
  ISubscriptionUpdateResponse,
} from '../../../api/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import {
  useBillingPortal,
  useCancelSubscription,
  useCreateCheckoutSession,
  usePlanGroupVersions,
  useResumeSubscription,
  useSubscriptionManagement,
} from '../subscription-hooks';
import { IWorkspace } from '../types';
import SettingsInvoices from './SettingsInvoices';
import SettingSkeleton from './Skeleton';
// Lazy load SubscriptionDialog to reduce bundle size
// This component is only rendered when subscription dialog is opened
import { lazy, Suspense } from 'react';
const SubscriptionDialog = lazy(() =>
  import('./SubscriptionDialog').then(m => ({ default: m.default }))
);

// Derive billing interval (and currency) from price ID by checking plan versions and their pricingVariants
const getBillingIntervalFromPriceId = (
  priceId: string | null | undefined,
  planVersions: IPlanVersionWithPlan[] | undefined
): BillingInterval | null => {
  const resolved = getBillingIntervalAndCurrencyFromPriceId(priceId, planVersions ?? []);
  return resolved?.interval ?? null;
};

// Get display label for billing interval
const getBillingIntervalLabel = (interval: BillingInterval | null): string => {
  switch (interval) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Unknown';
  }
};

// Format ISO date string to readable date
const formatPeriodEndDate = (isoDate: string | undefined | null): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    // Check if the date is valid
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
};

// Helper function to get plan details from subscriptionItems (optionally with currency for multi-currency quota overage)
const getPlanDetailsFromItems = (
  planVersion: IPlanVersion | null | undefined,
  currency?: string,
  interval: BillingInterval = 'monthly'
) => {
  if (!planVersion?.subscriptionItems) {
    return { features: [], limits: [], quotas: [] };
  }

  const features: Array<{ item: ISubscriptionItem; enabled: boolean }> = [];
  const limits: Array<{ item: ISubscriptionItem; value: number }> = [];
  const quotas: Array<{ item: ISubscriptionItem; value: QuotaDisplayValue }> = [];

  planVersion.subscriptionItems.forEach(item => {
    const slug = item.slug;

    if (item.type === 'feature') {
      const enabled = planVersion.features?.[slug] ?? false;
      features.push({ item, enabled });
    } else if (item.type === 'limit') {
      const value = planVersion.limits?.[slug] ?? 0;
      limits.push({ item, value });
    } else if (item.type === 'quota') {
      const value =
        currency && planVersion.pricingVariants?.length
          ? getQuotaDisplayWithVariant(planVersion, currency, slug, interval)
          : getQuotaDisplayValue(planVersion.quotas?.[slug], interval);
      if (value !== null && value !== undefined) {
        quotas.push({ item, value });
      }
    }
  });

  return { features, limits, quotas };
};

const WorkspaceSettingsSubscription: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const workspaceId = workspace._id?.toString();
  const {
    subscription,
    loading: subscriptionLoading,
    error: subscriptionError,
    updateSubscription,
    refetch: refetchSubscription,
  } = useSubscriptionManagement(workspaceId);
  const { createCheckoutSession } = useCreateCheckoutSession(workspaceId);
  const { cancelSubscription, loading: cancelLoading } = useCancelSubscription(workspaceId);
  const { resumeSubscription, loading: resumeLoading } = useResumeSubscription(workspaceId);
  const { openBillingPortal, loading: portalLoading } = useBillingPortal(workspaceId);

  // Fetch plan group versions (includes currentVersion and availableVersions)
  const {
    versions: planGroupVersions,
    loading: versionsLoading,
    error: versionsError,
    refetch: refetchVersions,
  } = usePlanGroupVersions(workspaceId);

  const loading = subscriptionLoading || versionsLoading;
  const error = subscriptionError || versionsError;

  // Determine if there's a newer version and which version to show
  // API behavior:
  // - With subscription: currentVersion = user's current, availableVersions = newer versions
  // - Without subscription: currentVersion = latest published, availableVersions = []
  const { currentVersion, latestVersion, isDeprecated, whatsNew, plansToShow } = useMemo(() => {
    const userCurrentVersion = planGroupVersions?.currentVersion;
    const availableVersions = planGroupVersions?.availableVersions || [];
    const hasActiveSubscription = subscription?.subscription != null;

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
    const hasNewer =
      hasActiveSubscription && latest && userCurrentVersion
        ? latest.version > userCurrentVersion.version
        : false;

    // Determine which plans to show: always show latest version plans
    const plans = latest?.plans && latest.plans.length > 0 ? latest.plans : [];

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
  const messageTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'subscription' | 'invoices'>('subscription');

  const refetch = async () => {
    await Promise.all([refetchSubscription(), refetchVersions()]);
  };

  const currentIntervalAndCurrency = useMemo(
    () =>
      getBillingIntervalAndCurrencyFromPriceId(
        subscription?.subscription?.stripePriceId,
        plansToShow ?? []
      ),
    [subscription?.subscription?.stripePriceId, plansToShow]
  );

  const handlePlanChange = async (
    planVersionId: string,
    billingInterval: BillingInterval = 'monthly',
    currency?: string
  ) => {
    if (!workspaceId) return;

    const targetPlan = plansToShow?.find(p => p._id === planVersionId);
    const effectiveCurrency =
      currency ??
      currentIntervalAndCurrency?.currency ??
      subscription?.plan?.currency ??
      workspace?.billingCurrency ??
      '';
    const targetPriceId = targetPlan
      ? getStripePriceIdForInterval(targetPlan, effectiveCurrency, billingInterval)
      : null;

    const currentPriceId = subscription?.subscription?.stripePriceId;
    if (targetPriceId && currentPriceId && targetPriceId === currentPriceId) {
      return;
    }

    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      let successUrl: string;
      let cancelUrl: string;

      try {
        const currentUrl = new URL(window.location.href);
        successUrl = currentUrl.toString();
        cancelUrl = currentUrl.toString();
      } catch {
        const protocol = window.location.protocol || 'https:';
        const host = window.location.host || window.location.hostname || '';
        const pathname = window.location.pathname || '/';
        const baseUrl = `${protocol}//${host}${pathname}`;
        successUrl = baseUrl;
        cancelUrl = baseUrl;
      }

      let result: CheckoutResult | ICheckoutSessionResponse | ISubscriptionUpdateResponse;

      if (!subscription?.subscription) {
        result = await createCheckoutSession({
          planVersionId,
          billingInterval,
          currency: effectiveCurrency || undefined,
          successUrl,
          cancelUrl,
        });
      } else {
        result = await updateSubscription(planVersionId, {
          billingInterval,
          successUrl,
          cancelUrl,
        });
      }

      // Check if result is a checkout session response
      if (result && 'checkoutUrl' in result && result.checkoutUrl) {
        // Redirect to checkout URL
        safeRedirect(result.checkoutUrl);
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
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      }, 5000);
    }
  };

  const handleCancelSubscription = async () => {
    if (!workspaceId) return;

    // Close dialog first and show loading state
    setCancelDialogOpen(false);
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      await cancelSubscription();
      setUpdateSuccess('Subscription will be canceled at the end of the billing period.');
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setUpdateError(errorMessage);
    } finally {
      setUpdating(false);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      }, 5000);
    }
  };

  const handleResumeSubscription = async () => {
    if (!workspaceId) return;

    setResumeDialogOpen(false);
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      await resumeSubscription();
      setUpdateSuccess('Subscription has been resumed.');
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume subscription';
      setUpdateError(errorMessage);
    } finally {
      setUpdating(false);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(() => {
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Error loading subscription data</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-2 text-red-600">Please check your connection and try again.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            {loading ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      )}

      {updateError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Update failed</p>
            <p className="text-sm mt-1">{updateError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUpdateError(null)}
            className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            Dismiss
          </Button>
        </div>
      )}

      {updateSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Success!</p>
            <p className="text-sm mt-1">{updateSuccess}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUpdateSuccess(null)}
            className="flex-shrink-0 border-green-200 text-green-700 hover:bg-green-100"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Subscription tabs">
          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className={`border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'subscription'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'invoices'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Invoices
          </button>
        </nav>
      </div>

      {/* Subscription Tab Content */}
      {activeTab === 'subscription' && (
        <>
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <span>Loading subscription and pricing plans...</span>
            </div>
          )}
          {/* Deprecation Notice - Show if user's plan is on an older version */}
          {isDeprecated && subscription?.subscription && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm text-amber-800">
                  <span className="font-medium">Plan update available</span>
                  <span className="text-amber-600">
                    {' '}
                    — v{currentVersion?.version || '?'} → v{latestVersion?.version || '?'}
                  </span>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => setDialogOpen(true)}
              >
                View Plans
              </Button>
            </div>
          )}

          {/* Current Subscription Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Manage your plan and billing</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Hide Change Plan when canceling to prevent multiple overlapping subscriptions */}
                {subscription?.subscription?.cancelAtPeriodEnd ||
                cancelLoading ? null : subscription?.subscription ? (
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    Change Plan
                  </Button>
                ) : !subscription?.subscription && plansToShow && plansToShow.length > 0 ? (
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    View Pricing Plans
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  progress={loading}
                  onClick={refetch}
                  disabled={loading || updating}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {subscription?.subscription ? (
              (() => {
                const resolved = getBillingIntervalAndCurrencyFromPriceId(
                  subscription.subscription.stripePriceId,
                  plansToShow ?? []
                );
                const billingInterval = resolved?.interval ?? null;
                const subscriptionCurrency =
                  resolved?.currency ??
                  subscription.plan?.currency ??
                  workspace?.billingCurrency ??
                  '';
                const currentPrice =
                  billingInterval && subscription.planVersion
                    ? getBasePriceCents(
                        subscription.planVersion,
                        subscriptionCurrency,
                        billingInterval
                      )
                    : null;
                const planCurrency = subscriptionCurrency;

                // Seat pricing info (display only — no total calculation, Stripe handles billing)
                const seatPricingConfig = subscription.planVersion
                  ? getSeatPricing(subscription.planVersion, subscriptionCurrency)
                  : null;
                const perSeatPrice =
                  seatPricingConfig && billingInterval
                    ? getPerSeatPriceCents(
                        subscription.planVersion!,
                        subscriptionCurrency,
                        billingInterval
                      )
                    : null;
                const memberCount = Array.isArray((workspace as any)?.users)
                  ? (workspace as any).users.length
                  : 1;
                const includedSeats = seatPricingConfig?.includedSeats ?? 0;
                const billableSeats = Math.max(0, memberCount - includedSeats);
                const seatCount = memberCount;

                // Show base price only — Stripe calculates the actual total with proration
                const formattedPrice =
                  currentPrice !== null && currentPrice !== undefined
                    ? currentPrice === 0
                      ? 'Free'
                      : formatCents(currentPrice, planCurrency)
                    : null;
                const intervalLabel =
                  billingInterval === 'monthly'
                    ? '/month'
                    : billingInterval === 'quarterly'
                      ? '/quarter'
                      : billingInterval === 'yearly'
                        ? '/year'
                        : '';

                return (
                  <div
                    className={`border rounded-lg overflow-hidden ${isDeprecated ? 'border-amber-300' : 'border-gray-200'}`}
                  >
                    {/* Trial Banner */}
                    {subscription.subscription.subscriptionStatus === 'trialing' &&
                      (() => {
                        const trialEndStr =
                          subscription.subscription.trialEnd ||
                          subscription.subscription.stripeCurrentPeriodEnd;
                        const trialEndRaw = trialEndStr ? new Date(trialEndStr) : null;
                        const trialEnd =
                          trialEndRaw && !isNaN(trialEndRaw.getTime()) ? trialEndRaw : null;
                        const daysRemaining = trialEnd
                          ? Math.max(
                              0,
                              Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                            )
                          : null;
                        const isUrgent = daysRemaining !== null && daysRemaining <= 3;
                        return (
                          <div
                            className={`px-4 py-3 sm:px-5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isUrgent ? 'bg-amber-50 text-amber-800 border-b border-amber-200' : 'bg-blue-50 text-blue-800 border-b border-blue-200'}`}
                          >
                            <span>
                              {daysRemaining !== null && daysRemaining <= 0
                                ? 'Your trial has ended.'
                                : daysRemaining !== null
                                  ? `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
                                  : 'You are on a trial.'}{' '}
                              Upgrade to keep access.
                            </span>
                            <Button
                              size="sm"
                              variant={isUrgent ? 'default' : 'outline'}
                              className={`shrink-0 ${isUrgent ? '' : 'border-blue-300 text-blue-700 hover:bg-blue-100'}`}
                              onClick={() => setDialogOpen(true)}
                            >
                              Upgrade Now
                            </Button>
                          </div>
                        );
                      })()}

                    {/* Plan Header */}
                    <div
                      className={`p-4 sm:p-5 ${isDeprecated ? 'bg-amber-50/50' : 'bg-gray-50/50'}`}
                    >
                      {/* Plan name + badges — wrap on mobile */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {subscription.plan?.name || 'No plan assigned'}
                        </h3>
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.subscription.subscriptionStatus === 'active'
                              ? subscription.subscription.cancelAtPeriodEnd
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                              : subscription.subscription.subscriptionStatus === 'trialing'
                                ? 'bg-blue-100 text-blue-800'
                                : subscription.subscription.subscriptionStatus === 'canceled'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {subscription.subscription.subscriptionStatus === 'active' &&
                            (subscription.subscription.cancelAtPeriodEnd ? 'Canceling' : 'Active')}
                          {subscription.subscription.subscriptionStatus === 'trialing' && 'Trial'}
                          {subscription.subscription.subscriptionStatus === 'canceled' &&
                            'Canceled'}
                          {subscription.subscription.subscriptionStatus === 'past_due' &&
                            'Past Due'}
                        </span>
                        {subscription.subscription.subscriptionStatus === 'trialing' &&
                          formatPeriodEndDate(
                            subscription.subscription.trialEnd ||
                              subscription.subscription.stripeCurrentPeriodEnd
                          ) && (
                            <span className="text-xs text-gray-500">
                              (ends{' '}
                              {formatPeriodEndDate(
                                subscription.subscription.trialEnd ||
                                  subscription.subscription.stripeCurrentPeriodEnd
                              )}
                              )
                            </span>
                          )}
                        {isDeprecated && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            Deprecated
                          </span>
                        )}
                      </div>

                      {subscription.plan?.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {subscription.plan.description}
                        </p>
                      )}

                      {/* Price + billing info — stack on mobile, side by side on desktop */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-gray-900">
                              {formattedPrice || 'N/A'}
                            </span>
                            {formattedPrice && formattedPrice !== 'Free' && intervalLabel && (
                              <span className="text-sm text-gray-500">{intervalLabel}</span>
                            )}
                          </div>
                          {seatPricingConfig && perSeatPrice && perSeatPrice > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              + {formatCents(perSeatPrice, planCurrency)}/seat{intervalLabel}
                            </div>
                          )}
                          {/* Estimated total with seats */}
                          {seatPricingConfig &&
                            perSeatPrice &&
                            perSeatPrice > 0 &&
                            billableSeats > 0 &&
                            formattedPrice &&
                            formattedPrice !== 'Free' &&
                            currentPrice != null && (
                              <div className="text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200">
                                Est. total:{' '}
                                <span className="font-medium text-gray-700">
                                  {formatCents(
                                    currentPrice + perSeatPrice * billableSeats,
                                    planCurrency
                                  )}
                                  {intervalLabel}
                                </span>
                                <span className="text-gray-400">
                                  {' '}
                                  ({billableSeats} extra seat{billableSeats !== 1 ? 's' : ''})
                                </span>
                              </div>
                            )}
                        </div>
                        {(subscription.subscription.subscriptionStatus === 'active' ||
                          subscription.subscription.subscriptionStatus === 'trialing') &&
                          !subscription.subscription.cancelAtPeriodEnd &&
                          formatPeriodEndDate(subscription.subscription.stripeCurrentPeriodEnd) && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>
                                Next billing:{' '}
                                <span className="font-medium text-gray-700">
                                  {formatPeriodEndDate(
                                    subscription.subscription.stripeCurrentPeriodEnd
                                  )}
                                </span>
                              </span>
                            </div>
                          )}
                      </div>

                      {isDeprecated && (
                        <p className="text-xs text-amber-600 mt-2">
                          Version {currentVersion?.version || 'N/A'} - A newer version is available
                        </p>
                      )}

                      {/* Actions: Manage Payment, Cancel/Resume */}
                      {(subscription.subscription.subscriptionStatus === 'active' ||
                        subscription.subscription.subscriptionStatus === 'trialing' ||
                        subscription.subscription.subscriptionStatus === 'past_due') && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-200">
                          {subscription.subscription && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBillingPortal()}
                              disabled={portalLoading}
                              progress={portalLoading}
                            >
                              {portalLoading ? 'Opening...' : 'Manage Payment'}
                            </Button>
                          )}
                          {(subscription.subscription.subscriptionStatus === 'active' ||
                            subscription.subscription.subscriptionStatus === 'trialing') && (
                            <>
                              {subscription.subscription.subscriptionStatus === 'active' &&
                              subscription.subscription.cancelAtPeriodEnd ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setResumeDialogOpen(true)}
                                  disabled={updating || cancelLoading || resumeLoading}
                                  progress={resumeLoading}
                                >
                                  Resume Subscription
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  onClick={() => setCancelDialogOpen(true)}
                                  disabled={updating || cancelLoading || resumeLoading}
                                  progress={cancelLoading || updating}
                                >
                                  {cancelLoading || updating
                                    ? 'Canceling...'
                                    : subscription.subscription.subscriptionStatus === 'trialing'
                                      ? 'Cancel Trial'
                                      : 'Cancel Subscription'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Past Due Warning Banner */}
                    {subscription.subscription.subscriptionStatus === 'past_due' && (
                      <div className="px-5 py-3 bg-red-50 border-t border-red-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Payment past due</p>
                            <p className="text-sm text-red-700 mt-0.5">
                              Please update your payment method to avoid service interruption. Check
                              your invoices for details.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 border-red-200 text-red-700 hover:bg-red-100"
                              onClick={() => setActiveTab('invoices')}
                            >
                              View Invoices
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dunning Banner (payment recovery in progress) */}
                    {subscription.subscription.subscriptionStatus === 'past_due' &&
                      subscription.subscription.dunningState &&
                      subscription.subscription.dunningState !== 'none' && (
                        <div className="px-5 py-3 bg-red-50 border-t border-red-200">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-800">
                                {subscription.subscription.dunningState === 'final'
                                  ? 'Final warning: Subscription will be suspended'
                                  : subscription.subscription.dunningState === 'suspended'
                                    ? 'Subscription suspended'
                                    : 'Payment recovery in progress'}
                              </p>
                              <p className="text-sm text-red-700 mt-0.5">
                                {subscription.subscription.dunningState === 'suspended'
                                  ? 'Your subscription has been suspended due to repeated payment failures. Update your payment method to restore access.'
                                  : 'We were unable to process your payment. Please update your payment method to avoid losing access.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Paused Banner */}
                    {subscription.subscription.subscriptionStatus === 'paused' && (
                      <div className="px-5 py-3 bg-blue-50 border-t border-blue-200">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Subscription paused</p>
                            <p className="text-sm text-blue-700 mt-0.5">
                              Your subscription is currently paused. Resume to restore full access.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cancellation Warning Banner */}
                    {subscription.subscription.cancelAtPeriodEnd && (
                      <div className="px-5 py-3 bg-amber-50 border-t border-amber-200">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">
                              Subscription scheduled for cancellation
                            </p>
                            <p className="text-sm text-amber-700 mt-0.5">
                              {formatPeriodEndDate(
                                subscription.subscription.stripeCurrentPeriodEnd
                              ) ? (
                                <>
                                  Your subscription will end on{' '}
                                  <span className="font-medium">
                                    {formatPeriodEndDate(
                                      subscription.subscription.stripeCurrentPeriodEnd
                                    )}
                                  </span>
                                  . You'll retain access until then and won't be charged again.
                                </>
                              ) : (
                                "Your subscription will be canceled at the end of the current billing period. You won't be charged again."
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Plan Details */}
                    {subscription.planVersion &&
                      (() => {
                        const planDetails = getPlanDetailsFromItems(
                          subscription.planVersion,
                          subscriptionCurrency,
                          billingInterval ?? 'monthly'
                        );
                        const hasDetails =
                          planDetails.features.length > 0 ||
                          planDetails.limits.length > 0 ||
                          planDetails.quotas.length > 0;

                        if (!hasDetails) return null;

                        return (
                          <div className="px-4 py-4 sm:px-5 sm:py-5 border-t border-gray-100">
                            <div className="space-y-5">
                              {/* Features */}
                              {planDetails.features.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Features
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {planDetails.features
                                      .sort(a => (a.enabled ? -1 : 1))
                                      .map(({ item, enabled }) => (
                                        <li
                                          key={item._id}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <span
                                            className={`w-4 text-center shrink-0 ${enabled ? 'text-green-500' : 'text-gray-300'}`}
                                          >
                                            {enabled ? '✓' : '✕'}
                                          </span>
                                          <span
                                            className={enabled ? 'text-gray-700' : 'text-gray-400'}
                                          >
                                            {item.name}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}

                              {/* Limits */}
                              {planDetails.limits.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Limits
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {planDetails.limits.map(({ item, value }) => (
                                      <li
                                        key={item._id}
                                        className="flex items-center justify-between text-sm"
                                      >
                                        <span className="text-gray-600">{item.name}</span>
                                        <span className="font-medium text-gray-900">{value}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Quotas */}
                              {planDetails.quotas.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Usage Quotas
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {planDetails.quotas.map(({ item, value }) => {
                                      const quotaDisplay = formatQuotaWithPrice(
                                        value,
                                        item.name.toLowerCase(),
                                        { currency: subscriptionCurrency }
                                      );
                                      return (
                                        <li key={item._id} className="text-sm">
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                            <span className="text-gray-600">{item.name}</span>
                                            <span className="font-medium text-gray-900 text-xs sm:text-sm">
                                              {quotaDisplay}
                                            </span>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              {/* Seats */}
                              {seatPricingConfig && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Seats
                                  </h4>
                                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">Members</span>
                                      <span className="font-semibold text-gray-900">
                                        {memberCount}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">Included</span>
                                      <span className="text-gray-900">{includedSeats}</span>
                                    </div>
                                    {billableSeats > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Billable</span>
                                        <span className="font-medium text-amber-600">
                                          {billableSeats} extra
                                        </span>
                                      </div>
                                    )}
                                    {perSeatPrice && perSeatPrice > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Per extra seat</span>
                                        <span className="text-gray-900">
                                          {formatCents(perSeatPrice, subscriptionCurrency)}
                                          {intervalLabel}
                                        </span>
                                      </div>
                                    )}
                                    {(seatPricingConfig as any).maxSeats > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Limit</span>
                                        <span className="text-gray-900">
                                          {(seatPricingConfig as any).maxSeats}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                );
              })()
            ) : workspace.pendingOnboarding ? (
              // Pending trial: org configured auto-trial for new workspaces
              <div className="border rounded-lg p-6 text-center">
                <div className="mb-4">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-blue-400" />
                  <p className="text-lg font-medium text-gray-700">Start your free trial</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try the full plan with no commitment. You can upgrade or cancel anytime.
                  </p>
                </div>
                <Button
                  size="sm"
                  progress={updating}
                  onClick={async () => {
                    try {
                      setUpdating(true);
                      const result = await createCheckoutSession({
                        planVersionId: workspace.pendingOnboarding?.planVersionId ?? '',
                      });
                      if (result && 'checkoutUrl' in result && result.checkoutUrl) {
                        safeRedirect(result.checkoutUrl);
                      }
                    } catch (err: any) {
                      // Show error or fallback
                    } finally {
                      setUpdating(false);
                    }
                  }}
                >
                  Start Free Trial
                </Button>
                {plansToShow && plansToShow.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setDialogOpen(true)}
                  >
                    View All Plans
                  </Button>
                )}
              </div>
            ) : (
              // No subscription, no pending trial
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
                {plansToShow && plansToShow.length > 0 && (
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    View Pricing Plans
                  </Button>
                )}
              </div>
            )}
          </div>

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
              <Button
                variant="outline"
                size="sm"
                progress={loading}
                onClick={refetch}
                disabled={loading}
                className="mt-4"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Invoices Tab Content */}
      {activeTab === 'invoices' && (
        <>
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <span>Loading invoices...</span>
            </div>
          )}
          <SettingsInvoices
            workspaceId={workspaceId}
            hasActiveSubscription={subscription?.subscription !== null}
            onViewPricingPlans={() => setActiveTab('subscription')}
            limit={20}
          />
        </>
      )}

      {/* Subscription Dialog */}
      {plansToShow && plansToShow.length > 0 && (
        <Suspense
          fallback={
            dialogOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading plans...</span>
                </div>
              </div>
            ) : null
          }
        >
          <SubscriptionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            planVersions={plansToShow}
            currentPlanVersionId={currentPlanVersionId || null}
            currentStripePriceId={subscription?.subscription?.stripePriceId}
            billingCurrency={workspace.billingCurrency}
            currentMemberCount={
              Array.isArray((workspace as any)?.users) ? (workspace as any).users.length : undefined
            }
            onSelectPlan={handlePlanChange}
            loading={updating || loading}
          />
        </Suspense>
      )}

      {/* Resume Subscription Confirmation Dialog */}
      <AlertDialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Subscription</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to resume your subscription?</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>
                      You will be charged again on{' '}
                      {subscription?.subscription?.stripeCurrentPeriodEnd &&
                      formatPeriodEndDate(subscription.subscription.stripeCurrentPeriodEnd) ? (
                        <span className="font-medium">
                          {formatPeriodEndDate(subscription.subscription.stripeCurrentPeriodEnd)}
                        </span>
                      ) : (
                        'the next billing date'
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>
                      Your subscription will continue automatically and you'll be billed according
                      to your plan
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">ℹ</span>
                    <span>
                      You can cancel anytime before the next billing date if you change your mind
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resumeLoading}>Keep Canceled</AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeSubscription} disabled={resumeLoading}>
              {resumeLoading ? 'Resuming...' : 'Yes, Resume Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to cancel your subscription?</p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>
                      You'll retain full access to this plan until{' '}
                      {subscription?.subscription?.stripeCurrentPeriodEnd &&
                      formatPeriodEndDate(subscription.subscription.stripeCurrentPeriodEnd) ? (
                        <span className="font-medium">
                          {formatPeriodEndDate(subscription.subscription.stripeCurrentPeriodEnd)}
                        </span>
                      ) : (
                        'the end of your current billing period'
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>You won't be charged again after cancellation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">ℹ</span>
                    <span>You can resume your subscription anytime before it ends</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {cancelLoading ? 'Canceling...' : 'Yes, Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkspaceSettingsSubscription;
