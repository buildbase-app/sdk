/**
 * API client for the signed-in user's active sessions. Session-authed
 * (x-session-id), scoped to the current user. Extends BaseApi for shared
 * URL/auth/request handling.
 *
 * The raw session id is never exposed — a session's public handle is its
 * mirror-row id (`ISessionView.id`), which is what `revoke` takes.
 * "Sign out everywhere" / "sign out current" stay on the auth logout flow.
 */

import { BaseApi } from '../../lib/api-base';
import type { IIpInfoLite } from './devices-api';
import type { IOsConfig } from './shared-types';

/** One live session of the current user, joined to its device's label. */
export interface ISessionView {
  /** Public handle (mirror-row id) — NOT the raw session id. Use for `revoke`. */
  id: string;
  /** The device this session was born on. */
  deviceId: string;
  /** OAuth client id, or 'first-party' for a normal app sign-in. */
  clientId: string;
  ip: string;
  ipInfo: IIpInfoLite | null;
  userAgent: string;
  origin: string;
  /** ISO string. */
  createdAt?: string;
  /** ISO string. */
  lastActiveAt?: string;
  /** ISO string — when the session expires (reflects the org session policy). */
  expiresAt?: string;
  /** True when this is the session making the request. */
  current: boolean;
  /** The device's label only; ip/userAgent/etc. live on the session itself. */
  device: { name: string } | null;
}

export class SessionsApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'> & { sessionId?: string }) {
    super(config);
  }

  /** List the current user's live sessions (each joined to its device label). */
  async list(signal?: AbortSignal): Promise<ISessionView[]> {
    const result = await this.fetchJson<{ sessions: ISessionView[] }>(
      'sessions',
      { signal },
      'Failed to load sessions'
    );
    return result?.sessions ?? [];
  }

  /** Sign out one session by its public handle (`ISessionView.id`). */
  async revoke(id: string, signal?: AbortSignal): Promise<void> {
    await this.fetchJson(
      this.apiPath`sessions/${id}`,
      { method: 'DELETE', signal },
      'Failed to sign out session'
    );
  }
}
