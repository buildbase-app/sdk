import { SettingsScreen } from './ui/SettingsDialog';
import type { WorkspaceSettingsSection } from './ui/SettingsDialog';

/**
 * Global settings manager for workspace settings dialog
 * Handles opening/closing the dialog internally
 */
class WorkspaceSettingsManager {
  private listeners: Set<(open: boolean, section: WorkspaceSettingsSection) => void> = new Set();
  private currentState: {
    open: boolean;
    section: WorkspaceSettingsSection;
  } = {
    open: false,
    section: SettingsScreen.Profile,
  };

  /**
   * Subscribe to settings dialog state changes
   */
  subscribe(listener: (open: boolean, section: WorkspaceSettingsSection) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current state
   */
  getState(): { open: boolean; section: WorkspaceSettingsSection } {
    return { ...this.currentState };
  }

  /**
   * Open workspace settings dialog
   * @param section - Optional section to open to (defaults to 'profile')
   */
  openWorkspaceSettings(section?: WorkspaceSettingsSection): void {
    this.currentState = {
      open: true,
      section: section || SettingsScreen.Profile,
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

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.currentState.open, this.currentState.section);
    });
  }
}

// Export singleton instance
export const workspaceSettingsManager = new WorkspaceSettingsManager();
