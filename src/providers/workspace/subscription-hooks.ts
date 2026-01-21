import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BillingInterval,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IPlanGroupResponse,
  IPlanGroupVersionsResponse,
  ISubscriptionResponse,
  ISubscriptionUpdateResponse,
} from '../../api/types';
import { useAppSelector } from '../../contexts';
import { handleError } from '../../lib/error-handler';
import { WorkspaceApi } from './api';

/**
 * Hook to get and manage the current subscription for a workspace
 * @param workspaceId - The workspace ID to get subscription for
 * @returns Subscription data and loading/error states
 */
export const useSubscription = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os]);

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
 * Hook to get the plan group for a workspace
 * Returns the plan group containing the current plan if subscription exists,
 * otherwise returns the latest published group
 * @param workspaceId - The workspace ID to get plan group for
 * @param groupVersionId - Optional: specific group version ID to fetch
 * @returns Plan group data and loading/error states
 */
export const usePlanGroup = (
  workspaceId: string | null | undefined,
  groupVersionId?: string | null
) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os]);

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
 * Hook to get all available versions of a plan group for a workspace
 * @param workspaceId - The workspace ID to get plan group versions for
 * @returns Plan group versions data and loading/error states
 */
export const usePlanGroupVersions = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os]);

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
 * Hook to create checkout session for new subscription
 * @param workspaceId - The workspace ID to create checkout session for
 * @returns Create checkout function and loading/error states
 */
export const useCreateCheckoutSession = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os]);

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
 * Hook to update subscription (upgrade/downgrade)
 * Returns checkout session if payment is required, otherwise returns subscription update response
 * @param workspaceId - The workspace ID to update subscription for
 * @returns Update function and loading/error states
 */
export const useUpdateSubscription = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os]);

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
 * Combined hook that provides both subscription and plan group data
 * Useful for subscription management pages
 * @param workspaceId - The workspace ID
 * @param groupVersionId - Optional: specific group version ID to fetch
 * @returns Combined subscription and plan group data with loading/error states
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
