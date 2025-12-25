'use client';

import type { IOsState } from '../../providers/os/types';
import { createContextProvider } from '../shared/createContext';
import { getInitialOSState, osReducer } from './reducer';
import type { OSAction, OSContextValue } from './types';

const { Provider, useContext, useState, useDispatch, useSelector } = createContextProvider<
  IOsState,
  OSAction
>({
  name: 'OS',
  initialState: getInitialOSState(),
  reducer: osReducer,
});

export const OSContextProvider = Provider;
export const useOSContext = (): OSContextValue => useContext();
export const useOSState = useState;
export const useOSDispatch = useDispatch;
export const useOSSelector = useSelector;
