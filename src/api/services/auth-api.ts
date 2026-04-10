/**
 * API client for authentication.
 * Extends BaseApi for shared URL/auth/request handling.
 */

import type { IUser } from '../types';
import { BaseApi } from '../../lib/api-base';
import type { IOsConfig } from './shared-types';

export interface AuthRequestParams {
  orgId: string;
  clientId: string;
  redirect: {
    success: string;
    error: string;
  };
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
   * Uses /api/v1/auth/request (no 'public' prefix — auth endpoints are at the root).
   */
  async requestAuth(params: AuthRequestParams): Promise<AuthRequestResponse> {
    const url = `${this.serverUrl}/api/${this.version}/auth/request`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to initiate authentication';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Failed to initiate authentication (${response.status}: ${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

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
