/**
 * Factory for creating invalidation notifiers.
 * Each call returns an isolated listener set with subscribe/invalidate/reset functions.
 * Used by subscription, quota-usage, and credit-balance contexts to trigger refetches.
 */

type Listener = () => void;

export interface InvalidationManager {
  /** Subscribe a callback to be called on invalidation. Returns unsubscribe function. */
  subscribe: (fn: Listener) => () => void;
  /** Notify all subscribers to refetch. */
  invalidate: () => void;
  /** Remove all listeners. Intended for test cleanup. */
  reset: () => void;
}

export function createInvalidation(): InvalidationManager {
  const listeners = new Set<Listener>();

  return {
    subscribe(fn: Listener): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    invalidate(): void {
      listeners.forEach(fn => fn());
    },
    reset(): void {
      listeners.clear();
    },
  };
}
