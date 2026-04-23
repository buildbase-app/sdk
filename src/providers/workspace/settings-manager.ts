import { SettingsScreen } from './ui/SettingsDialog';
import type { WorkspaceSettingsSection } from './ui/SettingsDialog';

export interface SettingsManagerState {
  open: boolean;
  section: WorkspaceSettingsSection;
  /** Optional params carried from BB URL (e.g. plan selection from pricing page). Cleared on close. */
  params?: Record<string, string>;
}

/**
 * Global settings manager for workspace settings dialog
 * Handles opening/closing the dialog internally
 */
class WorkspaceSettingsManager {
  private listeners: Set<(state: SettingsManagerState) => void> = new Set();
  private currentState: SettingsManagerState = {
    open: false,
    section: SettingsScreen.Profile,
  };

  /**
   * Subscribe to settings dialog state changes
   */
  subscribe(listener: (state: SettingsManagerState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current state
   */
  getState(): SettingsManagerState {
    return { ...this.currentState };
  }

  /**
   * Open workspace settings dialog
   * @param section - Optional section to open to (defaults to 'profile')
   * @param params - Optional params to pass to the section (e.g. plan selection from BB URL)
   */
  openWorkspaceSettings(section?: WorkspaceSettingsSection, params?: Record<string, string>): void {
    this.currentState = {
      open: true,
      section: section || SettingsScreen.Profile,
      params,
    };
    this.notifyListeners();
  }

  /**
   * Close settings dialog
   */
  closeSettings(): void {
    this.currentState = {
      ...this.currentState,
      open: false,
      params: undefined,
    };
    this.notifyListeners();
  }

  /**
   * Change section without opening/closing
   */
  setSection(section: WorkspaceSettingsSection): void {
    this.currentState = {
      ...this.currentState,
      section,
    };
    this.notifyListeners();
  }

  /**
   * Clear params without changing open/section state
   */
  clearParams(): void {
    this.currentState = {
      ...this.currentState,
      params: undefined,
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.currentState);
    });
  }
}

// Export singleton instance
export const workspaceSettingsManager = new WorkspaceSettingsManager();
