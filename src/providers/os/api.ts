/**
 * Centralized API client for organization (OS) settings.
 * Extends BaseApi for shared URL/auth/request handling.
 */

import { BaseApi } from '../../lib/api-base';
import type { ISettings } from '../types';
import type { IOsConfig } from './types';

export class SettingsApi extends BaseApi {
  constructor(config: IOsConfig) {
    super(config);
  }

  async getSettings(signal?: AbortSignal): Promise<ISettings> {
    if (!this.orgId) {
      throw new Error('orgId is required for getSettings');
    }
    return this.fetchJson<ISettings>(
      `${this.orgId}/settings`,
      { signal },
      'Failed to fetch settings'
    );
  }
}
