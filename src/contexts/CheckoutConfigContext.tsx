'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import type { GetCheckoutStripeParams } from '../api/types';

interface CheckoutConfigContextValue {
  getCheckoutStripeParams?: GetCheckoutStripeParams;
}

const CheckoutConfigContext = createContext<CheckoutConfigContextValue>({});
CheckoutConfigContext.displayName = 'CheckoutConfigContext';

export const CheckoutConfigProvider: React.FC<{
  getCheckoutStripeParams?: GetCheckoutStripeParams;
  children: ReactNode;
}> = React.memo(({ getCheckoutStripeParams, children }) => {
  const value = React.useMemo(
    () => ({ getCheckoutStripeParams }),
    [getCheckoutStripeParams]
  );
  return (
    <CheckoutConfigContext.Provider value={value}>{children}</CheckoutConfigContext.Provider>
  );
});

CheckoutConfigProvider.displayName = 'CheckoutConfigProvider';

/**
 * Returns the checkout config provided via SaaSOSProvider.
 * Safe to call outside provider — returns empty object.
 */
export function useCheckoutConfig(): CheckoutConfigContextValue {
  return useContext(CheckoutConfigContext);
}
