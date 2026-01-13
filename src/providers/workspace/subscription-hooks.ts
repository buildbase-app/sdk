import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IPlanGroupResponse,
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
 * @returns Plan group data and loading/error states
 */
export const usePlanGroup = (workspaceId: string | null | undefined) => {
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
      const data = await api.getPlanGroup(workspaceId);
      setPlanGroup(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plan group';
      setError(errorMessage);
      handleError(err, {
        component: 'usePlanGroup',
        action: 'fetchPlanGroup',
        metadata: { workspaceId },
      });
    } finally {
      setLoading(false);
    }
  }, [api, workspaceId]);

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
 * Hook to update subscription (upgrade/downgrade)
 * @param workspaceId - The workspace ID to update subscription for
 * @returns Update function and loading/error states
 */
export const useUpdateSubscription = (workspaceId: string | null | undefined) => {
  const os = useAppSelector(state => state.os);
  const api = useMemo(() => new WorkspaceApi(os), [os]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSubscription = useCallback(
    async (planVersionId: string): Promise<ISubscriptionUpdateResponse> => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      setLoading(true);
      setError(null);
      try {
        const result = await api.updateSubscription(workspaceId, planVersionId);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription';
        setError(errorMessage);
        handleError(err, {
          component: 'useUpdateSubscription',
          action: 'updateSubscription',
          metadata: { workspaceId, planVersionId },
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
 * @returns Combined subscription and plan group data with loading/error states
 */
export const useSubscriptionManagement = (workspaceId: string | null | undefined) => {
  const subscription = useSubscription(workspaceId);
  const planGroup = usePlanGroup(workspaceId);
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
