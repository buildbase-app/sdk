/**
 * Internal notifier for credit balance data invalidation.
 * When credits are consumed, purchased, or otherwise changed, call invalidateCreditBalance()
 * so CreditBalanceContextProvider refetches and gates stay in sync.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Subscribe a refetch callback to be called when credit balance is invalidated.
 *
 * @param fn - Callback (e.g. refetch) to run when invalidateCreditBalance() is called
 * @returns Unsubscribe function to remove the callback
 */
export function subscribeCreditBalanceInvalidate(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Notify all subscribers to refetch credit balance (e.g. after consume or purchase).
 * Called internally by useConsumeCredits, usePurchaseCredits on success.
 */
export function invalidateCreditBalance(): void {
  listeners.forEach(fn => fn());
}

/** Reset all listeners. Intended for test cleanup. */
export function resetCreditBalanceInvalidation(): void {
  listeners.clear();
}
