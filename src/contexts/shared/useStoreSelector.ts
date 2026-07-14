'use client';

import { useMemo, useSyncExternalStore } from 'react';

/**
 * Subscribe to an external store and re-render ONLY when the selected value
 * changes — real re-render bailout via `useSyncExternalStore`, not a
 * whole-context subscription.
 *
 * The returned snapshot is cached per state identity, so repeated
 * `getSnapshot` calls within a render are stable (required by
 * `useSyncExternalStore`) and an unchanged selection skips the re-render
 * entirely. For the bailout to hold across renders, pass a stable `selector`
 * (module-level or memoized); an inline selector still renders correctly but
 * re-evaluates on every store notification.
 *
 * @param getState - Returns the store's current state (stable identity per store)
 * @param subscribe - Store subscription (stable identity per store)
 * @param selector - Selects a value from state; defaults to the whole state
 * @param equalityFn - Custom selection equality (default: Object.is)
 */
export function useStoreSelector<TState, TSelected = TState>(
  getState: () => TState,
  subscribe: (listener: () => void) => () => void,
  selector?: (state: TState) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected {
  const getSelection = useMemo(() => {
    const select = selector ?? ((state: TState) => state as unknown as TSelected);
    let hasMemo = false;
    let memoState: TState;
    let memoSelection: TSelected;
    return (): TSelected => {
      const state = getState();
      if (!hasMemo) {
        hasMemo = true;
        memoState = state;
        memoSelection = select(state);
        return memoSelection;
      }
      if (Object.is(memoState, state)) return memoSelection;
      const next = select(state);
      memoState = state;
      const isEqual = equalityFn ? equalityFn(memoSelection, next) : Object.is(memoSelection, next);
      if (isEqual) return memoSelection;
      memoSelection = next;
      return memoSelection;
    };
    // `subscribe` isn't referenced here (it's passed straight to
    // useSyncExternalStore); it changes in lockstep with `getState` anyway.
  }, [getState, selector, equalityFn]);

  // Same snapshot function on the server: selectors run against initial state.
  return useSyncExternalStore(subscribe, getSelection, getSelection);
}
