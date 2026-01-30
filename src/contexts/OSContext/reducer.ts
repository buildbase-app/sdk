import { updateField, updateFields } from '../shared/utils/reducerHelpers';
import { ApiVersion, type IOsState } from '../../providers/os/types';
import type { OSAction } from './types';

/**
 * Initial state for OS context
 */
export const getInitialOSState = (): IOsState => {
  return {
    serverUrl: '',
    version: ApiVersion.V1,
    orgId: '',
    settings: null,
  };
};

/**
 * OS reducer for Context API
 * Handles OS configuration state updates with proper immutability
 */
export const osReducer = (state: IOsState, action: OSAction): IOsState => {
  switch (action.type) {
    case 'SET_SAAS_OS_CONFIG':
      return updateFields(state, action.payload);

    case 'REMOVE_SAAS_OS_CONFIG':
      return getInitialOSState();

    case 'SET_SETTINGS':
      return updateField(state, 'settings', action.payload);

    default:
      return state;
  }
};
