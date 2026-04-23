import { AlertTriangle, Calendar, CreditCard, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getPerSeatPriceCents,
  getQuotaDisplayWithVariant,
  getSeatPricing,
  getStripePriceIdForInterval,
} from '../../../api/billing/pricing-variant-utils';
import type { QuotaDisplayValue } from '../../../api/billing/quota-utils';
import { getQuotaDisplayParts, getQuotaDisplayValue } from '../../../api/billing/quota-utils';
import {
  BillingInterval,
  BillingIntervals,
  CheckoutResult,
  DunningState,
  ICheckoutSessionResponse,
  IPlanGroupVersionWithPlans,
  IPlanVersion,
  ISubscriptionItem,
  ISubscriptionUpdateResponse,
  SubscriptionItemType,
  SubscriptionStatus,
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
import { invalidateSubscription } from '../../../contexts/SubscriptionContext/subscriptionInvalidation';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../i18n';
import { Permission } from '../../../lib/permissions';
import { safeRedirect } from '../../../lib/security';
import { createCheckoutRedirectUrls } from '../../../lib/url-params';
import { useSaaSSettings } from '../../os/hooks';
import { WorkspaceModes } from '../../types';
import { workspaceSettingsManager } from '../settings-manager';
import {
  useBillingPortal,
  useCancelSubscription,
  useCreateCheckoutSession,
  usePlanGroupVersions,
  useResumeSubscription,
  useSubscriptionManagement,
} from '../subscription-hooks';
import { IWorkspace } from '../types';
import { useWorkspaceApiWithOs } from '../use-workspace-api';
import SettingsInvoices from './SettingsInvoices';
import SettingSkeleton from './Skeleton';
// Lazy load SubscriptionDialog to reduce bundle size
// This component is only rendered when subscription dialog is opened
import { lazy, Suspense } from 'react';
const SubscriptionDialog = lazy(() =>
  import('./SubscriptionDialog').then(m => ({ default: m.default }))
);

// Format ISO date string to readable date
const formatPeriodEndDate = (locale: string, isoDate: string | undefined | null): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, {
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
  interval: BillingInterval = BillingIntervals.Monthly
) => {
  if (!planVersion?.subscriptionItems) {
    return { features: [], limits: [], quotas: [] };
  }

  const features: Array<{ item: ISubscriptionItem; enabled: boolean }> = [];
  const limits: Array<{ item: ISubscriptionItem; value: number }> = [];
  const quotas: Array<{ item: ISubscriptionItem; value: QuotaDisplayValue }> = [];

  planVersion.subscriptionItems.forEach(item => {
    const slug = item.slug;

    if (item.type === SubscriptionItemType.Feature) {
      const enabled = planVersion.features?.[slug] ?? false;
      features.push({ item, enabled });
    } else if (item.type === SubscriptionItemType.Limit) {
      const value = planVersion.limits?.[slug] ?? 0;
      limits.push({ item, value });
    } else if (item.type === SubscriptionItemType.Quota) {
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
  const { t, formattingLocale, fmtNum, fmtCents } = useTranslation();
  const { api } = useWorkspaceApiWithOs();
  const { can } = usePermissions();
  const { settings: orgSettings } = useSaaSSettings();
  const canViewBilling = can(Permission.WORKSPACE_BILLING_VIEW);
  const canManageBilling = can(Permission.WORKSPACE_BILLING_MANAGE);
  const isPersonalMode = orgSettings?.workspace?.mode === WorkspaceModes.Personal;
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
  const { currentVersion, latestVersion, isDeprecated, plansToShow } = useMemo(() => {
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
      plansToShow: plans,
    };
  }, [planGroupVersions, subscription?.subscription]);

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Capture BB params for pre-selecting interval/currency in the plan dialog
  const selectPlanParamsRef = useRef<Record<string, string> | undefined>(undefined);

  // Auto-open plan picker when there's no subscription (e.g. right after workspace creation)
  // or when navigated via selectPlan BB params (e.g. from pricing page after login)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (subscriptionLoading || !plansToShow || plansToShow.length === 0) return;

    const settingsState = workspaceSettingsManager.getState();
    const isSelectPlan = settingsState.params?.action === 'selectPlan';

    if (!subscription?.subscription || isSelectPlan) {
      autoOpenedRef.current = true;
      if (isSelectPlan) {
        selectPlanParamsRef.current = settingsState.params;
        workspaceSettingsManager.clearParams();
      }
      setDialogOpen(true);
    }
  }, [subscriptionLoading, subscription?.subscription, plansToShow]);

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
    billingInterval: BillingInterval = BillingIntervals.Monthly,
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
      const { successUrl, cancelUrl } = createCheckoutRedirectUrls(workspaceId);

      let result: CheckoutResult | ICheckoutSessionResponse | ISubscriptionUpdateResponse;

      // Free plan selection
      if (targetPlan?.plan?.isFreemium) {
        const hasStripe = !!(subscription?.subscription as any)?.subscriptionId;
        if (hasStripe) {
          // Downgrade from paid → free: show cancel dialog (cancel at period end)
          // After subscription expires, user picks free plan from plan picker
          setDialogOpen(false);
          setCancelDialogOpen(true);
          return;
        }
        // No Stripe subscription (e.g. no subscription or already on free): assign locally
        await api.selectFreePlan(workspaceId, planVersionId);
        setDialogOpen(false);
        invalidateSubscription();
        await refetch();
        setUpdateSuccess(t('subscription.updateSuccess'));
        return;
      }

      // Treat canceled subscriptions as "no subscription" — create new checkout instead of updating
      const isCanceled =
        subscription?.subscription?.subscriptionStatus === SubscriptionStatus.Canceled;
      const hasActiveSubscription = subscription?.subscription && !isCanceled;

      if (!hasActiveSubscription) {
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
      setUpdateSuccess(t('subscription.updateSuccess'));
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('subscription.errorProcessing');
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
      setUpdateSuccess(t('subscription.cancelSuccess'));
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('subscription.errorCanceling');
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
      setUpdateSuccess(t('subscription.resumeSuccess'));
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('subscription.errorResuming');
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

  if (!canViewBilling) return null;

  const currentPlanVersionId = subscription?.planVersion?._id || null;

  // Show error if workspaceId is missing
  if (!workspaceId) {
    return (
      <div className="border rounded-lg p-4 text-center text-gray-500">
        <p>{t('subscription.invalidWorkspace')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{t('subscription.errorLoading')}</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-2 text-red-600">{t('subscription.errorLoadingDescription')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            {t('settings.common.retryAction', { loading: String(loading) })}
          </Button>
        </div>
      )}

      {updateError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{t('subscription.updateFailed')}</p>
            <p className="text-sm mt-1">{updateError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUpdateError(null)}
            className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            {t('settings.common.dismiss')}
          </Button>
        </div>
      )}

      {updateSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{t('settings.common.success')}</p>
            <p className="text-sm mt-1">{updateSuccess}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUpdateSuccess(null)}
            className="flex-shrink-0 border-green-200 text-green-700 hover:bg-green-100"
          >
            {t('settings.common.dismiss')}
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
            {t('subscription.plan')}
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
            {t('subscription.invoicesTab')}
          </button>
        </nav>
      </div>

      {/* Subscription Tab Content */}
      {activeTab === 'subscription' && (
        <>
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <span>{t('settings.common.loading')}</span>
            </div>
          )}
          {/* Deprecation Notice - Show if user's plan is on an older version */}
          {isDeprecated && subscription?.subscription && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm text-amber-800">
                  <span className="font-medium">{t('subscription.planUpdateAvailable')}</span>
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
                {t('subscription.viewPlans')}
              </Button>
            </div>
          )}

          {/* Current Subscription Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('subscription.managePlan')}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Show appropriate button based on subscription state */}
                {(() => {
                  const isCanceled =
                    subscription?.subscription?.subscriptionStatus === SubscriptionStatus.Canceled;
                  const isCanceling = subscription?.subscription?.cancelAtPeriodEnd;

                  // Canceling (pending end of period) — hide to prevent overlapping subscriptions
                  if (isCanceling || cancelLoading) return null;

                  // Fully canceled — treat as no subscription, offer new plan
                  if (isCanceled && plansToShow && plansToShow.length > 0) {
                    return (
                      <Button size="sm" onClick={() => setDialogOpen(true)}>
                        {t('subscription.viewPricingPlans')}
                      </Button>
                    );
                  }

                  // Active subscription — allow changing plan (only if user can manage billing)
                  if (subscription?.subscription && !isCanceled && canManageBilling) {
                    return (
                      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                        {t('subscription.changePlanButton')}
                      </Button>
                    );
                  }

                  // No subscription at all — offer pricing plans
                  if (!subscription?.subscription && plansToShow && plansToShow.length > 0) {
                    return (
                      <Button size="sm" onClick={() => setDialogOpen(true)}>
                        {t('subscription.viewPricingPlans')}
                      </Button>
                    );
                  }

                  return null;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  progress={loading}
                  onClick={refetch}
                  disabled={loading || updating}
                >
                  {t('settings.common.refreshAction', { loading: String(loading) })}
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

                // Show base price only — Stripe calculates the actual total with proration
                const isFreemiumPlan = !!(subscription.plan as any)?.isFreemium;
                const formattedPrice =
                  currentPrice !== null && currentPrice !== undefined
                    ? currentPrice === 0
                      ? t('subscription.free')
                      : fmtCents(currentPrice, planCurrency)
                    : isFreemiumPlan
                      ? t('subscription.free')
                      : null;
                const intervalLabel =
                  billingInterval === BillingIntervals.Monthly
                    ? t('subscription.billingInterval.perMonth')
                    : billingInterval === BillingIntervals.Quarterly
                      ? t('subscription.billingInterval.perQuarter')
                      : billingInterval === BillingIntervals.Yearly
                        ? t('subscription.billingInterval.perYear')
                        : '';

                return (
                  <div
                    className={`border rounded-lg overflow-hidden ${isDeprecated ? 'border-amber-300' : 'border-gray-200'}`}
                  >
                    {/* Trial Banner — hide when trial is already scheduled for cancellation */}
                    {subscription.subscription.subscriptionStatus === SubscriptionStatus.Trialing &&
                      !subscription.subscription.cancelAtPeriodEnd &&
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
                                ? t('subscription.trialEnded')
                                : daysRemaining !== null
                                  ? t('subscription.trialEndsIn', { days: daysRemaining })
                                  : t('subscription.onTrial')}{' '}
                              {t('subscription.upgradeToKeepAccess')}
                            </span>
                            <Button
                              size="sm"
                              variant={isUrgent ? 'default' : 'outline'}
                              className={`shrink-0 ${isUrgent ? '' : 'border-blue-300 text-blue-700 hover:bg-blue-100'}`}
                              onClick={() => setDialogOpen(true)}
                            >
                              {t('subscription.upgradePlan')}
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
                          {subscription.plan?.name || t('subscription.noPlanAssigned')}
                        </h3>
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Active
                              ? subscription.subscription.cancelAtPeriodEnd
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                              : subscription.subscription.subscriptionStatus ===
                                  SubscriptionStatus.Trialing
                                ? 'bg-blue-100 text-blue-800'
                                : subscription.subscription.subscriptionStatus ===
                                    SubscriptionStatus.Canceled
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Active &&
                            (subscription.subscription.cancelAtPeriodEnd
                              ? t('subscription.status.canceling')
                              : t('subscription.status.active'))}
                          {subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Trialing && t('subscription.status.trial')}
                          {subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Canceled && t('subscription.status.canceled')}
                          {subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.PastDue && t('subscription.status.pastDue')}
                        </span>
                        {subscription.subscription.subscriptionStatus ===
                          SubscriptionStatus.Trialing &&
                          formatPeriodEndDate(
                            formattingLocale,
                            subscription.subscription.trialEnd ||
                              subscription.subscription.stripeCurrentPeriodEnd
                          ) && (
                            <span className="text-xs text-gray-500">
                              (ends{' '}
                              {formatPeriodEndDate(
                                formattingLocale,
                                subscription.subscription.trialEnd ||
                                  subscription.subscription.stripeCurrentPeriodEnd
                              )}
                              )
                            </span>
                          )}
                        {isDeprecated && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            {t('subscription.status.deprecated')}
                          </span>
                        )}
                      </div>

                      {subscription.plan?.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {subscription.plan.description}
                        </p>
                      )}

                      {/* Price + billing info — stack on mobile, side by side on desktop */}
                      {!isFreemiumPlan && (
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div>
                            <div className="flex items-baseline gap-1 whitespace-nowrap">
                              <span className="text-2xl font-bold text-gray-900">
                                {formattedPrice || t('invoices.na')}
                              </span>
                              {formattedPrice &&
                                formattedPrice !== t('subscription.free') &&
                                intervalLabel && (
                                  <span className="text-sm text-gray-500">{intervalLabel}</span>
                                )}
                            </div>
                            {seatPricingConfig &&
                              perSeatPrice &&
                              perSeatPrice > 0 &&
                              !isPersonalMode && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {t('subscription.perSeatDisplay', {
                                    price: fmtCents(perSeatPrice, planCurrency),
                                    interval: intervalLabel,
                                  })}
                                </div>
                              )}
                            {/* Estimated total with seats — hidden in personal mode */}
                            {!isPersonalMode &&
                              seatPricingConfig &&
                              perSeatPrice &&
                              perSeatPrice > 0 &&
                              billableSeats > 0 &&
                              formattedPrice &&
                              formattedPrice !== t('subscription.free') &&
                              currentPrice != null && (
                                <div className="text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200">
                                  {t('subscription.estTotalDisplay', {
                                    total: fmtCents(
                                      currentPrice + perSeatPrice * billableSeats,
                                      planCurrency
                                    ),
                                    interval: intervalLabel,
                                    count: billableSeats,
                                  })}
                                </div>
                              )}
                          </div>
                          {(subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Active ||
                            subscription.subscription.subscriptionStatus ===
                              SubscriptionStatus.Trialing) &&
                            !subscription.subscription.cancelAtPeriodEnd &&
                            formatPeriodEndDate(
                              formattingLocale,
                              subscription.subscription.stripeCurrentPeriodEnd
                            ) && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                  {t('subscription.nextBillingDisplay', {
                                    date:
                                      formatPeriodEndDate(
                                        formattingLocale,
                                        subscription.subscription.stripeCurrentPeriodEnd
                                      ) ?? '',
                                  })}
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      {isDeprecated && (
                        <p className="text-xs text-amber-600 mt-2">
                          Version {currentVersion?.version || t('invoices.na')}
                        </p>
                      )}

                      {/* Actions: Manage Payment, Cancel/Resume */}
                      {!isFreemiumPlan &&
                        (subscription.subscription.subscriptionStatus ===
                          SubscriptionStatus.Active ||
                          subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Trialing ||
                          subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.PastDue) && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-200">
                            {subscription.subscription &&
                              canManageBilling &&
                              (subscription.subscription as any).subscriptionId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openBillingPortal()}
                                  disabled={portalLoading}
                                  progress={portalLoading}
                                >
                                  {portalLoading
                                    ? t('subscription.openingPortal')
                                    : t('subscription.managePayment')}
                                </Button>
                              )}
                            {canManageBilling &&
                              (subscription.subscription as any).subscriptionId &&
                              (subscription.subscription.subscriptionStatus ===
                                SubscriptionStatus.Active ||
                                subscription.subscription.subscriptionStatus ===
                                  SubscriptionStatus.Trialing) && (
                                <>
                                  {subscription.subscription.cancelAtPeriodEnd ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setResumeDialogOpen(true)}
                                      disabled={updating || cancelLoading || resumeLoading}
                                      progress={resumeLoading}
                                    >
                                      {subscription.subscription.subscriptionStatus ===
                                      SubscriptionStatus.Trialing
                                        ? t('subscription.resumeTrial')
                                        : t('subscription.resumeTitle')}
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
                                        ? t('subscription.canceling')
                                        : subscription.subscription.subscriptionStatus ===
                                            SubscriptionStatus.Trialing
                                          ? t('subscription.cancelTrial')
                                          : t('subscription.cancelTitle')}
                                    </Button>
                                  )}
                                </>
                              )}
                          </div>
                        )}
                    </div>

                    {/* Past Due Warning Banner */}
                    {subscription.subscription.subscriptionStatus ===
                      SubscriptionStatus.PastDue && (
                      <div className="px-5 py-3 bg-red-50 border-t border-red-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">
                              {t('subscription.paymentPastDue')}
                            </p>
                            <p className="text-sm text-red-700 mt-0.5">
                              {t('subscription.paymentPastDueDescription')}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 border-red-200 text-red-700 hover:bg-red-100"
                              onClick={() => setActiveTab('invoices')}
                            >
                              {t('subscription.viewInvoices')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dunning Banner (payment recovery in progress) */}
                    {subscription.subscription.subscriptionStatus === SubscriptionStatus.PastDue &&
                      subscription.subscription.dunningState &&
                      subscription.subscription.dunningState !== DunningState.None && (
                        <div className="px-5 py-3 bg-red-50 border-t border-red-200">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-800">
                                {subscription.subscription.dunningState === DunningState.Final
                                  ? t('subscription.dunningFinal')
                                  : subscription.subscription.dunningState ===
                                      DunningState.Suspended
                                    ? t('subscription.dunningSuspended')
                                    : t('subscription.dunningRecovery')}
                              </p>
                              <p className="text-sm text-red-700 mt-0.5">
                                {subscription.subscription.dunningState === DunningState.Suspended
                                  ? t('subscription.dunningSuspendedDescription')
                                  : t('subscription.dunningRecoveryDescription')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Paused Banner */}
                    {subscription.subscription.subscriptionStatus === SubscriptionStatus.Paused && (
                      <div className="px-5 py-3 bg-blue-50 border-t border-blue-200">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              {t('subscription.subscriptionPaused')}
                            </p>
                            <p className="text-sm text-blue-700 mt-0.5">
                              {t('subscription.subscriptionPausedDescription')}
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
                              {subscription.subscription.subscriptionStatus ===
                              SubscriptionStatus.Trialing
                                ? t('subscription.scheduledTrialCancellation')
                                : t('subscription.scheduledCancellation')}
                            </p>
                            <p className="text-sm text-amber-700 mt-0.5">
                              {formatPeriodEndDate(
                                formattingLocale,
                                subscription.subscription.subscriptionStatus ===
                                  SubscriptionStatus.Trialing
                                  ? subscription.subscription.trialEnd ||
                                      subscription.subscription.stripeCurrentPeriodEnd
                                  : subscription.subscription.stripeCurrentPeriodEnd
                              ) ? (
                                <>
                                  {subscription.subscription.subscriptionStatus ===
                                  SubscriptionStatus.Trialing
                                    ? t('subscription.trialEndDescription')
                                    : t('subscription.cancelEndDescription')}{' '}
                                  <span className="font-medium">
                                    {formatPeriodEndDate(
                                      formattingLocale,
                                      subscription.subscription.subscriptionStatus ===
                                        SubscriptionStatus.Trialing
                                        ? subscription.subscription.trialEnd ||
                                            subscription.subscription.stripeCurrentPeriodEnd
                                        : subscription.subscription.stripeCurrentPeriodEnd
                                    )}
                                  </span>
                                  .
                                </>
                              ) : (
                                t('subscription.cancelEndFallback')
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
                                    {t('subscription.items.features')}
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
                                    {t('subscription.items.limits')}
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
                                    {t('subscription.items.quotas')}
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {planDetails.quotas.map(({ item, value }) => {
                                      const parts = getQuotaDisplayParts(
                                        value,
                                        item.name.toLowerCase(),
                                        { currency: subscriptionCurrency, locale: formattingLocale }
                                      );
                                      const quotaDisplay = parts
                                        ? parts.hasOverage
                                          ? t('quota.includedWithOverage', {
                                              count: parts.included,
                                              price: parts.price,
                                              unit: parts.unit,
                                            })
                                          : t('quota.includedOnly', { count: parts.included })
                                        : '—';
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

                              {/* Seats — hidden in personal mode */}
                              {seatPricingConfig && !isPersonalMode && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    {t('subscription.seats.title')}
                                  </h4>
                                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">
                                        {t('subscription.seats.members')}
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {fmtNum(memberCount)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">
                                        {t('subscription.seats.included')}
                                      </span>
                                      <span className="text-gray-900">{fmtNum(includedSeats)}</span>
                                    </div>
                                    {billableSeats > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">
                                          {t('subscription.seats.billable')}
                                        </span>
                                        <span className="font-medium text-amber-600">
                                          {fmtNum(billableSeats)} {t('subscription.seats.extra')}
                                        </span>
                                      </div>
                                    )}
                                    {perSeatPrice && perSeatPrice > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">
                                          {t('subscription.seats.perExtraSeat')}
                                        </span>
                                        <span className="text-gray-900">
                                          {fmtCents(perSeatPrice, subscriptionCurrency)}
                                          {intervalLabel}
                                        </span>
                                      </div>
                                    )}
                                    {(seatPricingConfig as any).maxSeats > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">
                                          {t('subscription.seats.limit')}
                                        </span>
                                        <span className="text-gray-900">
                                          {fmtNum((seatPricingConfig as any).maxSeats)}
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
            ) : (
              // No subscription, no pending trial
              <div className="border rounded-lg p-6 text-center">
                <div className="mb-4">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-lg font-medium text-gray-700">
                    {t('subscription.noSubscription')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('subscription.noSubscriptionDescription')}
                  </p>
                </div>
                {plansToShow && plansToShow.length > 0 && (
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    {t('subscription.viewPricingPlans')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {!planGroupVersions && !loading && (
            <div className="border rounded-lg p-4 text-center">
              <div className="text-gray-500 mb-2">
                <p className="font-medium">{t('subscription.errorLoading')}</p>
                {error && <p className="text-sm mt-2 text-red-600">Error: {error}</p>}
                {!error && <p className="text-sm mt-2">{t('subscription.noPlansAvailable')}</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                progress={loading}
                onClick={refetch}
                disabled={loading}
                className="mt-4"
              >
                {t('settings.common.refreshAction', { loading: String(loading) })}
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
              <span>{t('settings.common.loading')}</span>
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
                  <span>{t('settings.common.loading')}</span>
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
            trialUsedAt={workspace.trialUsedAt}
            workspaceName={workspace.name}
            initialInterval={selectPlanParamsRef.current?.interval as BillingInterval | undefined}
            initialCurrency={selectPlanParamsRef.current?.currency}
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
            <AlertDialogTitle>{t('subscription.resumeTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t('subscription.resumeConfirm')}</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>
                      {t('subscription.resumeChargeDate')}{' '}
                      {subscription?.subscription?.stripeCurrentPeriodEnd &&
                      formatPeriodEndDate(
                        formattingLocale,
                        subscription.subscription.stripeCurrentPeriodEnd
                      ) ? (
                        <span className="font-medium">
                          {formatPeriodEndDate(
                            formattingLocale,
                            subscription.subscription.stripeCurrentPeriodEnd
                          )}
                        </span>
                      ) : (
                        t('subscription.resumeChargeFallback')
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>{t('subscription.resumeContinue')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">ℹ</span>
                    <span>{t('subscription.resumeCancelAnytime')}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resumeLoading}>
              {t('subscription.resumeKeep')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeSubscription} disabled={resumeLoading}>
              {resumeLoading ? t('subscription.resuming') : t('subscription.resumeButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Confirmation Dialog */}
      {(() => {
        const isTrialing =
          subscription?.subscription?.subscriptionStatus === SubscriptionStatus.Trialing;
        const endDate = isTrialing
          ? subscription?.subscription?.trialEnd ||
            subscription?.subscription?.stripeCurrentPeriodEnd
          : subscription?.subscription?.stripeCurrentPeriodEnd;

        return (
          <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isTrialing ? t('subscription.cancelTrialTitle') : t('subscription.cancelTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      {isTrialing
                        ? t('subscription.cancelTrialConfirm')
                        : t('subscription.cancelConfirm')}
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>
                          {isTrialing
                            ? t('subscription.cancelTrialAccess')
                            : t('subscription.retainAccess')}{' '}
                          {endDate && formatPeriodEndDate(formattingLocale, endDate) ? (
                            <span className="font-medium">
                              {formatPeriodEndDate(formattingLocale, endDate)}
                            </span>
                          ) : (
                            t('subscription.retainAccessFallback')
                          )}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>
                          {isTrialing
                            ? t('subscription.cancelTrialNoCharge')
                            : t('subscription.cancelNotCharged')}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">ℹ</span>
                        <span>
                          {isTrialing
                            ? t('subscription.cancelTrialResume')
                            : t('subscription.cancelResumeAnytime')}
                        </span>
                      </div>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={cancelLoading}>
                  {isTrialing ? t('subscription.cancelTrialKeep') : t('subscription.cancelKeep')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  {cancelLoading
                    ? t('subscription.canceling')
                    : isTrialing
                      ? t('subscription.cancelTrialButton')
                      : t('subscription.cancelButton')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}
    </div>
  );
};

export default WorkspaceSettingsSubscription;
