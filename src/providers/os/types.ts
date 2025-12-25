import { IAuthConfig } from '../auth/types';
import type { ISettings } from '../types';

export interface IOsConfig {
  serverUrl: string;
  version: string;
  orgId: string;
}

export interface IOsState extends IOsConfig {
  auth?: IAuthConfig;
  settings?: ISettings | null;
}
