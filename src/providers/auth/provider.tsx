'use client';

import { jwtDecode } from 'jwt-decode';
import { ReactNode, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../contexts';
import { authActions } from '../../contexts/actionCreators';
import { WorkspaceProvider } from '../workspace/provider';
import { AuthUser, IAuthCallbacks } from './types';
import { createSession, getTokenFromUrl, removeTokenFromUrl } from './utils';

interface IProps {
  children: ReactNode;
  callbacks?: IAuthCallbacks;
}

export function AuthProvider({ children, callbacks }: IProps) {
  console.log('AuthProvider', callbacks);
  const dispatch = useAppDispatch();
  const authState = useAppSelector(state => state.auth);
  const os = useAppSelector(state => state.os);
  const { serverUrl } = os;

  const handleAuthRedirect = useCallback(
    async (token: string) => {
      try {
        // TODO handle the auth code here so when we make it more secure and authenticate use code with token and server identity
        // const response = await defaultApiClient.get(`${serverUrl}/api/v1/auth/verify`, {
        //   headers: { Authorization: `Bearer ${token}` },
        // });
        // const user = response.data.user;
        const user = jwtDecode(token) as AuthUser;
        const session = createSession(user, token, 24);
        dispatch.auth(authActions.setSession(session));
        if (callbacks?.verifyToken) {
          const isValid = await callbacks.verifyToken(token);
          if (!isValid) {
            dispatch.auth(authActions.authenticationFailed());
            return;
          }
          if (callbacks?.handleAuthentication) {
            await callbacks.handleAuthentication(token);
          }
        }
        removeTokenFromUrl();
      } catch (error) {
        console.error('Auth redirect error:', error);
        dispatch.auth(authActions.authenticationFailed());
        throw error;
      }
    },
    [serverUrl, dispatch, callbacks]
  );

  useEffect(() => {
    const token = getTokenFromUrl();
    console.log('token', token);
    if (!token) {
      return;
    }
    handleAuthRedirect(token);
  }, [handleAuthRedirect]);

  return (
    <>
      {authState.isAuthenticated && <WorkspaceProvider>{children}</WorkspaceProvider>}
      {!authState.isAuthenticated && children}
    </>
  );
}
