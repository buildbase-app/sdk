// Re-export the class from its canonical location in api/services/
export { ConnectedAgentsApi } from '../../api/services/connected-agents-api';
export type { IConnectedAgent } from '../../api/services/connected-agents-api';

// React hook stays here (requires React, not part of core)
import { useMemo } from 'react';
import { ConnectedAgentsApi } from '../../api/services/connected-agents-api';
import { useSaaSOs } from '../os/hooks';

/** Memoized ConnectedAgentsApi instance. Recreates only when serverUrl/version change. */
export function useConnectedAgentsApi(): ConnectedAgentsApi {
  const os = useSaaSOs();
  return useMemo(() => new ConnectedAgentsApi(os), [os.serverUrl, os.version]);
}
