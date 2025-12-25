import type { IOsState } from '../../providers/os/types';
import type { OSAction } from './types';

/**
 * Initial state for OS context
 */
export const getInitialOSState = (): IOsState => {
  return {
    serverUrl: '',
    version: '',
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
      return { ...state, ...action.payload };

    case 'REMOVE_SAAS_OS_CONFIG':
      return getInitialOSState();

    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    default:
      return state;
  }
};
