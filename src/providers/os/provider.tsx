'use client';

import React, { useEffect } from 'react';
import { IOsState } from './types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSaaSOSConfig } from './reducer';
import { AuthProvider } from '../auth/provider';
import { IAuthConfig } from '../auth/types';

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

  return (
    <>
      {auth && <AuthProvider callbacks={auth.callbacks}>{children}</AuthProvider>}
      {!config.auth && <>{children}</>}
    </>
  );
}
