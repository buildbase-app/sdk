/**
 * API client for the signed-in user's devices — the browsers/apps they have
 * signed in from. Session-authed (x-session-id + x-device-id), scoped to the
 * current user. Extends BaseApi for shared URL/auth/request handling.
 *
 * A device row is login history. Signing a device out revokes its live sessions
 * but keeps the row (shown as signed-out); "forget" also removes the row.
 */

import { BaseApi } from '../../lib/api-base';
import type { IOsConfig } from './shared-types';

/** Coarse geo/network info resolved from the request IP (a lightweight subset). */
export interface IIpInfoLite {
  ip?: string;
  hostname?: string;
  country?: string;
  city?: string;
  region?: string;
  /** "lat,long" string, as provided by the IP lookup. */
  loc?: string;
  timezone?: string;
}

/** A device the current user has signed in from. */
export interface IDeviceView {
  /** Stable per-browser/app identifier (the `x-device-id` the client sends). */
  deviceId: string;
  /** User-editable label (falls back to a derived name). */
  name: string;
  /** IP the device was last seen from. */
  ip: string;
  /** Resolved geo/network info for `ip`, when available. */
  ipInfo: IIpInfoLite | null;
  userAgent: string;
  origin: string;
  /** Whether the user marked this device trusted (longer sessions, fewer prompts). */
  trusted: boolean;
  /** ISO string — first time this device was seen. */
  firstSeenAt?: string;
  /** ISO string — most recent activity from this device. */
  lastActiveAt?: string;
  /** True when this is the device the request came from. */
  current: boolean;
  /** Number of live sessions currently on this device. */
  activeSessions: number;
  /** Whether this device has an active push-notification subscription. */
  pushEnabled: boolean;
}

export class DevicesApi extends BaseApi {
  constructor(config: Pick<IOsConfig, 'serverUrl' | 'version'> & { sessionId?: string }) {
    super(config);
  }

  /** List the devices the current user has signed in from. */
  async list(signal?: AbortSignal): Promise<IDeviceView[]> {
    const result = await this.fetchJson<{ devices: IDeviceView[] }>(
      'devices',
      { signal },
      'Failed to load devices'
    );
    return result?.devices ?? [];
  }

  /** Rename a device (its user-facing label). */
  async rename(deviceId: string, name: string, signal?: AbortSignal): Promise<void> {
    await this.fetchJson(
      this.apiPath`devices/${deviceId}`,
      { method: 'PATCH', body: JSON.stringify({ name }), signal },
      'Failed to rename device'
    );
  }

  /**
   * Sign a device out: revoke every live session born on it. The device stays
   * in the list as a signed-out device. Returns the number of sessions revoked.
   */
  async signOut(deviceId: string, signal?: AbortSignal): Promise<{ revokedSessions: number }> {
    return this.fetchJson<{ revokedSessions: number }>(
      this.apiPath`devices/${deviceId}`,
      { method: 'DELETE', signal },
      'Failed to sign out device'
    );
  }

  /**
   * Forget a device: sign it out AND remove the history row entirely.
   * Returns the number of sessions revoked in the process.
   */
  async forget(deviceId: string, signal?: AbortSignal): Promise<{ revokedSessions: number }> {
    return this.fetchJson<{ revokedSessions: number }>(
      `${this.apiPath`devices/${deviceId}`}?forget=true`,
      { method: 'DELETE', signal },
      'Failed to forget device'
    );
  }
}
