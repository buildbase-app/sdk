import { useCallback, useEffect, useRef } from 'react';

/**
 * Guards fetch-then-setState hooks against stale writes (the "workspace
 * switch renders the previous workspace's data" race): each `begin()`
 * supersedes the previous in-flight request by aborting its controller, and
 * the returned controller's signal tells the awaited continuation whether it
 * is still the latest — `signal.aborted` means a newer request (or unmount)
 * superseded it, so its result must not be committed to state. Unmount aborts
 * the active request.
 *
 * Usage:
 * ```ts
 * const { begin, settle } = useLatestRequest();
 * const fetchThing = useCallback(async () => {
 *   const req = begin();
 *   setLoading(true);
 *   try {
 *     const result = await api.getThing(id);
 *     if (req.signal.aborted) return;   // superseded — drop the stale result
 *     setThing(result);
 *   } catch (err) {
 *     if (req.signal.aborted) return;
 *     setError(message(err));
 *   } finally {
 *     if (settle(req)) setLoading(false); // only the latest clears loading
 *   }
 * }, [api, id, begin, settle]);
 * ```
 *
 * Pass `req.signal` into API calls that accept a signal so superseded
 * requests also stop hitting the network.
 */
export function useLatestRequest(): {
  begin: () => AbortController;
  settle: (controller: AbortController) => boolean;
} {
  const activeRef = useRef<AbortController | null>(null);

  useEffect(() => () => activeRef.current?.abort(), []);

  const begin = useCallback((): AbortController => {
    activeRef.current?.abort();
    const controller = new AbortController();
    activeRef.current = controller;
    return controller;
  }, []);

  /**
   * True when `controller` is still the live request and was not aborted —
   * i.e. it is safe to commit trailing state (clear the loading flag).
   * Clears the active slot so unmount doesn't abort an already-settled request.
   */
  const settle = useCallback((controller: AbortController): boolean => {
    if (activeRef.current !== controller) return false;
    activeRef.current = null;
    return !controller.signal.aborted;
  }, []);

  return { begin, settle };
}
