/**
 * Internal notifier for credit balance data invalidation.
 * When credits are consumed, purchased, or otherwise changed, call invalidateCreditBalance()
 * so CreditBalanceContextProvider refetches and gates stay in sync.
 */
import { createInvalidation } from './create-invalidation';

const manager = createInvalidation();

export const subscribeCreditBalanceInvalidate = manager.subscribe;
export const invalidateCreditBalance = manager.invalidate;
export const resetCreditBalanceInvalidation = manager.reset;
