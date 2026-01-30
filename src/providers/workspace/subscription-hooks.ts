import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BillingInterval,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IInvoice,
  IPublicPlansResponse,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionsResponse,
  ISubscriptionResponse,
  ISubscriptionUpdateResponse,
} from '../../api/types';
import { useAppSelector } from '../../contexts';
import { handleError } from '../../lib/error-handler';
import { WorkspaceApi } from './api';

/**
 * Hook to get public plans by slug (no auth required).
 * Returns items (features, limits, quotas) and plans (with pricing).
 * Uses orgId from SaaSOSProvider - must be inside provider.
 *
 * @param slug - Plan group slug (e.g. 'main-pricing', 'enterprise')
 * @returns { items, plans, loading, error, refetch }
 */
export const usePublicPlans = (slug: string) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);
  const isConfigReady = Boolean(os.serverUrl && os.version && os.orgId);

  const [data, setData] = useState<IPublicPlansResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!slug || !isConfigReady) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.getPublicPlans(slug);
      setData(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch plans';
      setError(errorMessage);
      handleError(err, {
        component: 'usePublicPlans',
        action: 'fetchPlans',
        metadata: { slug },
      });
    } finally {
      setLoading(false);
    }
  }, [api, slug, isConfigReady]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Show loading when waiting for SDK config (SaaSOSProvider) or when fetching
  const isLoading = (slug && !isConfigReady) || loading;

  return {
    items: data?.items ?? [],
    plans: data?.plans ?? [],
    loading: isLoading,
    error,
    refetch: fetchPlans,
  };
};

/**
 * Hook to get a single plan group version by ID (no auth required).
 * Use this for public pricing pages when you have the groupVersionId (e.g. from config or URL).
 *
 * @param groupVersionId - The plan group version ID to fetch. Pass null/undefined to disable fetching.
 * @returns An object containing:
 * - `planGroupVersion`: Plan group version data (null if not loaded)
 * - `loading`: Boolean indicating if data is being fetched
 * - `error`: Error message string (null if no error)
 * - `refetch()`: Function to manually refetch
 *
 * @example
 * ```tsx
 * function PublicPricingPage() {
 *   const groupVersionId = 'your-plan-group-version-id'; // from config or URL
 *   const { planGroupVersion, loading } = usePublicPlanGroupVersion(groupVersionId);
 *
 *   if (loading) return <Loading />;
 *   if (!planGroupVersion) return null;
 *
 *   const plans = Array.isArray(planGroupVersion.planVersionIds)
 *     ? planGroupVersion.planVersionIds.filter((p): p is IPlanVersionWithPlan => typeof p !== 'string')
 *     : [];
 *
 *   return (
 *     <div>
 *       {plans.map(plan => <PlanCard key={plan._id} plan={plan} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export const usePublicPlanGroupVersion = (groupVersionId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [planGroupVersion, setPlanGroupVersion] = useState<IPlanGroupVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersion = useCallback(async () => {
    if (!groupVersionId) {
      setPlanGroupVersion(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getPlanGroupVersion(groupVersionId);
      setPlanGroupVersion(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch plan group version';
      setError(errorMessage);
      handleError(err, {
        component: 'usePublicPlanGroupVersion',
        action: 'fetchVersion',
        metadata: { groupVersionId },
      });
    } finally {
      setLoading(false);
    }
  }, [api, groupVersionId]);

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  return {
    planGroupVersion,
    loading,
    error,
    refetch: fetchVersion,
  };
};

/**
 * Hook to get and manage the current subscription for a workspace.
 * Automatically fetches subscription when workspaceId changes.
 *
 * @param workspaceId - The workspace ID to get subscription for. Can be null/undefined to disable fetching.
 * @returns An object containing:
 * - `subscription`: Current subscription data (null if no subscription or not loaded)
 * - `loading`: Boolean indicating if subscription is being fetched
 * - `error`: Error message string (null if no error)
 * - `refetch()`: Function to manually refetch the subscription
 *
 * @example
 * ```tsx
 * function SubscriptionStatus() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { subscription, loading, error } = useSubscription(currentWorkspace?._id);
 *
 *   if (loading) return <Loading />;
 *   if (error) return <Error message={error} />;
 *   if (!subscription) return <p>No active subscription</p>;
 *
 *   return <p>Plan: {subscription.plan.name}</p>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Edge case: Workspace ID changes
 * function SubscriptionComponent({ workspaceId }) {
 *   const { subscription, refetch } = useSubscription(workspaceId);
 *
 *   // Subscription automatically refetches when workspaceId changes
 *   // Use refetch() to manually refresh after mutations
 *   return <SubscriptionDetails subscription={subscription} />;
 * }
 * ```
 */
export const useSubscription = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [subscription, setSubscription] = useState<ISubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!workspaceId) {
      setSubscription(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getCurrentSubscription(workspaceId);
      setSubscription(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(errorMessage);
      handleError(err, {
        component: 'useSubscription',
        action: 'fetchSubscription',
        metadata: { workspaceId },
      });
    } finally {
      setLoading(false);
    }
  }, [api, workspaceId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
  };
};

/**
 * Hook to get the plan group for a workspace.
 * Returns the plan group containing the current plan if subscription exists,
 * otherwise returns the latest published group.
 * Automatically fetches when workspaceId or groupVersionId changes.
 *
 * @param workspaceId - The workspace ID to get plan group for. Can be null/undefined to disable fetching.
 * @param groupVersionId - Optional: specific group version ID to fetch (for viewing historical versions)
 * @returns An object containing:
 * - `planGroup`: Plan group data (null if not loaded)
 * - `loading`: Boolean indicating if plan group is being fetched
 * - `error`: Error message string (null if no error)
 * - `refetch()`: Function to manually refetch the plan group
 *
 * @example
 * ```tsx
 * function PlanGroupDisplay() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { planGroup, loading } = usePlanGroup(currentWorkspace?._id);
 *
 *   if (loading) return <Loading />;
 *   if (!planGroup) return <p>No plan group available</p>;
 *
 *   return (
 *     <div>
 *       <h3>{planGroup.name}</h3>
 *       {planGroup.plans.map(plan => (
 *         <PlanCard key={plan._id} plan={plan} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Fetch specific version for comparison
 * function PlanVersionComparison() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const current = usePlanGroup(currentWorkspace?._id);
 *   const previous = usePlanGroup(currentWorkspace?._id, 'previous-version-id');
 *
 *   return <ComparePlans current={current.planGroup} previous={previous.planGroup} />;
 * }
 * ```
 */
export const usePlanGroup = (
  workspaceId: string | null | undefined,
  groupVersionId?: string | null
) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [planGroup, setPlanGroup] = useState<IPlanGroupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanGroup = useCallback(async () => {
    if (!workspaceId) {
      setPlanGroup(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = groupVersionId
        ? await api.getPlanGroupByVersion(workspaceId, groupVersionId)
        : await api.getPlanGroup(workspaceId);
      setPlanGroup(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plan group';
      setError(errorMessage);
      handleError(err, {
        component: 'usePlanGroup',
        action: 'fetchPlanGroup',
        metadata: { workspaceId, groupVersionId },
      });
    } finally {
      setLoading(false);
    }
  }, [api, workspaceId, groupVersionId]);

  useEffect(() => {
    fetchPlanGroup();
  }, [fetchPlanGroup]);

  return {
    planGroup,
    loading,
    error,
    refetch: fetchPlanGroup,
  };
};

/**
 * Hook to get all available versions of a plan group for a workspace.
 * Shows current version and available newer versions for upgrade paths.
 * Automatically fetches when workspaceId changes.
 *
 * @param workspaceId - The workspace ID to get plan group versions for. Can be null/undefined to disable fetching.
 * @returns An object containing:
 * - `versions`: Plan group versions response with currentVersion and availableVersions
 * - `loading`: Boolean indicating if versions are being fetched
 * - `error`: Error message string (null if no error)
 * - `refetch()`: Function to manually refetch the versions
 *
 * @example
 * ```tsx
 * function UpgradeOptions() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { versions, loading } = usePlanGroupVersions(currentWorkspace?._id);
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <p>Current: {versions?.currentVersion.name}</p>
 *       <h4>Available Upgrades:</h4>
 *       {versions?.availableVersions.map(version => (
 *         <UpgradeCard key={version._id} version={version} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const usePlanGroupVersions = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [versions, setVersions] = useState<IPlanGroupVersionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!workspaceId) {
      setVersions(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getPlanGroupVersions(workspaceId);
      setVersions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plan group versions';
      setError(errorMessage);
      handleError(err, {
        component: 'usePlanGroupVersions',
        action: 'fetchVersions',
        metadata: { workspaceId },
      });
    } finally {
      setLoading(false);
    }
  }, [api, workspaceId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return {
    versions,
    loading,
    error,
    refetch: fetchVersions,
  };
};

/**
 * Hook to create a checkout session for a new subscription.
 * Returns a function to initiate the checkout process.
 *
 * @param workspaceId - The workspace ID to create checkout session for. Can be null/undefined.
 * @returns An object containing:
 * - `createCheckoutSession(request)`: Function to create checkout session (throws if workspaceId is null)
 * - `loading`: Boolean indicating if checkout session is being created
 * - `error`: Error message string (null if no error)
 *
 * @example
 * ```tsx
 * function SubscribeButton({ planVersionId }) {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { createCheckoutSession, loading } = useCreateCheckoutSession(currentWorkspace?._id);
 *
 *   const handleSubscribe = async () => {
 *     try {
 *       const result = await createCheckoutSession({
 *         planVersionId,
 *         successUrl: window.location.href,
 *         cancelUrl: window.location.href,
 *       });
 *       // Redirect to checkout
 *       window.location.href = result.checkoutUrl;
 *     } catch (error) {
 *       console.error('Failed to create checkout:', error);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleSubscribe} disabled={loading}>
 *       {loading ? 'Loading...' : 'Subscribe'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Edge case: Workspace ID not available
 * function SubscribeButton() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { createCheckoutSession } = useCreateCheckoutSession(currentWorkspace?._id);
 *
 *   const handleSubscribe = async () => {
 *     try {
 *       await createCheckoutSession({ planVersionId: 'plan-123' });
 *     } catch (error) {
 *       // Error: "Workspace ID is required"
 *       alert('Please select a workspace first');
 *     }
 *   };
 *
 *   return <button onClick={handleSubscribe}>Subscribe</button>;
 * }
 * ```
 */
export const useCreateCheckoutSession = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = useCallback(
    async (
      request: ICheckoutSessionRequest
    ): Promise<ICheckoutSessionResponse> => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      setLoading(true);
      setError(null);
      try {
        const result = await api.createCheckoutSession(workspaceId, request);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create checkout session';
        setError(errorMessage);
        handleError(err, {
          component: 'useCreateCheckoutSession',
          action: 'createCheckoutSession',
          metadata: { workspaceId, request },
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api, workspaceId]
  );

  return {
    createCheckoutSession,
    loading,
    error,
  };
};

/**
 * Hook to update subscription (upgrade/downgrade).
 * Returns checkout session if payment is required, otherwise returns subscription update response.
 *
 * @param workspaceId - The workspace ID to update subscription for. Can be null/undefined.
 * @returns An object containing:
 * - `updateSubscription(planVersionId, options?)`: Function to update subscription (throws if workspaceId is null)
 * - `loading`: Boolean indicating if subscription is being updated
 * - `error`: Error message string (null if no error)
 *
 * @example
 * ```tsx
 * function UpgradeButton({ planVersionId }) {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { updateSubscription, loading } = useUpdateSubscription(currentWorkspace?._id);
 *
 *   const handleUpgrade = async () => {
 *     try {
 *       const result = await updateSubscription(planVersionId, {
 *         billingInterval: 'monthly',
 *         successUrl: window.location.href,
 *         cancelUrl: window.location.href,
 *       });
 *
 *       // Check if payment is required
 *       if ('checkoutUrl' in result) {
 *         window.location.href = result.checkoutUrl;
 *       } else {
 *         // Subscription updated without payment
 *         alert('Subscription updated successfully!');
 *       }
 *     } catch (error) {
 *       console.error('Failed to update subscription:', error);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleUpgrade} disabled={loading}>
 *       {loading ? 'Upgrading...' : 'Upgrade'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Handle both checkout and direct update responses
 * function SubscriptionUpdater({ planVersionId }) {
 *   const { updateSubscription } = useUpdateSubscription(workspaceId);
 *
 *   const handleUpdate = async () => {
 *     const result = await updateSubscription(planVersionId);
 *
 *     // Type guard to check response type
 *     if ('checkoutUrl' in result) {
 *       // Redirect to payment
 *       window.location.href = result.checkoutUrl;
 *     } else {
 *       // Direct update successful
 *       console.log('Updated subscription:', result.subscription);
 *     }
 *   };
 *
 *   return <button onClick={handleUpdate}>Update</button>;
 * }
 * ```
 */
export const useUpdateSubscription = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSubscription = useCallback(
    async (
      planVersionId: string,
      options?: {
        billingInterval?: BillingInterval;
        successUrl?: string;
        cancelUrl?: string;
      }
    ): Promise<ISubscriptionUpdateResponse | ICheckoutSessionResponse> => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      setLoading(true);
      setError(null);
      try {
        const request = {
          planVersionId,
          ...(options?.billingInterval && { billingInterval: options.billingInterval }),
          ...(options?.successUrl && { successUrl: options.successUrl }),
          ...(options?.cancelUrl && { cancelUrl: options.cancelUrl }),
        };
        const result = await api.updateSubscription(workspaceId, request);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription';
        setError(errorMessage);
        handleError(err, {
          component: 'useUpdateSubscription',
          action: 'updateSubscription',
          metadata: { workspaceId, planVersionId, options },
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api, workspaceId]
  );

  return {
    updateSubscription,
    loading,
    error,
  };
};

/**
 * Combined hook that provides both subscription and plan group data.
 * Useful for subscription management pages that need both pieces of data.
 * Combines useSubscription, usePlanGroup, and useUpdateSubscription.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined to disable fetching.
 * @param groupVersionId - Optional: specific group version ID to fetch
 * @returns An object containing:
 * - `subscription`: Current subscription data (from useSubscription)
 * - `planGroup`: Plan group data (from usePlanGroup)
 * - `loading`: Boolean indicating if any operation is in progress
 * - `error`: Error message string (null if no error)
 * - `updateSubscription(planVersionId, options?)`: Function to update subscription
 * - `refetch()`: Function to refetch both subscription and plan group
 *
 * @example
 * ```tsx
 * function SubscriptionManagementPage() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const {
 *     subscription,
 *     planGroup,
 *     loading,
 *     updateSubscription,
 *     refetch,
 *   } = useSubscriptionManagement(currentWorkspace?._id);
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <CurrentPlan subscription={subscription} />
 *       <AvailablePlans planGroup={planGroup} onSelect={updateSubscription} />
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useSubscriptionManagement = (
  workspaceId: string | null | undefined,
  groupVersionId?: string | null
) => {
  const subscription = useSubscription(workspaceId);
  const planGroup = usePlanGroup(workspaceId, groupVersionId);
  const updateSubscription = useUpdateSubscription(workspaceId);

  const refetchAll = useCallback(async () => {
    await Promise.all([subscription.refetch(), planGroup.refetch()]);
  }, [subscription, planGroup]);

  return {
    subscription: subscription.subscription,
    planGroup: planGroup.planGroup,
    loading: subscription.loading || planGroup.loading || updateSubscription.loading,
    error: subscription.error || planGroup.error || updateSubscription.error,
    updateSubscription: updateSubscription.updateSubscription,
    refetch: refetchAll,
  };
};

/**
 * Hook to list invoices for a workspace subscription with pagination support.
 * Automatically fetches when workspaceId, limit, or startingAfter changes.
 *
 * @param workspaceId - The workspace ID to get invoices for. Can be null/undefined to disable fetching.
 * @param limit - Number of invoices to return (default: 10)
 * @param startingAfter - Invoice ID to start after (for pagination)
 * @returns An object containing:
 * - `invoices`: Array of invoice objects
 * - `hasMore`: Boolean indicating if there are more invoices to load
 * - `loading`: Boolean indicating if invoices are being fetched
 * - `error`: Error message string (null if no error)
 * - `refetch()`: Function to manually refetch invoices
 *
 * @example
 * ```tsx
 * function InvoiceList() {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { invoices, hasMore, loading, refetch } = useInvoices(currentWorkspace?._id, 10);
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {invoices.map(invoice => (
 *         <InvoiceCard key={invoice._id} invoice={invoice} />
 *       ))}
 *       {hasMore && <button onClick={() => refetch()}>Load More</button>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Pagination example
 * function PaginatedInvoices() {
 *   const [lastInvoiceId, setLastInvoiceId] = useState<string | undefined>();
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { invoices, hasMore, refetch } = useInvoices(
 *     currentWorkspace?._id,
 *     10,
 *     lastInvoiceId
 *   );
 *
 *   const loadMore = () => {
 *     if (invoices.length > 0) {
 *       setLastInvoiceId(invoices[invoices.length - 1]._id);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {invoices.map(invoice => <InvoiceCard key={invoice._id} invoice={invoice} />)}
 *       {hasMore && <button onClick={loadMore}>Load More</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export const useInvoices = (
  workspaceId: string | null | undefined,
  limit: number = 10,
  startingAfter?: string
) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!workspaceId) {
      setInvoices([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.listInvoices(workspaceId, limit, startingAfter);
      setInvoices(data.invoices || []);
      setHasMore(data.has_more || false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invoices';
      setError(errorMessage);
      handleError(err, {
        component: 'useInvoices',
        action: 'fetchInvoices',
        metadata: { workspaceId, limit, startingAfter },
      });
    } finally {
      setLoading(false);
    }
  }, [api, workspaceId, limit, startingAfter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    hasMore,
    loading,
    error,
    refetch: fetchInvoices,
  };
};

/**
 * Hook to get a single invoice by ID.
 * Automatically fetches when workspaceId or invoiceId changes.
 *
 * @param workspaceId - The workspace ID. Can be null/undefined to disable fetching.
 * @param invoiceId - The invoice ID to fetch. Can be null/undefined to disable fetching.
 * @returns An object containing:
 * - `invoice`: Invoice data object (null if not loaded)
 * - `loading`: Boolean indicating if invoice is being fetched
 * - `error`: Error message string (null if no error)
 * - `refetch()`: Function to manually refetch the invoice
 *
 * @example
 * ```tsx
 * function InvoiceDetails({ invoiceId }) {
 *   const { currentWorkspace } = useSaaSWorkspaces();
 *   const { invoice, loading, error } = useInvoice(currentWorkspace?._id, invoiceId);
 *
 *   if (loading) return <Loading />;
 *   if (error) return <Error message={error} />;
 *   if (!invoice) return <p>Invoice not found</p>;
 *
 *   return (
 *     <div>
 *       <h2>Invoice #{invoice.invoiceNumber}</h2>
 *       <p>Amount: ${invoice.amount}</p>
 *       <p>Status: {invoice.status}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export const useInvoice = (
  workspaceId: string | null | undefined,
  invoiceId: string | null | undefined
) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os.serverUrl, os.version, os.orgId]);

  const [invoice, setInvoice] = useState<IInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!workspaceId || !invoiceId) {
      setInvoice(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoice(workspaceId, invoiceId);
      setInvoice(data.invoice);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invoice';
      setError(errorMessage);
      handleError(err, {
        component: 'useInvoice',
        action: 'fetchInvoice',
        metadata: { workspaceId, invoiceId },
      });
    } finally {
      setLoading(false);
    }
  }, [api, workspaceId, invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  return {
    invoice,
    loading,
    error,
    refetch: fetchInvoice,
  };
};
