/**
 * Internal notifier for quota usage data invalidation.
 * When usage is recorded (via useRecordUsage), call invalidateQuotaUsage()
 * so QuotaUsageContextProvider refetches and gates stay in sync.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Subscribe a refetch callback to be called when quota usage is invalidated.
 *
 * @param fn - Callback (e.g. refetch) to run when invalidateQuotaUsage() is called
 * @returns Unsubscribe function to remove the callback
 */
export function subscribeQuotaUsageInvalidate(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Notify all subscribers to refetch quota usage (e.g. after recording usage).
 * Called internally by useRecordUsage on success.
 */
export function invalidateQuotaUsage(): void {
  listeners.forEach(fn => fn());
}

/** Reset all listeners. Intended for test cleanup. */
export function resetQuotaUsageInvalidation(): void {
  listeners.clear();
}
