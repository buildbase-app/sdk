import type { IUser } from '../../api/types';
import type { IWorkspace } from '../workspace/types';

/**
 * Event types for all SDK events
 */
export type EventType =
  | 'user:created'
  | 'user:updated'
  | 'workspace:changed'
  | 'workspace:updated'
  | 'workspace:user-added'
  | 'workspace:user-removed'
  | 'workspace:user-role-changed'
  | 'workspace:created'
  | 'workspace:deleted';

/**
 * Event data types for each event
 */
export interface UserCreatedEventData {
  user: IUser;
}

export interface UserUpdatedEventData {
  user: IUser;
  previousUser?: IUser;
}

export interface WorkspaceChangedEventData {
  workspace: IWorkspace;
  previousWorkspace?: IWorkspace | null;
}

export interface WorkspaceUpdatedEventData {
  workspace: IWorkspace;
}

export interface WorkspaceUserAddedEventData {
  userId: string;
  workspace: IWorkspace;
  role: string;
}

export interface WorkspaceUserRemovedEventData {
  userId: string;
  workspace: IWorkspace;
  role: string;
}

export interface WorkspaceUserRoleChangedEventData {
  userId: string;
  workspace: IWorkspace;
  previousRole: string;
  newRole: string;
}

export interface WorkspaceCreatedEventData {
  workspace: IWorkspace;
}

export interface WorkspaceDeletedEventData {
  workspace: IWorkspace;
}

/**
 * Union type for all event data
 */
export type EventData =
  | UserCreatedEventData
  | UserUpdatedEventData
  | WorkspaceChangedEventData
  | WorkspaceUpdatedEventData
  | WorkspaceUserAddedEventData
  | WorkspaceUserRemovedEventData
  | WorkspaceUserRoleChangedEventData
  | WorkspaceCreatedEventData
  | WorkspaceDeletedEventData;

/**
 * Single event callback function
 * Handles all events with conditional logic based on event type
 */
export interface IEventCallbacks {
  /**
   * Called when any event occurs
   * @param eventType - The type of event that occurred
   * @param data - The event data (type varies based on eventType)
   */
  handleEvent?: (eventType: EventType, data: EventData) => void | Promise<void>;
}
