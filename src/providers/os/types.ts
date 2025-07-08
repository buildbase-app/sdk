import { IAuthConfig } from '../auth/types';

export interface IOsConfig {
  serverUrl: string;
  version: string;
  orgId: string;
}

export interface IOsState extends IOsConfig {
  auth?: IAuthConfig;
}
