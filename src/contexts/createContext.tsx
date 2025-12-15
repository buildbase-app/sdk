'use client';

import React, { createContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';

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

  const Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
  };

  const useContext = (): { state: State; dispatch: Dispatch<Action> } => {
    const context = React.useContext(CombinedContext);
    if (!context) {
      throw new Error(
        `use${name}Context must be used within a ${name}Provider. ` +
          'Make sure SaaSOSProvider is wrapping your application.'
      );
    }
    return context;
  };

  const useState = (): State => {
    const state = React.useContext(StateContext);
    if (state === null) {
      throw new Error(
        `use${name}State must be used within a ${name}Provider. ` +
          'Make sure SaaSOSProvider is wrapping your application.'
      );
    }
    return state;
  };

  const useDispatch = () => {
    const dispatch = React.useContext(DispatchContext);
    if (dispatch === null) {
      throw new Error(
        `use${name}Dispatch must be used within a ${name}Provider. ` +
          'Make sure SaaSOSProvider is wrapping your application.'
      );
    }
    return dispatch;
  };

  /**
   * Selector hook - only re-renders when selected value changes
   * Uses useMemo to memoize the selected value and only updates when it changes
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

    // If no selector provided, return entire state (identity selector)
    const actualSelector = selector || ((s: State) => s as unknown as Selected);
    const selectorRef = React.useRef(actualSelector);
    const prevSelectedRef = React.useRef<Selected | undefined>(undefined);

    // Update selector ref if it changed
    if (selector) {
      selectorRef.current = actualSelector;
    }

    // Compute selected value
    const selected = useMemo(() => selectorRef.current(state), [state]);

    // Compare with previous value
    const isEqual =
      prevSelectedRef.current !== undefined
        ? (equalityFn || Object.is)(prevSelectedRef.current, selected)
        : false;

    // Only update ref if value changed
    if (!isEqual) {
      prevSelectedRef.current = selected;
    }

    // Return memoized value - component only re-renders if selected changes
    return (prevSelectedRef.current !== undefined ? prevSelectedRef.current : selected) as Selected;
  };

  return {
    Provider,
    useContext,
    useState,
    useDispatch,
    useSelector,
  };
}
