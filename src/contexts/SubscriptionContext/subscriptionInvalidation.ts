/**
 * Internal notifier for subscription data invalidation.
 * When subscription is updated (plan change, cancel, resume), call invalidateSubscription()
 * so SubscriptionContextProvider refetches and gates stay in sync.
 */
type Listener = () => void;
let listeners: Listener[] = [];

/**
 * Subscribe a refetch callback to be called when subscription is invalidated.
 * @returns Unsubscribe function.
 */
export function subscribeSubscriptionInvalidate(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}

/**
 * Notify all subscribers to refetch subscription (e.g. after update/cancel/resume).
 */
export function invalidateSubscription(): void {
  listeners.forEach(fn => fn());
}
