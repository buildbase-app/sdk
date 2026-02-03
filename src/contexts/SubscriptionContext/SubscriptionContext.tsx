'use client';

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useSaaSWorkspaces } from '../../providers/workspace/hooks';
import { useSubscription } from '../../providers/workspace/subscription-hooks';
import { subscribeSubscriptionInvalidate } from './subscriptionInvalidation';
import type { SubscriptionContextValue } from './types';

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
SubscriptionContext.displayName = 'SubscriptionContext';

const CONTEXT_ERROR =
  'useSubscriptionContext must be used within SubscriptionContextProvider. Make sure SubscriptionContextProvider is wrapping your application (or the tree that uses subscription gates).';

/**
 * Provides subscription data for the current workspace to subscription gate components.
 * Fetches when workspace changes; refetches when subscription is invalidated (e.g. after plan change).
 * Must wrap (or be ancestor of) any component that uses WhenSubscription, WhenNoSubscription,
 * WhenSubscriptionToPlans, or useSubscriptionContext. Included in SaaSOSProvider by default.
 *
 * @param props - Component props
 * @param props.children - React tree that may use subscription gates or useSubscriptionContext
 * @returns Provider element that supplies subscription context to descendants
 */
export const SubscriptionContextProvider: React.FC<{ children: ReactNode }> = React.memo(
  function SubscriptionContextProvider({ children }) {
    const { currentWorkspace } = useSaaSWorkspaces();
    const { subscription: response, loading, refetch } = useSubscription(currentWorkspace?._id);

    useEffect(() => {
      return subscribeSubscriptionInvalidate(refetch);
    }, [refetch]);

    const value = useMemo<SubscriptionContextValue>(
      () => ({ response, loading, refetch }),
      [response, loading, refetch]
    );

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
  }
);

SubscriptionContextProvider.displayName = 'SubscriptionContextProvider';

/**
 * Returns subscription data for the current workspace. Must be used within SubscriptionContextProvider.
 *
 * @returns SubscriptionContextValue - { response, loading, refetch }
 * @throws Error if used outside SubscriptionContextProvider
 */
export function useSubscriptionContext(): SubscriptionContextValue {
  const value = useContext(SubscriptionContext);
  if (value === null) throw new Error(CONTEXT_ERROR);
  return value;
}
