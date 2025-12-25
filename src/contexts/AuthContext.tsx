'use client';

import type { IAuthState } from '../providers/auth/types';
import { createContextProvider } from './createContext';
import { authReducer, getInitialAuthState } from './reducers/authReducer';
import type { AuthAction, AuthContextValue } from './types';

const { Provider, useContext, useState, useDispatch, useSelector } = createContextProvider<
  IAuthState,
  AuthAction
>({
  name: 'Auth',
  initialState: getInitialAuthState(),
  reducer: authReducer,
  initializer: getInitialAuthState,
});

export const AuthProvider = Provider;
export const useAuthContext = (): AuthContextValue => useContext();
export const useAuthState = useState;
export const useAuthDispatch = useDispatch;
export const useAuthSelector = useSelector;
