/**
 * API client for user attributes and features.
 * Extends BaseApi for shared URL/auth/request handling.
 */

import { BaseApi } from '../../lib/api-base';
import type { IUser } from '../types';
import type { IOsConfig } from './shared-types';

export class UserApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'> & { sessionId?: string }) {
    super(config);
  }

  async getAttributes(signal?: AbortSignal): Promise<Record<string, string | number | boolean>> {
    const response = await this.fetchResponse('users/attributes', { signal });
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch user attributes');
    const data = await this.unwrapResponse<Record<string, unknown>>(
      response,
      'Failed to fetch user attributes'
    );
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
    if (!response.ok) await this.throwResponseError(response, 'Failed to fetch user features');
    const data = await this.unwrapResponse<Record<string, unknown>>(
      response,
      'Failed to fetch user features'
    );
    if (typeof data === 'object' && data !== null) {
      return data as Record<string, boolean>;
    }
    return {};
  }
}
