/**
 * Reducer helper utilities
 */

/**
 * Creates a simple reducer case that updates a single field
 */
export function updateField<State extends Record<string, any>>(
  state: State,
  field: keyof State,
  value: any
): State {
  return {
    ...state,
    [field]: value,
  };
}

/**
 * Creates a reducer case that updates multiple fields
 */
export function updateFields<State extends Record<string, any>>(
  state: State,
  updates: Partial<State>
): State {
  return {
    ...state,
    ...updates,
  };
}

