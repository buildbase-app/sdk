import { useMemo } from 'react';
import { IUser } from '../../api/types';
import { BaseApi } from '../../lib/api-base';
import { getErrorMessage } from '../../lib/api-utils';
import { useSaaSOs } from '../os/hooks';
import type { IOsConfig } from '../os/types';

/**
 * Centralized API client for user attributes and features.
 * Extends BaseApi for shared URL/auth/request handling.
 */
export class UserApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'>) {
    super(config);
  }

  async getAttributes(signal?: AbortSignal): Promise<Record<string, string | number | boolean>> {
    const response = await this.fetchResponse('users/attributes', { signal });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Failed to fetch user attributes'));
    }
    const data = await response.json();
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, string | number | boolean>;
    }
    return {};
  }

  async updateAttributes(updates: Record<string, string | number | boolean>): Promise<IUser> {
    return this.fetchJson<IUser>(
      'users/attributes',
      {
        method: 'PATCH',
        body: JSON.stringify({ attributes: updates }),
      },
      'Failed to update user attributes'
    );
  }

  async updateAttribute(attributeKey: string, value: string | number | boolean): Promise<IUser> {
    return this.fetchJson<IUser>(
      `users/attributes/${attributeKey}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      },
      'Failed to update user attribute'
    );
  }

  async getFeatures(signal?: AbortSignal): Promise<Record<string, boolean>> {
    const response = await this.fetchResponse('users/features', { signal });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Failed to fetch user features'));
    }
    const data = await response.json();
    if (typeof data === 'object' && data !== null) {
      return data as Record<string, boolean>;
    }
    return {};
  }
}

/** Memoized UserApi instance. Recreates only when serverUrl or version change. */
export function useUserApi() {
  const os = useSaaSOs();
  return useMemo(() => new UserApi(os), [os.serverUrl, os.version]);
}
