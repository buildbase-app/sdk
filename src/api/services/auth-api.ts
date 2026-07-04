/**
 * API client for authentication.
 * Extends BaseApi for shared URL/auth/request handling.
 */

import { BaseApi } from '../../lib/api-base';
import type { IUser } from '../types';
import type { IOsConfig } from './shared-types';

export interface AuthRequestParams {
  orgId: string;
  clientId: string;
  redirect: {
    success: string;
    error: string;
  };
  state?: string;
}

export interface AuthRequestResponse {
  success: boolean;
  data: {
    redirectUrl: string;
  };
  message: string;
}

export class AuthApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'> & { sessionId?: string }) {
    super(config);
  }

  /**
   * Initiate OAuth sign-in flow. Returns redirect URL to the auth provider.
   * Auth endpoints sit at /api/v1/auth/ (outside the /public basePath),
   * so we use fetchAbsoluteUrl to get timeout, retry, and error handling via BaseApi.
   */
  async requestAuth(params: AuthRequestParams): Promise<AuthRequestResponse> {
    const url = `${this.serverUrl}/api/${this.version}/auth/request`;
    const response = await this.fetchAbsoluteUrl(url, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!response.ok) await this.throwResponseError(response, 'Failed to initiate authentication');
    return response.json();
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
