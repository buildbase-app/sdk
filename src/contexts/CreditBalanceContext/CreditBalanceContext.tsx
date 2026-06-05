'use client';

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { subscribeCreditBalanceInvalidate } from '../../lib/credit-balance-invalidation';
import { useCreditBalance } from '../../providers/workspace/credit-hooks';
import { useAppSelector } from '../shared/useAppSelector';
import type { CreditBalanceContextValue } from './types';

const CreditBalanceCtx = createContext<CreditBalanceContextValue | null>(null);
CreditBalanceCtx.displayName = 'CreditBalanceContext';

const CONTEXT_ERROR =
  'useCreditBalanceContext must be used within CreditBalanceContextProvider. Make sure CreditBalanceContextProvider is wrapping your application (included in SaaSOSProvider by default).';

/**
 * Provides credit balance data for the current workspace to credit gate components.
 * Fetches when workspace changes; refetches when credit balance is invalidated
 * (e.g. after consume or purchase).
 * Included in SaaSOSProvider by default.
 */
export const CreditBalanceContextProvider: React.FC<{ children: ReactNode }> = React.memo(
  function CreditBalanceContextProvider({ children }) {
    const currentWorkspace = useAppSelector(state => state.workspaces.currentWorkspace);
    const { balance, loading, error, refetch } = useCreditBalance(currentWorkspace?._id);

    useEffect(() => {
      return subscribeCreditBalanceInvalidate(refetch);
    }, [refetch]);

    const value = useMemo<CreditBalanceContextValue>(
      () => ({ balance, loading, error, refetch }),
      [balance, loading, error, refetch]
    );

    return <CreditBalanceCtx.Provider value={value}>{children}</CreditBalanceCtx.Provider>;
  }
);

CreditBalanceContextProvider.displayName = 'CreditBalanceContextProvider';

/**
 * Returns credit balance data for the current workspace.
 * Must be used within CreditBalanceContextProvider (included in SaaSOSProvider by default).
 *
 * @returns CreditBalanceContextValue - { balance, loading, error, refetch }
 * @throws Error if used outside CreditBalanceContextProvider
 */
export function useCreditBalanceContext(): CreditBalanceContextValue {
  const value = useContext(CreditBalanceCtx);
  if (value === null) throw new Error(CONTEXT_ERROR);
  return value;
}
