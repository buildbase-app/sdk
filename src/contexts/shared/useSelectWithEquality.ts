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
  const prevSelectorRef = useRef(selector);
  const prevEqualityFnRef = useRef(equalityFn);
  const prevSelectedRef = useRef<TSelected>(undefined as TSelected);
  const hasInitializedRef = useRef(false);

  // Track whether selector or equalityFn changed (new reference = new selection logic)
  const selectorChanged = prevSelectorRef.current !== selector;
  const equalityFnChanged = prevEqualityFnRef.current !== equalityFn;
  const fnsChanged = selectorChanged || equalityFnChanged;

  prevSelectorRef.current = selector;
  prevEqualityFnRef.current = equalityFn;

  // Recompute when state changes OR when selector/equalityFn change.
  // We use a version counter to force useMemo to recompute on fn changes.
  const versionRef = useRef(0);
  if (fnsChanged) {
    versionRef.current += 1;
  }
  const version = versionRef.current;

  return useMemo(() => {
    const result = selector(state);

    if (hasInitializedRef.current) {
      const isEqual = equalityFn
        ? equalityFn(prevSelectedRef.current, result)
        : Object.is(prevSelectedRef.current, result);

      if (isEqual) {
        return prevSelectedRef.current;
      }
    }

    prevSelectedRef.current = result;
    hasInitializedRef.current = true;

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, version]);
}
