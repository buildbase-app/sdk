'use client';

import type { DependencyList } from 'react';
import { useEffect } from 'react';
import { isAbortError } from './api-utils';

function isDevelopment(): boolean {
  try {
    const g = typeof globalThis !== 'undefined' ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }) : null;
    return g?.process?.env?.NODE_ENV === 'development';
  } catch {
    return false;
  }
}

export interface UseAsyncEffectOptions {
  /**
   * Called when the effect promise rejects (except for AbortError which is ignored).
   */
  onError?: (err: unknown) => void;
}

/**
 * Encapsulates the AbortController + async effect pattern.
 * Provides cancellation on cleanup and optional error handling.
 *
 * @param effect - Async function that receives AbortSignal for cancellation
 * @param deps - Dependency array (same as useEffect)
 * @param options - Optional onError callback for unhandled rejections
 *
 * @example
 * ```tsx
 * useAsyncEffect(
 *   async (signal) => {
 *     const response = await safeFetch(url, { signal });
 *     const data = await response.json();
 *     setData(data);
 *   },
 *   [url],
 *   { onError: (err) => handleError(err, { component: 'MyComponent', action: 'fetch' }) }
 * );
 * ```
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList,
  options?: UseAsyncEffectOptions
): void {
  useEffect(() => {
    const ac = new AbortController();
    effect(ac.signal).catch(err => {
      if (isAbortError(err)) return;
      if (options?.onError) {
        options.onError(err);
      } else if (isDevelopment()) {
        // Log unhandled rejections in dev when onError not provided - helps catch missing error handlers
        console.warn('[useAsyncEffect] Unhandled rejection (consider passing onError):', err);
      }
    });
    return () => ac.abort();
  }, deps);
}
