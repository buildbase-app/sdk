'use client';

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAllQuotaUsage } from '../../providers/workspace/subscription-hooks';
import { useAppSelector } from '../shared/useAppSelector';
import { subscribeQuotaUsageInvalidate } from './quotaUsageInvalidation';
import type { QuotaUsageContextValue } from './types';

const QuotaUsageContext = createContext<QuotaUsageContextValue | null>(null);
QuotaUsageContext.displayName = 'QuotaUsageContext';

const CONTEXT_ERROR =
  'useQuotaUsageContext must be used within QuotaUsageContextProvider. Make sure QuotaUsageContextProvider is wrapping your application (or the tree that uses quota gates).';

/**
 * Provides quota usage data for the current workspace to quota gate components.
 * Fetches when workspace changes; refetches when quota usage is invalidated (e.g. after recording usage).
 * Must wrap (or be ancestor of) any component that uses WhenQuotaAvailable, WhenQuotaExhausted,
 * WhenQuotaOverage, WhenQuotaThreshold, or useQuotaUsageContext. Included in SaaSOSProvider by default.
 *
 * @param props - Component props
 * @param props.children - React tree that may use quota gates or useQuotaUsageContext
 * @returns Provider element that supplies quota usage context to descendants
 */
export const QuotaUsageContextProvider: React.FC<{ children: ReactNode }> = React.memo(
  function QuotaUsageContextProvider({ children }) {
    // Read workspace directly from context (not from useSaaSWorkspaces) to avoid circular dependency
    const currentWorkspace = useAppSelector(state => state.workspaces.currentWorkspace);
    const { quotas, loading, error, refetch } = useAllQuotaUsage(currentWorkspace?._id);

    useEffect(() => {
      return subscribeQuotaUsageInvalidate(refetch);
    }, [refetch]);

    const value = useMemo<QuotaUsageContextValue>(
      () => ({ quotas, loading, error, refetch }),
      [quotas, loading, error, refetch]
    );

    return <QuotaUsageContext.Provider value={value}>{children}</QuotaUsageContext.Provider>;
  }
);

QuotaUsageContextProvider.displayName = 'QuotaUsageContextProvider';

/**
 * Returns quota usage data for the current workspace. Must be used within QuotaUsageContextProvider.
 *
 * @returns QuotaUsageContextValue - { quotas, loading, refetch }
 * @throws Error if used outside QuotaUsageContextProvider
 */
export function useQuotaUsageContext(): QuotaUsageContextValue {
  const value = useContext(QuotaUsageContext);
  if (value === null) throw new Error(CONTEXT_ERROR);
  return value;
}
