'use client';

import React, { useCallback, useState } from 'react';
import { IUser } from '../../api/types';
import { isAbortError } from '../../lib/api-utils';
import { handleError } from '../../lib/error-handler';
import { useAsyncEffect } from '../../lib/useAsyncEffect';
import { useSaaSAuth } from '../auth/hooks';
import { useSaaSOs } from '../os/hooks';
import { useUserApi } from './api';

export interface UserContextValue {
  attributes: Record<string, string | number | boolean>;
  features: Record<string, boolean>;
  isLoading: boolean;
  error: Error | null;
  updateAttributes: (updates: Record<string, string | number | boolean>) => Promise<IUser>;
  updateAttribute: (attributeKey: string, value: string | number | boolean) => Promise<IUser>;
  refreshAttributes: () => Promise<void>;
  refreshFeatures: () => Promise<void>;
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const os = useSaaSOs();
  const api = useUserApi();
  const { isAuthenticated } = useSaaSAuth();
  const { serverUrl, version } = os;

  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAttributes = useCallback(
    async (signal?: AbortSignal) => {
      if (!serverUrl || !version || !isAuthenticated) {
        setAttributes({});
        return;
      }
      try {
        const data = await api.getAttributes(signal);
        setAttributes(data);
      } catch (err) {
        if (isAbortError(err)) return;
        const errObj = err instanceof Error ? err : new Error('Failed to fetch user attributes');
        setError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'fetchAttributes',
        });
      }
    },
    [api, serverUrl, version, isAuthenticated]
  );

  const refreshAttributes = useCallback(async () => {
    if (!serverUrl || !version || !isAuthenticated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await fetchAttributes();
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, version, isAuthenticated, fetchAttributes]);

  const updateAttributes = useCallback(
    async (updates: Record<string, string | number | boolean>) => {
      if (!serverUrl || !version) {
        throw new Error('Server URL or version is missing');
      }
      setIsLoading(true);
      setError(null);
      try {
        const updatedUser = await api.updateAttributes(updates);
        await fetchAttributes();
        return updatedUser;
      } catch (err) {
        const errObj = err instanceof Error ? err : new Error('Failed to update user attributes');
        setError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'updateAttributes',
          metadata: { updates },
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api, serverUrl, version, fetchAttributes]
  );

  const updateAttribute = useCallback(
    async (attributeKey: string, value: string | number | boolean) => {
      if (!serverUrl || !version) {
        throw new Error('Server URL or version is missing');
      }
      setIsLoading(true);
      setError(null);
      try {
        const updatedUser = await api.updateAttribute(attributeKey, value);
        await fetchAttributes();
        return updatedUser;
      } catch (err) {
        const errObj = err instanceof Error ? err : new Error('Failed to update user attribute');
        setError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'updateAttribute',
          metadata: { attributeKey, value },
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api, serverUrl, version, fetchAttributes]
  );

  const fetchFeatures = useCallback(
    async (signal?: AbortSignal) => {
      if (!serverUrl || !version || !isAuthenticated) {
        setFeatures({});
        return;
      }
      try {
        const data = await api.getFeatures(signal);
        setFeatures(data);
      } catch (err) {
        if (isAbortError(err)) return;
        const errObj = err instanceof Error ? err : new Error('Failed to fetch user features');
        setError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'fetchFeatures',
        });
      }
    },
    [api, serverUrl, version, isAuthenticated]
  );

  const refreshFeatures = useCallback(async () => {
    if (!serverUrl || !version || !isAuthenticated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await fetchFeatures();
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, version, isAuthenticated, fetchFeatures]);

  // Fetch attributes and features when authenticated and OS config is ready
  useAsyncEffect(
    async signal => {
      if (!isAuthenticated || !serverUrl || !version) {
        setAttributes({});
        setFeatures({});
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchAttributes(signal), fetchFeatures(signal)]);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, serverUrl, version, fetchAttributes, fetchFeatures],
    {
      onError: err =>
        handleError(err, {
          component: 'UserProvider',
          action: 'initialFetch',
          metadata: { step: 'fetchAttributesAndFeatures' },
        }),
    }
  );

  const value: UserContextValue = React.useMemo(
    () => ({
      attributes,
      features,
      isLoading,
      error,
      updateAttributes,
      updateAttribute,
      refreshAttributes,
      refreshFeatures,
    }),
    [
      attributes,
      features,
      isLoading,
      error,
      updateAttributes,
      updateAttribute,
      refreshAttributes,
      refreshFeatures,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
});

UserProvider.displayName = 'UserProvider';

export { UserContext };
