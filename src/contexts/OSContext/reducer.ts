import { ApiVersion, type IOsState } from '../../providers/os/types';
import { updateFields } from '../shared/utils/reducerHelpers';
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
    settingsStatus: 'idle',
    settingsError: null,
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
      return updateFields(state, {
        settings: action.payload,
        settingsStatus: 'loaded',
        settingsError: null,
      });

    case 'SET_SETTINGS_STATUS':
      return updateFields(state, {
        settingsStatus: action.payload.status,
        settingsError: action.payload.error ?? null,
      });

    default:
      return state;
  }
};
