import { IAuthConfig } from '../auth/types';
import type { ISettings } from '../types';

/**
 * Supported API versions
 */
export enum ApiVersion {
  V1 = 'v1',
}

export interface IOsConfig {
  serverUrl: string;
  version: ApiVersion;
  orgId: string;
}

/** True when OS config has serverUrl, version, and orgId (ready for API calls). */
export function isOsConfigReady(
  config: Pick<IOsConfig, 'serverUrl' | 'version' | 'orgId'> | null | undefined
): boolean {
  return Boolean(config?.serverUrl && config?.version && config?.orgId);
}

/** Lifecycle of the one-time org-settings fetch. */
export type SettingsStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface IOsState extends IOsConfig {
  auth?: IAuthConfig;
  settings?: ISettings | null;
  /** State of the settings fetch — lets UI wait instead of guessing with `?? true` defaults. */
  settingsStatus?: SettingsStatus;
  settingsError?: string | null;
}
