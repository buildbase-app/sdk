import { useCallback, useEffect, useRef } from 'react';

/**
 * Auto-clear timer for transient status messages (success/error banners that
 * dismiss themselves). Returns `scheduleClear(clear, delayMs?)`: schedules
 * `clear()` after the delay, replacing any previously scheduled clear, and
 * cancels on unmount — so a banner can't be cleared by a stale timer or fire
 * after the component is gone.
 *
 * ```ts
 * const scheduleClear = useTransientStatus();
 * // after a mutation settles:
 * scheduleClear(() => { setError(null); setSuccess(null); });
 * ```
 */
export function useTransientStatus(): (clear: () => void, delayMs?: number) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return useCallback((clear: () => void, delayMs = 5000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      clear();
    }, delayMs);
  }, []);
}
