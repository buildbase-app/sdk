// Re-export the class from its canonical location in api/services/
export { DevicesApi } from '../../api/services/devices-api';
export type { IDeviceView, IIpInfoLite } from '../../api/services/devices-api';

// React hook stays here (requires React, not part of core)
import { useMemo } from 'react';
import { DevicesApi } from '../../api/services/devices-api';
import { useSaaSOs } from '../os/hooks';

/** Memoized DevicesApi instance. Recreates only when serverUrl/version change. */
export function useDevicesApi(): DevicesApi {
  const os = useSaaSOs();
  return useMemo(() => new DevicesApi(os), [os.serverUrl, os.version]);
}
