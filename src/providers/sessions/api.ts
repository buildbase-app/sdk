// Re-export the class from its canonical location in api/services/
export { SessionsApi } from '../../api/services/sessions-api';
export type { ISessionView } from '../../api/services/sessions-api';

// React hook stays here (requires React, not part of core)
import { useMemo } from 'react';
import { SessionsApi } from '../../api/services/sessions-api';
import { useSaaSOs } from '../os/hooks';

/** Memoized SessionsApi instance. Recreates only when serverUrl/version change. */
export function useSessionsApi(): SessionsApi {
  const os = useSaaSOs();
  return useMemo(() => new SessionsApi(os), [os.serverUrl, os.version]);
}
