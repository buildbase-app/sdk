/**
 * Reducer helper utilities
 */

/**
 * Creates a simple reducer case that updates a single field
 */
export function updateField<State, K extends keyof State>(
  state: State,
  field: K,
  value: State[K]
): State {
  return {
    ...state,
    [field]: value,
  };
}

/**
 * Creates a reducer case that updates multiple fields
 */
export function updateFields<State extends object>(state: State, updates: Partial<State>): State {
  return {
    ...state,
    ...updates,
  };
}
