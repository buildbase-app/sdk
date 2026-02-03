'use client';

import React, { createContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { useSelectWithEquality } from './useSelectWithEquality';

/** Shared suffix for all context-outside-provider errors. */
const CONTEXT_ERROR_SUFFIX = 'Make sure SaaSOSProvider is wrapping your application.';

/**
 * Generic context factory with performance optimizations
 * Creates a context, provider, and hooks with minimal boilerplate
 *
 * Optimizations:
 * - Memoized context value to prevent unnecessary re-renders
 * - Stable dispatch reference (already stable from useReducer)
 * - Split state/dispatch for selective subscriptions
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
  // Split contexts for better performance - components can subscribe to only what they need
  const StateContext = createContext<State | null>(null);
  const DispatchContext = createContext<Dispatch<Action> | null>(null);
  const CombinedContext = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

  const Provider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState, initializer || (state => state));

    // Memoize context values to prevent unnecessary re-renders
    // dispatch is already stable from useReducer, but we memoize the object
    const combinedValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

    return (
      <CombinedContext.Provider value={combinedValue}>
        <StateContext.Provider value={state}>
          <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
      </CombinedContext.Provider>
    );
  });

  Provider.displayName = `${name}Provider`;

  const contextError = (hook: string) =>
    new Error(`use${name}${hook} must be used within a ${name}Provider. ${CONTEXT_ERROR_SUFFIX}`);

  const useContext = (): { state: State; dispatch: Dispatch<Action> } => {
    const context = React.useContext(CombinedContext);
    if (!context) throw contextError('Context');
    return context;
  };

  const useState = (): State => {
    const state = React.useContext(StateContext);
    if (state === null) throw contextError('State');
    return state;
  };

  const useDispatch = () => {
    const dispatch = React.useContext(DispatchContext);
    if (dispatch === null) throw contextError('Dispatch');
    return dispatch;
  };

  /**
   * Selector hook - only re-renders when selected value changes
   * Optimized to avoid double renders using useMemo with proper dependency tracking
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
    const state = useState();
    const actualSelector = selector || ((s: State) => s as unknown as Selected);
    return useSelectWithEquality(state, actualSelector, equalityFn);
  };

  return {
    Provider,
    useContext,
    useState,
    useDispatch,
    useSelector,
  };
}
