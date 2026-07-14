/**
 * OS action creators
 */

import type { IOsState, SettingsStatus } from '../../providers/os/types';
import type { ISettings } from '../../providers/types';
import type { OSAction } from './types';

export const osActions = {
  setSaaSOSConfig: (config: IOsState): OSAction => ({
    type: 'SET_SAAS_OS_CONFIG',
    payload: config,
  }),

  removeSaaSOSConfig: (): OSAction => ({
    type: 'REMOVE_SAAS_OS_CONFIG',
  }),

  setSettings: (settings: ISettings | null): OSAction => ({
    type: 'SET_SETTINGS',
    payload: settings,
  }),

  setSettingsStatus: (status: SettingsStatus, error?: string | null): OSAction => ({
    type: 'SET_SETTINGS_STATUS',
    payload: { status, error },
  }),
};
