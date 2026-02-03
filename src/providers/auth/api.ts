/**
 * Centralized API client for auth (profile).
 * Extends BaseApi; uses explicit sessionId for profile (e.g. after redirect or hydration).
 */

import { IUser } from '../../api/types';
import { BaseApi } from '../../lib/api-base';
import type { IOsConfig } from '../os/types';

export class AuthApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'>) {
    super(config);
  }

  /** Fetch user profile with the given session ID (used after OAuth redirect or from storage). */
  async getProfile(sessionId: string, signal?: AbortSignal): Promise<IUser> {
    return this.fetchJson<IUser>(
      'profile',
      {
        headers: { 'x-session-id': sessionId },
        signal,
      },
      'Failed to fetch user profile'
    );
  }
}
