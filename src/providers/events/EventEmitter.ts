import type { IUser } from '../../api/types';
import { handleError } from '../../lib/error-handler';
import type { IWorkspace } from '../workspace/types';
import type { EventData, EventType, IEventCallbacks } from './types';
import { SDKEvent } from './types';

/**
 * EventEmitter class to handle and trigger event callbacks
 * This class manages all event listeners and provides methods to trigger events
 */
export class EventEmitter {
  private callbacks: IEventCallbacks | null = null;

  /**
   * Set the event callbacks
   * @param callbacks - The event callbacks to register
   */
  setCallbacks(callbacks: IEventCallbacks | null): void {
    this.callbacks = callbacks;
  }

  /**
   * Get the current event callbacks
   * @returns The current event callbacks or null
   */
  getCallbacks(): IEventCallbacks | null {
    return this.callbacks;
  }

  /**
   * Emit an event
   * @param eventType - The type of event
   * @param data - The event data
   */
  private async emit(eventType: EventType, data: EventData): Promise<void> {
    if (this.callbacks?.handleEvent) {
      try {
        await this.callbacks.handleEvent(eventType, data);
      } catch (error) {
        handleError(error, {
          component: 'EventEmitter',
          action: 'emit',
          metadata: { eventType },
        });
      }
    }
  }

  /**
   * Trigger user created event
   * @param user - The newly created user
   */
  async emitUserCreated(user: IUser): Promise<void> {
    await this.emit(SDKEvent.UserCreated, { user });
  }

  /**
   * Trigger user updated event
   * @param user - The updated user
   * @param previousUser - The user data before the update (optional)
   */
  async emitUserUpdated(user: IUser, previousUser?: IUser): Promise<void> {
    await this.emit(SDKEvent.UserUpdated, { user, previousUser });
  }

  /**
   * Trigger workspace changed event
   * @param workspace - The newly selected workspace
   * @param previousWorkspace - The previously selected workspace (optional)
   */
  async emitWorkspaceChanged(
    workspace: IWorkspace,
    previousWorkspace?: IWorkspace | null
  ): Promise<void> {
    await this.emit(SDKEvent.WorkspaceChanged, { workspace, previousWorkspace });
  }

  /**
   * Trigger workspace updated event
   * @param workspace - The updated workspace
   */
  async emitWorkspaceUpdated(workspace: IWorkspace): Promise<void> {
    await this.emit(SDKEvent.WorkspaceUpdated, { workspace });
  }

  /**
   * Trigger workspace user added event
   * @param userId - The ID of the user that was added
   * @param workspace - The workspace the user was added to
   * @param role - The role assigned to the user
   */
  async emitWorkspaceUserAdded(userId: string, workspace: IWorkspace, role: string): Promise<void> {
    await this.emit(SDKEvent.WorkspaceUserAdded, { userId, workspace, role });
  }

  /**
   * Trigger workspace user removed event
   * @param userId - The ID of the user that was removed
   * @param workspace - The workspace the user was removed from
   * @param role - The role the user had in the workspace
   */
  async emitWorkspaceUserRemoved(
    userId: string,
    workspace: IWorkspace,
    role: string
  ): Promise<void> {
    await this.emit(SDKEvent.WorkspaceUserRemoved, { userId, workspace, role });
  }

  /**
   * Trigger workspace user role changed event
   * @param userId - The ID of the user whose role was changed
   * @param workspace - The workspace where the role was changed
   * @param previousRole - The previous role of the user
   * @param newRole - The new role of the user
   */
  async emitWorkspaceUserRoleChanged(
    userId: string,
    workspace: IWorkspace,
    previousRole: string,
    newRole: string
  ): Promise<void> {
    await this.emit(SDKEvent.WorkspaceUserRoleChanged, {
      userId,
      workspace,
      previousRole,
      newRole,
    });
  }

  /**
   * Trigger workspace created event
   * @param workspace - The newly created workspace
   */
  async emitWorkspaceCreated(workspace: IWorkspace): Promise<void> {
    await this.emit(SDKEvent.WorkspaceCreated, { workspace });
  }

  /**
   * Trigger workspace deleted event
   * @param workspace - The deleted workspace
   */
  async emitWorkspaceDeleted(workspace: IWorkspace): Promise<void> {
    await this.emit(SDKEvent.WorkspaceDeleted, { workspace });
  }
}

// Create a singleton instance
export const eventEmitter = new EventEmitter();
