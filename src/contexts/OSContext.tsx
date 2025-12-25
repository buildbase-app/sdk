'use client';

import type { IOsState } from '../providers/os/types';
import { createContextProvider } from './createContext';
import { getInitialOSState, osReducer } from './reducers/osReducer';
import type { OSAction, OSContextValue } from './types';

const { Provider, useContext, useState, useDispatch, useSelector } = createContextProvider<
  IOsState,
  OSAction
>({
  name: 'OS',
  initialState: getInitialOSState(),
  reducer: osReducer,
});

export const OSProvider = Provider;
export const useOSContext = (): OSContextValue => useContext();
export const useOSState = useState;
export const useOSDispatch = useDispatch;
export const useOSSelector = useSelector;
