'use client';

import { useMemo, useRef } from 'react';

/**
 * Shared selector hook with equality-based memoization.
 * Only re-renders when the selected value changes (according to equalityFn).
 *
 * @param state - The state to select from
 * @param selector - Function that selects a value from state
 * @param equalityFn - Optional equality function (default: Object.is)
 * @returns The selected value
 */
export function useSelectWithEquality<TState, TSelected>(
  state: TState,
  selector: (state: TState) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected {
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);
  const prevSelectedRef = useRef<TSelected>(undefined as TSelected);
  const hasInitializedRef = useRef(false);

  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;

  return useMemo(() => {
    const result = selectorRef.current(state);

    if (hasInitializedRef.current) {
      const isEqual = equalityFnRef.current
        ? equalityFnRef.current(prevSelectedRef.current, result)
        : Object.is(prevSelectedRef.current, result);

      if (isEqual) {
        return prevSelectedRef.current;
      }
    }

    prevSelectedRef.current = result;
    hasInitializedRef.current = true;

    return result;
  }, [state]);
}
