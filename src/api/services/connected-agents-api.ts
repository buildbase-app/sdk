/**
 * API client for the signed-in user's "connected agents" — the AI agents they
 * have authorized to access their account. Session-authed (x-session-id),
 * scoped to the current user. Extends BaseApi for shared URL/auth/request handling.
 */

import { BaseApi } from '../../lib/api-base';
import type { IOsConfig } from './shared-types';

/** An agent the user has connected to their account. */
export interface IConnectedAgent {
  /** OAuth client id of the connected agent. */
  clientId: string;
  /** Display name of the agent. */
  title: string;
  /** Scopes the user granted it. */
  scope: string[];
  /** When the grant was last (re)approved (ISO string). */
  lastGrantedAt?: string;
}

export class ConnectedAgentsApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'> & { sessionId?: string }) {
    super(config);
  }

  /** List the agents the current user has connected. */
  async list(signal?: AbortSignal): Promise<IConnectedAgent[]> {
    const result = await this.fetchJson<{ agents: IConnectedAgent[] }>(
      'connected-agents',
      { signal },
      'Failed to load connected agents'
    );
    return result?.agents ?? [];
  }

  /** Disconnect one agent from the current user's account. */
  async revoke(clientId: string): Promise<void> {
    await this.fetchJson(
      'connected-agents/revoke',
      { method: 'POST', body: JSON.stringify({ clientId }) },
      'Failed to disconnect agent'
    );
  }
}
