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
import { EmptyState } from '../../../components/ui/empty-state';
import { LoadingState } from '../../../components/ui/loading-state';
import { StatusBanner } from '../../../components/ui/status-banner';
import { invalidateSubscription } from '../../../contexts/SubscriptionContext/subscriptionInvalidation';
import { usePermissions } from '../../../hooks/usePermissions';
import { useUIVisibility } from '../../../hooks/useUIVisibility';
import { useTranslation } from '../../../i18n';
import { Permission } from '../../../lib/permissions';
import { safeRedirect } from '../../../lib/security';
import { BBAction, createCheckoutRedirectUrls } from '../../../lib/url-params';
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
import WorkspaceSettingsInvoices from './SettingsInvoices';
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
  const { visible, ui } = useUIVisibility();
  const uiBehavior = ui.behavior;
  const showChangePlan = visible(s => s.settings?.subscription?.changePlan);
  const showCancel = visible(s => s.settings?.subscription?.cancel);
  const showManagePayment = visible(s => s.settings?.subscription?.managePayment);
  const showInvoicesTab = visible(s => s.settings?.subscription?.invoicesTab);
  const showPlanDetails = visible(s => s.settings?.subscription?.planDetails);
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
    const isSelectPlan = settingsState.params?.action === BBAction.SelectPlan;

    // Explicit selectPlan deep links always open; the no-subscription
    // auto-open can be disabled via ui.behavior.autoOpenPlanDialog.
    const autoOpenAllowed = uiBehavior?.autoOpenPlanDialog !== false;

    if ((!subscription?.subscription && autoOpenAllowed) || isSelectPlan) {
      autoOpenedRef.current = true;
      if (isSelectPlan) {
        selectPlanParamsRef.current = settingsState.params;
        workspaceSettingsManager.clearParams();
      }
      setDialogOpen(true);
    }
  }, [
    subscriptionLoading,
    subscription?.subscription,
    plansToShow,
    uiBehavior?.autoOpenPlanDialog,
  ]);

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
        const hasStripe = !!subscription?.subscription?.subscriptionId;
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
      <div className="border rounded-lg p-4 text-center text-muted-foreground">
        <p>{t('subscription.invalidWorkspace')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <StatusBanner
          variant="error"
          title={t('subscription.errorLoading')}
          message={error}
          description={t('subscription.errorLoadingDescription')}
          actionLabel={t('settings.common.retryAction', { loading: String(loading) })}
          onAction={refetch}
          actionDisabled={loading}
        />
      )}

      {updateError && (
        <StatusBanner
          variant="error"
          title={t('subscription.updateFailed')}
          message={updateError}
          actionLabel={t('settings.common.dismiss')}
          onAction={() => setUpdateError(null)}
        />
      )}

      {updateSuccess && (
        <StatusBanner
          variant="success"
          title={t('settings.common.success')}
          message={updateSuccess}
          actionLabel={t('settings.common.dismiss')}
          onAction={() => setUpdateSuccess(null)}
        />
      )}

      {/* Tabs — hidden entirely when the invoices tab is disabled (a lone tab is noise) */}
      {showInvoicesTab && (
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6" role="tablist" aria-label="Subscription tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'subscription'}
              onClick={() => setActiveTab('subscription')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'subscription'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {t('subscription.plan')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'invoices'}
              onClick={() => setActiveTab('invoices')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {t('subscription.invoicesTab')}
            </button>
          </nav>
        </div>
      )}

      {/* Subscription Tab Content */}
      {activeTab === 'subscription' && (
        <>
          {loading && <LoadingState />}
          {/* Deprecation Notice - Show if user's plan is on an older version */}
          {showChangePlan && isDeprecated && subscription?.subscription && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span className="text-sm text-warning">
                  <span className="font-medium">{t('subscription.planUpdateAvailable')}</span>
                  <span className="text-warning">
                    {' '}
                    — v{currentVersion?.version || '?'} → v{latestVersion?.version || '?'}
                  </span>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-warning/40 text-warning hover:bg-warning/15"
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
                <p className="text-sm text-muted-foreground">{t('subscription.managePlan')}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Show appropriate button based on subscription state */}
                {(() => {
                  // Plan-picker entry points disabled by the implementor UI config
                  if (!showChangePlan) return null;

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
                const memberCount = Array.isArray(workspace?.users) ? workspace.users.length : 1;
                const includedSeats = seatPricingConfig?.includedSeats ?? 0;
                const billableSeats = Math.max(0, memberCount - includedSeats);

                // Show base price only — Stripe calculates the actual total with proration
                const isFreemiumPlan = !!subscription.plan?.isFreemium;
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
                    className={`border rounded-lg overflow-hidden ${isDeprecated ? 'border-warning/40' : 'border-border'}`}
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
                            className={`px-4 py-3 sm:px-5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isUrgent ? 'bg-warning/10 text-warning border-b border-warning/30' : 'bg-info/10 text-info border-b border-info/20'}`}
                          >
                            <span>
                              {daysRemaining !== null && daysRemaining <= 0
                                ? t('subscription.trialEnded')
                                : daysRemaining !== null
                                  ? t('subscription.trialEndsIn', { days: daysRemaining })
                                  : t('subscription.onTrial')}{' '}
                              {t('subscription.upgradeToKeepAccess')}
                            </span>
                            {showChangePlan && (
                              <Button
                                size="sm"
                                variant={isUrgent ? 'default' : 'outline'}
                                className={`shrink-0 ${isUrgent ? '' : 'border-info/30 text-info hover:bg-info/15'}`}
                                onClick={() => setDialogOpen(true)}
                              >
                                {t('subscription.upgradePlan')}
                              </Button>
                            )}
                          </div>
                        );
                      })()}

                    {/* Plan Header */}
                    <div className={`p-4 sm:p-5 ${isDeprecated ? 'bg-warning/5' : 'bg-muted/30'}`}>
                      {/* Plan name + badges — wrap on mobile */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {subscription.plan?.name || t('subscription.noPlanAssigned')}
                        </h3>
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Active
                              ? subscription.subscription.cancelAtPeriodEnd
                                ? 'bg-warning/15 text-warning'
                                : 'bg-success/15 text-success'
                              : subscription.subscription.subscriptionStatus ===
                                  SubscriptionStatus.Trialing
                                ? 'bg-info/15 text-info'
                                : subscription.subscription.subscriptionStatus ===
                                    SubscriptionStatus.Canceled
                                  ? 'bg-muted text-foreground'
                                  : 'bg-destructive/15 text-destructive'
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
                            <span className="text-xs text-muted-foreground">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {t('subscription.status.deprecated')}
                          </span>
                        )}
                      </div>

                      {subscription.plan?.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {subscription.plan.description}
                        </p>
                      )}

                      {/* Price + billing info — stack on mobile, side by side on desktop */}
                      {!isFreemiumPlan && (
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div>
                            <div className="flex items-baseline gap-1 whitespace-nowrap">
                              <span className="text-2xl font-bold text-foreground">
                                {formattedPrice || t('invoices.na')}
                              </span>
                              {formattedPrice &&
                                formattedPrice !== t('subscription.free') &&
                                intervalLabel && (
                                  <span className="text-sm text-muted-foreground">
                                    {intervalLabel}
                                  </span>
                                )}
                            </div>
                            {seatPricingConfig &&
                              perSeatPrice != null &&
                              perSeatPrice > 0 &&
                              !isPersonalMode && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {t('subscription.perSeatDisplay', {
                                    price: fmtCents(perSeatPrice, planCurrency),
                                    interval: intervalLabel,
                                  })}
                                </div>
                              )}
                            {/* Estimated total with seats — hidden in personal mode */}
                            {!isPersonalMode &&
                              seatPricingConfig &&
                              perSeatPrice != null &&
                              perSeatPrice > 0 &&
                              billableSeats > 0 &&
                              formattedPrice &&
                              formattedPrice !== t('subscription.free') &&
                              currentPrice != null && (
                                <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border">
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
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                        <p className="text-xs text-warning mt-2">
                          Version {currentVersion?.version || t('invoices.na')}
                        </p>
                      )}

                      {/* Actions: Manage Payment, Cancel/Resume */}
                      {!isFreemiumPlan &&
                        (showManagePayment ||
                          showCancel ||
                          subscription.subscription.cancelAtPeriodEnd) &&
                        (subscription.subscription.subscriptionStatus ===
                          SubscriptionStatus.Active ||
                          subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.Trialing ||
                          subscription.subscription.subscriptionStatus ===
                            SubscriptionStatus.PastDue) && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-border">
                            {showManagePayment &&
                              subscription.subscription &&
                              canManageBilling &&
                              subscription.subscription?.subscriptionId && (
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
                              subscription.subscription?.subscriptionId &&
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
                                  ) : !showCancel ? null : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
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
                      <div className="px-5 py-3 bg-destructive/10 border-t border-destructive/20">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-destructive">
                              {t('subscription.paymentPastDue')}
                            </p>
                            <p className="text-sm text-destructive mt-0.5">
                              {t('subscription.paymentPastDueDescription')}
                            </p>
                            {showInvoicesTab && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 border-destructive/20 text-destructive hover:bg-destructive/15"
                                onClick={() => setActiveTab('invoices')}
                              >
                                {t('subscription.viewInvoices')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dunning Banner (payment recovery in progress) */}
                    {subscription.subscription.subscriptionStatus === SubscriptionStatus.PastDue &&
                      subscription.subscription.dunningState &&
                      subscription.subscription.dunningState !== DunningState.None && (
                        <div className="px-5 py-3 bg-destructive/10 border-t border-destructive/20">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-destructive">
                                {subscription.subscription.dunningState === DunningState.Final
                                  ? t('subscription.dunningFinal')
                                  : subscription.subscription.dunningState ===
                                      DunningState.Suspended
                                    ? t('subscription.dunningSuspended')
                                    : t('subscription.dunningRecovery')}
                              </p>
                              <p className="text-sm text-destructive mt-0.5">
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
                      <div className="px-5 py-3 bg-info/10 border-t border-info/20">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-info">
                              {t('subscription.subscriptionPaused')}
                            </p>
                            <p className="text-sm text-info mt-0.5">
                              {t('subscription.subscriptionPausedDescription')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cancellation Warning Banner */}
                    {subscription.subscription.cancelAtPeriodEnd && (
                      <div className="px-5 py-3 bg-warning/10 border-t border-warning/30">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-warning">
                              {subscription.subscription.subscriptionStatus ===
                              SubscriptionStatus.Trialing
                                ? t('subscription.scheduledTrialCancellation')
                                : t('subscription.scheduledCancellation')}
                            </p>
                            <p className="text-sm text-warning mt-0.5">
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
                    {showPlanDetails &&
                      subscription.planVersion &&
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
                          <div className="px-4 py-4 sm:px-5 sm:py-5 border-t border-border/60">
                            <div className="space-y-5">
                              {/* Features */}
                              {planDetails.features.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
                                            className={`w-4 text-center shrink-0 ${enabled ? 'text-success' : 'text-muted-foreground/50'}`}
                                          >
                                            {enabled ? '✓' : '✕'}
                                          </span>
                                          <span
                                            className={
                                              enabled
                                                ? 'text-foreground'
                                                : 'text-muted-foreground/70'
                                            }
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
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {t('subscription.items.limits')}
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {planDetails.limits.map(({ item, value }) => (
                                      <li
                                        key={item._id}
                                        className="flex items-center justify-between text-sm"
                                      >
                                        <span className="text-muted-foreground">{item.name}</span>
                                        <span className="font-medium text-foreground">
                                          {fmtNum(value)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Quotas */}
                              {planDetails.quotas.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
                                            <span className="text-muted-foreground">
                                              {item.name}
                                            </span>
                                            <span className="font-medium text-foreground text-xs sm:text-sm">
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
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {t('subscription.seats.title')}
                                  </h4>
                                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        {t('subscription.seats.members')}
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {fmtNum(memberCount)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        {t('subscription.seats.included')}
                                      </span>
                                      <span className="text-foreground">
                                        {fmtNum(includedSeats)}
                                      </span>
                                    </div>
                                    {billableSeats > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          {t('subscription.seats.billable')}
                                        </span>
                                        <span className="font-medium text-warning">
                                          {fmtNum(billableSeats)} {t('subscription.seats.extra')}
                                        </span>
                                      </div>
                                    )}
                                    {perSeatPrice != null && perSeatPrice > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          {t('subscription.seats.perExtraSeat')}
                                        </span>
                                        <span className="text-foreground">
                                          {fmtCents(perSeatPrice, subscriptionCurrency)}
                                          {intervalLabel}
                                        </span>
                                      </div>
                                    )}
                                    {(seatPricingConfig?.maxSeats ?? 0) > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          {t('subscription.seats.limit')}
                                        </span>
                                        <span className="text-foreground">
                                          {fmtNum(seatPricingConfig!.maxSeats!)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Credits */}
                              {subscription.planVersion?.creditGrant?.enabled &&
                                typeof subscription.planVersion.creditGrant.creditPackage ===
                                  'object' &&
                                subscription.planVersion.creditGrant.creditPackage !== null && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                      {t('subscription.items.credits')}
                                    </h4>
                                    <div className="bg-info/10 rounded-lg p-3 space-y-1.5">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          {subscription.planVersion.creditGrant.renewOnPeriod
                                            ? t('subscription.items.creditsPerMonth')
                                            : t('subscription.items.creditsOneTime')}
                                        </span>
                                        <span className="font-semibold text-info">
                                          {fmtNum(
                                            typeof subscription.planVersion.creditGrant
                                              .creditPackage === 'object'
                                              ? subscription.planVersion.creditGrant.creditPackage
                                                  .creditAmount
                                              : 0
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          {t('subscription.items.creditRenewal')}
                                        </span>
                                        <span className="font-medium text-foreground">
                                          {!subscription.planVersion.creditGrant.renewOnPeriod
                                            ? t('subscription.items.creditModeLifetime')
                                            : subscription.planVersion.creditGrant.mode === 'reset'
                                              ? t('subscription.items.creditModeReset')
                                              : t('subscription.items.creditModeTopup')}
                                        </span>
                                      </div>
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
              <EmptyState
                icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
                title={t('subscription.noSubscription')}
                description={t('subscription.noSubscriptionDescription')}
                action={
                  showChangePlan && plansToShow && plansToShow.length > 0 ? (
                    <Button size="sm" onClick={() => setDialogOpen(true)}>
                      {t('subscription.viewPricingPlans')}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>

          {!planGroupVersions &&
            !loading &&
            (error ? (
              <StatusBanner
                variant="error"
                title={t('subscription.errorLoading')}
                message={error}
                actionLabel={t('settings.common.refreshAction', { loading: String(loading) })}
                onAction={refetch}
                actionDisabled={loading}
              />
            ) : (
              <EmptyState
                title={t('subscription.errorLoading')}
                description={t('subscription.noPlansAvailable')}
                action={
                  <Button variant="outline" size="sm" progress={loading} onClick={refetch}>
                    {t('settings.common.refreshAction', { loading: String(loading) })}
                  </Button>
                }
              />
            ))}
        </>
      )}

      {/* Invoices Tab Content */}
      {showInvoicesTab && activeTab === 'invoices' && (
        <>
          {loading && <LoadingState />}
          <WorkspaceSettingsInvoices
            workspaceId={workspaceId}
            hasActiveSubscription={subscription?.subscription != null}
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
              Array.isArray(workspace?.users) ? workspace.users.length : undefined
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
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
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
                    <span className="text-warning mt-0.5">•</span>
                    <span>{t('subscription.resumeContinue')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-info mt-0.5">ℹ</span>
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
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-success mt-0.5">✓</span>
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
                        <span className="text-success mt-0.5">✓</span>
                        <span>
                          {isTrialing
                            ? t('subscription.cancelTrialNoCharge')
                            : t('subscription.cancelNotCharged')}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-info mt-0.5">ℹ</span>
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
                  className="bg-destructive hover:bg-destructive/90 focus:ring-red-600"
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
