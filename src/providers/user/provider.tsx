'use client';

import React, { useCallback, useState } from 'react';
import { IUser } from '../../api/types';
import { useTranslation } from '../../i18n';
import { isAbortError } from '../../lib/api-utils';
import { handleError } from '../../lib/error-handler';
import { useAsyncEffect } from '../../lib/useAsyncEffect';
import { useSaaSAuth } from '../auth/hooks';
import { useSaaSOs } from '../os/hooks';
import { useUserApi } from './api';

export interface UserContextValue {
  attributes: Record<string, string | number | boolean>;
  features: Record<string, boolean>;
  /** True while EITHER pipeline is loading. Prefer the per-resource flags. */
  isLoading: boolean;
  /** The first per-resource error, attributes first. Prefer the per-resource errors. */
  error: Error | null;
  /** True while attributes are loading (independent of features). */
  attributesLoading: boolean;
  /** True while features are loading (independent of attributes). */
  featuresLoading: boolean;
  /** Last attributes fetch/update error; cleared when a new attributes request starts. */
  attributesError: Error | null;
  /** Last features fetch error; cleared when a new features request starts. */
  featuresError: Error | null;
  updateAttributes: (updates: Record<string, string | number | boolean>) => Promise<IUser>;
  updateAttribute: (attributeKey: string, value: string | number | boolean) => Promise<IUser>;
  refreshAttributes: () => Promise<void>;
  refreshFeatures: () => Promise<void>;
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const { t } = useTranslation();
  const os = useSaaSOs();
  const api = useUserApi();
  const { isAuthenticated } = useSaaSAuth();
  const { serverUrl, version } = os;

  // Attributes and features are independent pipelines: each owns its loading
  // flag and error so one can't stomp the other's state (a features failure
  // used to surface as an attributes error and vice versa, and whichever
  // pipeline finished last cleared the shared spinner for both).
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [attributesError, setAttributesError] = useState<Error | null>(null);
  const [featuresError, setFeaturesError] = useState<Error | null>(null);

  const fetchAttributes = useCallback(
    async (signal?: AbortSignal) => {
      if (!serverUrl || !version || !isAuthenticated) {
        setAttributes({});
        return;
      }
      setAttributesError(null); // a new request clears the stale error
      try {
        const data = await api.getAttributes(signal);
        setAttributes(data);
      } catch (err) {
        if (isAbortError(err)) return;
        const errObj = err instanceof Error ? err : new Error(t('errors.generic'));
        setAttributesError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'fetchAttributes',
        });
      }
    },
    [api, serverUrl, version, isAuthenticated, t]
  );

  const refreshAttributes = useCallback(async () => {
    if (!serverUrl || !version || !isAuthenticated) {
      return;
    }

    setAttributesLoading(true);

    try {
      await fetchAttributes();
    } finally {
      setAttributesLoading(false);
    }
  }, [serverUrl, version, isAuthenticated, fetchAttributes]);

  const updateAttributes = useCallback(
    async (updates: Record<string, string | number | boolean>) => {
      setAttributesLoading(true);
      setAttributesError(null);
      try {
        const updatedUser = await api.updateAttributes(updates);
        await fetchAttributes();
        return updatedUser;
      } catch (err) {
        const errObj = err instanceof Error ? err : new Error(t('errors.generic'));
        setAttributesError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'updateAttributes',
          metadata: { updates },
        });
        throw err;
      } finally {
        setAttributesLoading(false);
      }
    },
    [api, fetchAttributes, t]
  );

  const updateAttribute = useCallback(
    async (attributeKey: string, value: string | number | boolean) => {
      setAttributesLoading(true);
      setAttributesError(null);
      try {
        const updatedUser = await api.updateAttribute(attributeKey, value);
        await fetchAttributes();
        return updatedUser;
      } catch (err) {
        const errObj = err instanceof Error ? err : new Error(t('errors.generic'));
        setAttributesError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'updateAttribute',
          metadata: { attributeKey, value },
        });
        throw err;
      } finally {
        setAttributesLoading(false);
      }
    },
    [api, fetchAttributes, t]
  );

  const fetchFeatures = useCallback(
    async (signal?: AbortSignal) => {
      if (!serverUrl || !version || !isAuthenticated) {
        setFeatures({});
        return;
      }
      setFeaturesError(null); // a new request clears the stale error
      try {
        const data = await api.getFeatures(signal);
        setFeatures(data);
      } catch (err) {
        if (isAbortError(err)) return;
        const errObj = err instanceof Error ? err : new Error(t('errors.generic'));
        setFeaturesError(errObj);
        handleError(err, {
          component: 'UserProvider',
          action: 'fetchFeatures',
        });
      }
    },
    [api, serverUrl, version, isAuthenticated, t]
  );

  const refreshFeatures = useCallback(async () => {
    if (!serverUrl || !version || !isAuthenticated) {
      return;
    }

    setFeaturesLoading(true);

    try {
      await fetchFeatures();
    } finally {
      setFeaturesLoading(false);
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
      setAttributesLoading(true);
      setFeaturesLoading(true);
      await Promise.all([
        fetchAttributes(signal).finally(() => setAttributesLoading(false)),
        fetchFeatures(signal).finally(() => setFeaturesLoading(false)),
      ]);
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
      // Combined views, kept for back-compat with the original context shape.
      isLoading: attributesLoading || featuresLoading,
      error: attributesError ?? featuresError,
      attributesLoading,
      featuresLoading,
      attributesError,
      featuresError,
      updateAttributes,
      updateAttribute,
      refreshAttributes,
      refreshFeatures,
    }),
    [
      attributes,
      features,
      attributesLoading,
      featuresLoading,
      attributesError,
      featuresError,
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
