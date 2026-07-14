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

/**
 * Unwrapped payload of a successful auth request.
 * ⚠️ Prior to the envelope unification this type described the raw
 * `{ success, data, message }` wire envelope; `requestAuth` now unwraps the
 * envelope like every other SDK method and resolves with the payload only.
 */
export interface AuthRequestResponse {
  redirectUrl: string;
}

export class AuthApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'> & { sessionId?: string }) {
    super(config);
  }

  /**
   * Initiate OAuth sign-in flow. Resolves with the redirect URL to the auth provider.
   * Auth endpoints sit at /api/v1/auth/ (outside the /public basePath),
   * so we use fetchAbsoluteUrl to get timeout, retry, and error handling via
   * BaseApi, then apply the standard throwResponseError → unwrapResponse
   * sequence (the fetchUnwrapped convention). Non-2xx responses and 2xx
   * envelopes with `success: false` both throw a structured Error.
   */
  async requestAuth(params: AuthRequestParams): Promise<AuthRequestResponse> {
    const url = `${this.serverUrl}/api/${this.version}/auth/request`;
    const errorMessage = 'Failed to initiate authentication';
    const response = await this.fetchAbsoluteUrl(url, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!response.ok) await this.throwResponseError(response, errorMessage);
    return this.unwrapResponse<AuthRequestResponse>(response, errorMessage);
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
