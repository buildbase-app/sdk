/**
 * Combined SDK state and dispatch types.
 * Single source of truth for the shape used by useAppSelector and useAppDispatch.
 */

import type { IAuthState } from '../../providers/auth/types';
import type { IOsState } from '../../providers/os/types';
import type { AuthAction } from '../AuthContext/types';
import type { OSAction } from '../OSContext/types';
import type { WorkspaceAction, WorkspaceState } from '../WorkspaceContext/types';

/** Combined SDK state (state only, no dispatch). Used by useAppSelector. */
export interface SDKState {
  os: IOsState;
  auth: IAuthState;
  workspaces: WorkspaceState;
}

/** Combined SDK dispatch. Used by useAppDispatch. */
export interface SDKDispatch {
  auth: (action: AuthAction) => void;
  os: (action: OSAction) => void;
  workspaces: (action: WorkspaceAction) => void;
}
