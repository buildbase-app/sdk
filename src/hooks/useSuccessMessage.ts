'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for managing auto-dismissing success messages in settings screens.
 * Returns state + a `show` function that auto-clears after `duration` ms.
 *
 * @param duration - Auto-dismiss time in ms (default: 5000)
 */
export function useSuccessMessage(duration = 5000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const show = useCallback(
    (msg: string) => {
      setMessage(msg);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setMessage(null);
      }, duration);
    },
    [duration]
  );

  const clear = useCallback(() => {
    setMessage(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { message, show, clear };
}
