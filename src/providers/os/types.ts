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

export interface IOsState extends IOsConfig {
  auth?: IAuthConfig;
  settings?: ISettings | null;
}
