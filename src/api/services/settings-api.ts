/**
 * Centralized API client for organization (OS) settings.
 * Extends BaseApi for shared URL/auth/request handling.
 */

import { BaseApi } from '../../lib/api-base';
import type { ISettings, IOsConfig } from './shared-types';

export class SettingsApi extends BaseApi {
  constructor(config: IOsConfig & { sessionId?: string }) {
    super({ ...config, requireOrgId: true });
  }

  async getSettings(signal?: AbortSignal): Promise<ISettings> {
    return this.fetchJson<ISettings>(
      `${this.orgId}/settings`,
      { signal },
      'Failed to fetch settings'
    );
  }
}
