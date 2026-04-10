// Re-export the class from canonical location in api/services/
export { UserApi } from '../../api/services/user-api';

// React hook stays here (requires React, not part of core)
import { useMemo } from 'react';
import { UserApi } from '../../api/services/user-api';
import { useSaaSOs } from '../os/hooks';

/** Memoized UserApi instance. Recreates only when serverUrl or version change. */
export function useUserApi(): UserApi {
  const os = useSaaSOs();
  return useMemo(() => new UserApi(os), [os.serverUrl, os.version]);
}
