'use client';

import type { DependencyList } from 'react';
import { useEffect } from 'react';
import { isAbortError } from '../lib/api-utils';
import { handleError } from '../lib/error-handler';

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
      } else {
        handleError(err, {
          component: 'useAsyncEffect',
          action: 'effect',
          metadata: { note: 'Unhandled rejection - consider passing onError' },
        });
      }
    });
    return () => ac.abort();
  }, deps);
}
