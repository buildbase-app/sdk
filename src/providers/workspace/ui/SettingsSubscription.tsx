import { AlertTriangle, Calendar, CreditCard, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getPerSeatPriceCents,
  getSeatPricing,
  getStripePriceIdForInterval,
} from '../../../api/billing/pricing-variant-utils';
import {
  BillingInterval,
  BillingIntervals,
  CheckoutResult,
  DunningState,
  ICheckoutSessionResponse,
  IPlanGroupVersionWithPlans,
  ISubscriptionUpdateResponse,
  SubscriptionStatus,
} from '../../../api/types';
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
import NoPermission from './NoPermission';
import WorkspaceSettingsInvoices from './SettingsInvoices';
import SettingSkeleton from './Skeleton';
import { formatPeriodEndDate } from './subscription/format';
import { PlanDetailsSection } from './subscription/PlanDetailsSection';
import {
  CancelSubscriptionDialog,
  ResumeSubscriptionDialog,
} from './subscription/SubscriptionDialogs';
import { SubscriptionNoticeBanner } from './subscription/SubscriptionNoticeBanner';
import { SubscriptionStatusBadge } from './subscription/SubscriptionStatusBadge';
import { TrialBanner } from './subscription/TrialBanner';
import { useTransientStatus } from './useTransientStatus';
// Lazy load SubscriptionDialog to reduce bundle size
// This component is only rendered when subscription dialog is opened
import { lazy, Suspense } from 'react';
const SubscriptionDialog = lazy(() =>
  import('./SubscriptionDialog').then(m => ({ default: m.default }))
);

const WorkspaceSettingsSubscription: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const workspaceId = workspace._id?.toString();
  const { t, formattingLocale, fmtCents } = useTranslation();
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
      // Only show deprecation if user has subscription AND there's a newer version
      isDeprecated: hasNewer && hasActiveSubscription,
      plansToShow: plans,
    };
  }, [planGroupVersions, subscription?.subscription]);

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const scheduleMessageClear = useTransientStatus();
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
      scheduleMessageClear(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      });
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
      scheduleMessageClear(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      });
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
      scheduleMessageClear(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      });
    }
  };

  if (!canViewBilling) return <NoPermission />;

  if (loading && !subscription && !planGroupVersions) {
    return <SettingSkeleton />;
  }

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
          <nav
            className="-mb-px flex gap-6"
            role="tablist"
            aria-label={t('subscription.tabsLabel')}
            onKeyDown={e => {
              if (
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight' ||
                e.key === 'Home' ||
                e.key === 'End'
              ) {
                e.preventDefault();
                setActiveTab(
                  e.key === 'ArrowLeft' || e.key === 'End' ? 'invoices' : 'subscription'
                );
              }
            }}
          >
            <button
              type="button"
              role="tab"
              id="subscription-tab-subscription"
              aria-controls="subscription-panel-subscription"
              aria-selected={activeTab === 'subscription'}
              tabIndex={activeTab === 'subscription' ? 0 : -1}
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
              id="subscription-tab-invoices"
              aria-controls="subscription-panel-invoices"
              aria-selected={activeTab === 'invoices'}
              tabIndex={activeTab === 'invoices' ? 0 : -1}
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
        <div
          id="subscription-panel-subscription"
          role="tabpanel"
          aria-labelledby="subscription-tab-subscription"
          tabIndex={0}
        >
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
                      !subscription.subscription.cancelAtPeriodEnd && (
                        <TrialBanner
                          subscription={subscription.subscription}
                          showChangePlan={showChangePlan}
                          setDialogOpen={setDialogOpen}
                        />
                      )}

                    {/* Plan Header */}
                    <div className={`p-4 sm:p-5 ${isDeprecated ? 'bg-warning/5' : 'bg-muted/30'}`}>
                      {/* Plan name + badges — wrap on mobile */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {subscription.plan?.name || t('subscription.noPlanAssigned')}
                        </h3>
                        {/* Status Badge */}
                        <SubscriptionStatusBadge subscription={subscription.subscription} />
                        {subscription.subscription.subscriptionStatus ===
                          SubscriptionStatus.Trialing &&
                          formatPeriodEndDate(
                            formattingLocale,
                            subscription.subscription.trialEnd ||
                              subscription.subscription.stripeCurrentPeriodEnd
                          ) && (
                            <span className="text-xs text-muted-foreground">
                              {t('subscription.endsOn', {
                                date: formatPeriodEndDate(
                                  formattingLocale,
                                  subscription.subscription.trialEnd ||
                                    subscription.subscription.stripeCurrentPeriodEnd
                                ),
                              })}
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
                          {t('subscription.versionLabel', {
                            version: currentVersion?.version || t('invoices.na'),
                          })}
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
                      <SubscriptionNoticeBanner
                        className="px-5 py-3 bg-destructive/10 border-t border-destructive/20"
                        icon={
                          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        }
                        titleClassName="text-sm font-medium text-destructive"
                        title={t('subscription.paymentPastDue')}
                        descriptionClassName="text-sm text-destructive mt-0.5"
                        description={t('subscription.paymentPastDueDescription')}
                      >
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
                      </SubscriptionNoticeBanner>
                    )}

                    {/* Dunning Banner (payment recovery in progress) */}
                    {subscription.subscription.subscriptionStatus === SubscriptionStatus.PastDue &&
                      subscription.subscription.dunningState &&
                      subscription.subscription.dunningState !== DunningState.None && (
                        <SubscriptionNoticeBanner
                          className="px-5 py-3 bg-destructive/10 border-t border-destructive/20"
                          icon={
                            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          }
                          titleClassName="text-sm font-medium text-destructive"
                          title={
                            subscription.subscription.dunningState === DunningState.Final
                              ? t('subscription.dunningFinal')
                              : subscription.subscription.dunningState === DunningState.Suspended
                                ? t('subscription.dunningSuspended')
                                : t('subscription.dunningRecovery')
                          }
                          descriptionClassName="text-sm text-destructive mt-0.5"
                          description={
                            subscription.subscription.dunningState === DunningState.Suspended
                              ? t('subscription.dunningSuspendedDescription')
                              : t('subscription.dunningRecoveryDescription')
                          }
                        />
                      )}

                    {/* Paused Banner */}
                    {subscription.subscription.subscriptionStatus === SubscriptionStatus.Paused && (
                      <SubscriptionNoticeBanner
                        className="px-5 py-3 bg-info/10 border-t border-info/20"
                        icon={<Calendar className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />}
                        titleClassName="text-sm font-medium text-info"
                        title={t('subscription.subscriptionPaused')}
                        descriptionClassName="text-sm text-info mt-0.5"
                        description={t('subscription.subscriptionPausedDescription')}
                      />
                    )}

                    {/* Cancellation Warning Banner */}
                    {subscription.subscription.cancelAtPeriodEnd && (
                      <SubscriptionNoticeBanner
                        className="px-5 py-3 bg-warning/10 border-t border-warning/30"
                        icon={<Calendar className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />}
                        titleClassName="text-sm font-medium text-warning"
                        title={
                          subscription.subscription.subscriptionStatus ===
                          SubscriptionStatus.Trialing
                            ? t('subscription.scheduledTrialCancellation')
                            : t('subscription.scheduledCancellation')
                        }
                        descriptionClassName="text-sm text-warning mt-0.5"
                        description={
                          formatPeriodEndDate(
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
                          )
                        }
                      />
                    )}

                    {/* Plan Details */}
                    {showPlanDetails && subscription.planVersion && (
                      <PlanDetailsSection
                        planVersion={subscription.planVersion}
                        subscriptionCurrency={subscriptionCurrency}
                        billingInterval={billingInterval}
                        seatPricingConfig={seatPricingConfig}
                        isPersonalMode={isPersonalMode}
                        memberCount={memberCount}
                        includedSeats={includedSeats}
                        billableSeats={billableSeats}
                        perSeatPrice={perSeatPrice}
                        intervalLabel={intervalLabel}
                      />
                    )}
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

          {!planGroupVersions && !loading && !error && (
            <EmptyState
              title={t('subscription.errorLoading')}
              description={t('subscription.noPlansAvailable')}
              action={
                <Button variant="outline" size="sm" progress={loading} onClick={refetch}>
                  {t('settings.common.refreshAction', { loading: String(loading) })}
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Invoices Tab Content */}
      {showInvoicesTab && activeTab === 'invoices' && (
        <div
          id="subscription-panel-invoices"
          role="tabpanel"
          aria-labelledby="subscription-tab-invoices"
          tabIndex={0}
        >
          {loading && <LoadingState />}
          <WorkspaceSettingsInvoices
            workspaceId={workspaceId}
            hasActiveSubscription={subscription?.subscription != null}
            onViewPricingPlans={() => setActiveTab('subscription')}
            limit={20}
          />
        </div>
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
      <ResumeSubscriptionDialog
        resumeDialogOpen={resumeDialogOpen}
        setResumeDialogOpen={setResumeDialogOpen}
        resumeLoading={resumeLoading}
        handleResumeSubscription={handleResumeSubscription}
        subscription={subscription}
      />

      {/* Cancel Subscription Confirmation Dialog */}
      <CancelSubscriptionDialog
        cancelDialogOpen={cancelDialogOpen}
        setCancelDialogOpen={setCancelDialogOpen}
        cancelLoading={cancelLoading}
        handleCancelSubscription={handleCancelSubscription}
        subscription={subscription}
      />
    </div>
  );
};

export default WorkspaceSettingsSubscription;
