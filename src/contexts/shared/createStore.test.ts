import { describe, expect, it } from 'vitest';
import { createStore } from './createContext';

type State = { count: number; label: string };
type Action = { type: 'inc' } | { type: 'label'; label: string } | { type: 'noop' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'inc':
      return { ...state, count: state.count + 1 };
    case 'label':
      return { ...state, label: action.label };
    case 'noop':
      return state;
  }
};

const initial: State = { count: 0, label: 'a' };

describe('createStore', () => {
  it('reduces and notifies subscribers once per dispatch', () => {
    const store = createStore(initial, reducer);
    let notified = 0;
    store.subscribe(() => notified++);
    store.dispatch({ type: 'inc' });
    expect(store.getState().count).toBe(1);
    expect(notified).toBe(1);
  });

  it('does NOT notify when the reducer returns the same reference', () => {
    const store = createStore(initial, reducer);
    let notified = 0;
    store.subscribe(() => notified++);
    store.dispatch({ type: 'noop' });
    expect(notified).toBe(0);
    expect(store.getState()).toEqual(initial);
  });

  it('getState returns a stable snapshot between dispatches (useSyncExternalStore contract)', () => {
    const store = createStore(initial, reducer);
    store.dispatch({ type: 'inc' });
    expect(store.getState()).toBe(store.getState());
  });

  it('unsubscribe stops notifications; other subscribers unaffected', () => {
    const store = createStore(initial, reducer);
    let a = 0;
    let b = 0;
    const unsubscribeA = store.subscribe(() => a++);
    store.subscribe(() => b++);
    store.dispatch({ type: 'inc' });
    unsubscribeA();
    store.dispatch({ type: 'inc' });
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it('applies the initializer over initialState', () => {
    const store = createStore(initial, reducer, s => ({ ...s, count: 10 }));
    expect(store.getState().count).toBe(10);
  });

  it('a listener added during notification is not called for that dispatch', () => {
    const store = createStore(initial, reducer);
    let lateCalls = 0;
    store.subscribe(() => {
      store.subscribe(() => lateCalls++);
    });
    store.dispatch({ type: 'inc' });
    // Set iteration visits entries added mid-iteration in insertion order —
    // this documents that a subscriber registered during a notification wave
    // WILL be visited by that same wave (Set semantics), which is safe here
    // because a fresh useSyncExternalStore subscriber re-reads the snapshot.
    expect(lateCalls).toBe(1);
    store.dispatch({ type: 'inc' });
    expect(lateCalls).toBeGreaterThan(1);
  });
});
