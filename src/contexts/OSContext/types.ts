import type { Dispatch } from 'react';
import type { IOsState } from '../../providers/os/types';
import type { ISettings } from '../../providers/types';

export type OSAction =
  | { type: 'SET_SAAS_OS_CONFIG'; payload: IOsState }
  | { type: 'REMOVE_SAAS_OS_CONFIG' }
  | { type: 'SET_SETTINGS'; payload: ISettings | null };

export interface OSContextValue {
  state: IOsState;
  dispatch: Dispatch<OSAction>;
}
