/**
 * Internal notifier for quota usage data invalidation.
 * When usage is recorded (via useRecordUsage), call invalidateQuotaUsage()
 * so QuotaUsageContextProvider refetches and gates stay in sync.
 */
type Listener = () => void;
let listeners: Listener[] = [];

/**
 * Subscribe a refetch callback to be called when quota usage is invalidated.
 *
 * @param fn - Callback (e.g. refetch) to run when invalidateQuotaUsage() is called
 * @returns Unsubscribe function to remove the callback
 */
export function subscribeQuotaUsageInvalidate(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}

/**
 * Notify all subscribers to refetch quota usage (e.g. after recording usage).
 * Called internally by useRecordUsage on success.
 */
export function invalidateQuotaUsage(): void {
  listeners.forEach(fn => fn());
}
