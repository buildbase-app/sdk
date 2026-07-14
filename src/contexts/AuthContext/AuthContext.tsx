'use client';

import type { IAuthState } from '../../providers/auth/types';
import { createContextProvider } from '../shared/createContext';
import { authReducer, getInitialAuthState } from './reducer';
import type { AuthAction, AuthContextValue } from './types';

const { Provider, useContext, useState, useDispatch, useSelector, useStore } =
  createContextProvider<IAuthState, AuthAction>({
    name: 'Auth',
    initialState: getInitialAuthState(),
    reducer: authReducer,
  });

export const AuthContextProvider = Provider;
export const useAuthContext = (): AuthContextValue => useContext();
export const useAuthState = useState;
export const useAuthDispatch = useDispatch;
export const useAuthSelector = useSelector;
/** Internal: raw store access for cross-context subscriptions (useAppSelector). */
export const useAuthStore = useStore;
