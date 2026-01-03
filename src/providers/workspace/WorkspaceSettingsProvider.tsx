'use client';

import React, { useEffect, useState } from 'react';
import { useSaaSWorkspaces } from './hooks';
import { workspaceSettingsManager } from './settings-manager';
import type { WorkspaceSettingsSection } from './ui/SettingsDialog';
import WorkspaceSettingsDialog from './ui/SettingsDialog';

/**
 * WorkspaceSettingsProvider
 * Renders the settings dialog and manages its state internally
 * Users can call openWorkspaceSettings() from useWorkspaceSettings hook
 */
export const WorkspaceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentWorkspace } = useSaaSWorkspaces();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<WorkspaceSettingsSection>('profile');

  // Subscribe to settings manager changes
  useEffect(() => {
    // Sync initial state
    const initialState = workspaceSettingsManager.getState();
    setOpen(initialState.open);
    setSection(initialState.section);

    // Subscribe to changes
    const unsubscribe = workspaceSettingsManager.subscribe((isOpen, newSection) => {
      setOpen(isOpen);
      setSection(newSection);
    });

    return unsubscribe;
  }, []);

  return (
    <>
      {children}
      {currentWorkspace && (
        <WorkspaceSettingsDialog
          workspace={currentWorkspace}
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              workspaceSettingsManager.closeSettings();
            }
          }}
          section={section}
          onSectionChange={(newSection) => {
            workspaceSettingsManager.setSection(newSection);
          }}
          showTrigger={false}
        />
      )}
    </>
  );
};

