/**
 * Internal notifier for subscription data invalidation.
 * When subscription is updated (plan change, cancel, resume), call invalidateSubscription()
 * so SubscriptionContextProvider refetches and gates stay in sync.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Subscribe a refetch callback to be called when subscription is invalidated.
 *
 * @param fn - Callback (e.g. refetch) to run when invalidateSubscription() is called
 * @returns Unsubscribe function to remove the callback
 */
export function subscribeSubscriptionInvalidate(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Notify all subscribers to refetch subscription (e.g. after update/cancel/resume).
 * Called internally by useUpdateSubscription, useCancelSubscription, useResumeSubscription on success.
 */
export function invalidateSubscription(): void {
  listeners.forEach(fn => fn());
}

/** Reset all listeners. Intended for test cleanup. */
export function resetSubscriptionInvalidation(): void {
  listeners.clear();
}
