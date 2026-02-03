export type { IBetaConfig } from '../components/beta/api';

/** Central SDK APIs – all extend BaseApi for shared URL/auth/request handling. */
export { BaseApi } from '../lib/api-base';
export type { IBaseApiConfig } from '../lib/api-base';
export { SettingsApi } from '../providers/os/api';
export { UserApi } from '../providers/user/api';
export { WorkspaceApi } from '../providers/workspace/api';
