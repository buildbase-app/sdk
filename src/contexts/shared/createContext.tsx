'use client';

import React, { createContext, useMemo, useRef, type Dispatch, type ReactNode } from 'react';
import { useStoreSelector } from './useStoreSelector';

/** Shared suffix for all context-outside-provider errors. */
const CONTEXT_ERROR_SUFFIX = 'Make sure SaaSOSProvider is wrapping your application.';

/**
 * The mutable store a context provider owns. State lives here (not in React
 * state), so a dispatch only re-renders components whose selection changed.
 */
export interface ContextStore<State, Action> {
  /** Current state — stable snapshot, safe for `useSyncExternalStore`. */
  getState: () => State;
  /** Reduce + notify. No-op (no notification) when the reducer returns the same reference. */
  dispatch: Dispatch<Action>;
  /** Subscribe to state changes; returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
}

/** Build a {@link ContextStore}. Pure — exported for tests. */
export function createStore<State, Action>(
  initialState: State,
  reducer: (state: State, action: Action) => State,
  initializer?: (initialState: State) => State
): ContextStore<State, Action> {
  let state = initializer ? initializer(initialState) : initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch: action => {
      const next = reducer(state, action);
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach(listener => listener());
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Generic context factory backed by `useSyncExternalStore`.
 *
 * The provider puts a stable store object in context instead of the state
 * itself, so dispatching never re-renders consumers wholesale:
 * - `useSelector(fn)` re-renders only when `fn`'s result changes
 * - `useState()` subscribes to the whole state (re-renders on every change)
 * - `useDispatch()` never re-renders (the store — and its dispatch — is stable)
 */
export function createContextProvider<State, Action>({
  name,
  initialState,
  reducer,
  initializer,
}: {
  name: string;
  initialState: State;
  reducer: (state: State, action: Action) => State;
  initializer?: (initialState: State) => State;
}) {
  const StoreContext = createContext<ContextStore<State, Action> | null>(null);
  StoreContext.displayName = `${name}StoreContext`;

  const Provider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
    const storeRef = useRef<ContextStore<State, Action> | null>(null);
    if (storeRef.current === null) {
      storeRef.current = createStore(initialState, reducer, initializer);
    }
    return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
  });

  Provider.displayName = `${name}Provider`;

  const contextError = (hook: string) =>
    new Error(`use${name}${hook} must be used within a ${name}Provider. ${CONTEXT_ERROR_SUFFIX}`);

  const useStore = (hook = 'Store'): ContextStore<State, Action> => {
    const store = React.useContext(StoreContext);
    if (!store) throw contextError(hook);
    return store;
  };

  /**
   * Selector hook — re-renders ONLY when the selected value changes.
   * Pass a stable selector (module-level or memoized) for the bailout to
   * hold across renders.
   *
   * @param selector Optional function that selects a value from state. If not provided, returns entire state.
   * @param equalityFn Optional equality function for comparison (default: Object.is)
   *
   * @example
   * ```tsx
   * // Get entire state (re-renders on any state change)
   * const auth = useAuthSelector();
   *
   * // Get specific field (only re-renders when user changes)
   * const user = useAuthSelector(state => state.user);
   *
   * // With custom equality function
   * const workspaces = useWorkspaceSelector(
   *   state => state.workspaces,
   *   (a, b) => a.length === b.length
   * );
   * ```
   */
  const useSelector = <Selected = State,>(
    selector?: (state: State) => Selected,
    equalityFn?: (a: Selected, b: Selected) => boolean
  ): Selected => {
    const store = useStore('Selector');
    return useStoreSelector(store.getState, store.subscribe, selector, equalityFn);
  };

  const useState = (): State => {
    const store = useStore('State');
    return useStoreSelector(store.getState, store.subscribe);
  };

  const useDispatch = (): Dispatch<Action> => useStore('Dispatch').dispatch;

  const useContext = (): { state: State; dispatch: Dispatch<Action> } => {
    const store = useStore('Context');
    const state = useStoreSelector(store.getState, store.subscribe);
    return useMemo(() => ({ state, dispatch: store.dispatch }), [state, store]);
  };

  return {
    Provider,
    useContext,
    useState,
    useDispatch,
    useSelector,
    useStore,
  };
}
