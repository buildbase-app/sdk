import type { AuthContextValue } from '../AuthContext/types';
import type { OSContextValue } from '../OSContext/types';
import type { WorkspaceContextValue } from '../WorkspaceContext/types';

/**
 * Combined SDK Context Value
 * Represents the complete context structure across all contexts
 */
export interface SDKContextValue {
  auth: AuthContextValue;
  workspace: WorkspaceContextValue;
  os: OSContextValue;
}

