'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { IUser } from '../../api/types';
import { useAppSelector } from '../../contexts';
import { handleError } from '../../lib/error-handler';
import { safeFetch } from '../../lib/api-utils';
import { getAuthFlags } from '../auth/types';
import { getAuthHeaders } from '../auth/utils';

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
  const os = useAppSelector(state => state.os);
  const auth = useAppSelector(state => state.auth);
  const { serverUrl, version } = os;
  const isAuthenticated = getAuthFlags(auth.status).isAuthenticated;

  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAttributes = useCallback(async () => {
    if (!serverUrl || !version || !isAuthenticated) {
      setAttributes({});
      return;
    }

    try {
      const response = await safeFetch(`${serverUrl}/api/${version}/public/users/attributes`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user attributes');
      }

      const data = await response.json();

      // API returns JSON object with key-value pairs
      // Handle both direct object or wrapped in attributes property
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setAttributes(data);
      } else {
        setAttributes({});
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user attributes');
      setError(error);
      handleError(err, {
        component: 'UserProvider',
        action: 'fetchAttributes',
      });
    }
  }, [serverUrl, version, isAuthenticated]);

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
        const response = await safeFetch(`${serverUrl}/api/${version}/public/users/attributes`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ attributes: updates }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update user attributes');
        }

        const updatedUser: IUser = await response.json();

        // Refetch attributes after successful update to get latest values
        await fetchAttributes();

        return updatedUser;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update user attributes');
        setError(error);
        handleError(err, {
          component: 'UserProvider',
          action: 'updateAttributes',
          metadata: { updates },
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [serverUrl, version, fetchAttributes]
  );

  const updateAttribute = useCallback(
    async (attributeKey: string, value: string | number | boolean) => {
      if (!serverUrl || !version) {
        throw new Error('Server URL or version is missing');
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await safeFetch(
          `${serverUrl}/api/${version}/public/users/attributes/${attributeKey}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ value }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update user attribute');
        }

        const updatedUser: IUser = await response.json();

        // Refetch attributes after successful update to get latest values
        await fetchAttributes();

        return updatedUser;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update user attribute');
        setError(error);
        handleError(err, {
          component: 'UserProvider',
          action: 'updateAttribute',
          metadata: { attributeKey, value },
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [serverUrl, version, fetchAttributes]
  );

  const fetchFeatures = useCallback(async () => {
    if (!serverUrl || !version || !isAuthenticated) {
      setFeatures({});
      return;
    }

    try {
      const response = await safeFetch(`${serverUrl}/api/${version}/public/users/features`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user features');
      }

      const data = await response.json();

      // API returns {  "feature-id": true, ... } object
      if (typeof data === 'object') {
        setFeatures(data);
      } else {
        setFeatures({});
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user features');
      setError(error);
      handleError(err, {
        component: 'UserProvider',
        action: 'fetchFeatures',
      });
    }
  }, [serverUrl, version, isAuthenticated]);

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
  useEffect(() => {
    if (isAuthenticated && serverUrl && version) {
      setIsLoading(true);
      setError(null);
      // Fetch both in parallel
      Promise.all([fetchAttributes(), fetchFeatures()]).finally(() => {
        setIsLoading(false);
      });
    } else {
      // Clear attributes and features when not authenticated
      setAttributes({});
      setFeatures({});
    }
  }, [isAuthenticated, serverUrl, version, fetchAttributes, fetchFeatures]);

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
