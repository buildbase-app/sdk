/**
 * Re-exports shared types used by API service classes.
 * This barrel prevents service files from importing directly from providers/.
 */

// OS config types
export { ApiVersion } from '../../providers/os/types';
export type { IOsConfig, IOsState } from '../../providers/os/types';

// Workspace types
export type { IWorkspace, IWorkspaceFeature, IWorkspaceUser } from '../../providers/workspace/types';

// Settings types
export type { ISettings } from '../../providers/types';
