'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { AuthProvider } from '../auth/provider';
import { IAuthConfig } from '../auth/types';
import { setSaaSOSConfig } from './reducer';
import { IOsState } from './types';

interface IProps {
  children: React.ReactNode;
  config: IOsState;
  auth?: IAuthConfig;
}

export default function SaaSConfigProvider({ children, config, auth }: IProps) {
  const dispatch = useAppDispatch();
  const saasOSConfig = useAppSelector(state => state.os);

  useEffect(() => {
    dispatch(
      setSaaSOSConfig({
        ...config,
        auth: {
          clientId: auth?.clientId || '',
          redirectUrl: auth?.redirectUrl || '',
        },
      })
    );
  }, [config]);
  // block rendering until config is set
  if (!saasOSConfig?.serverUrl) {
    return null;
  }

  const showWorkspaceProvider =
    saasOSConfig.auth && saasOSConfig.auth.clientId && saasOSConfig.auth.redirectUrl;

  return (
    <>
      {showWorkspaceProvider && <AuthProvider callbacks={auth?.callbacks}>{children}</AuthProvider>}
      {!showWorkspaceProvider && <>{children}</>}
    </>
  );
}
