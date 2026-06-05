'use client';

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { SDKErrorBoundary } from '../../components/ErrorBoundary';
import { handleError } from '../../lib/error-handler';
import { BBAction, cleanBBParams, readBBParams } from '../../lib/url-params';
import { useSaaSWorkspaces } from './hooks';
import { workspaceSettingsManager } from './settings-manager';
import {
  SETTINGS_SCREENS,
  SettingsScreen,
  type WorkspaceSettingsSection,
} from './ui/SettingsDialog';

const WorkspaceSettingsDialog = lazy(() =>
  import('./ui/SettingsDialog').then(m => ({ default: m.default }))
);

/**
 * Resolve which settings section to open from BB params.
 * Priority: params.screen (explicit) → params.action (inferred) → null
 */
function resolveSection(params: Record<string, string>): WorkspaceSettingsSection | null {
  if (params.screen && SETTINGS_SCREENS.has(params.screen as WorkspaceSettingsSection)) {
    return params.screen as WorkspaceSettingsSection;
  }
  switch (params.action) {
    case BBAction.Checkout:
    case BBAction.Billing:
    case BBAction.SelectPlan:
      return SettingsScreen.Subscription;
    case BBAction.CreditPurchase:
      return SettingsScreen.Credits;
    default:
      return null;
  }
}

/**
 * WorkspaceSettingsProvider
 *
 * Manages the workspace settings dialog. Reads `?bb=` URL param
 * on mount to auto-open the dialog.
 *
 * Format: ?bb=key:value,key:value
 *
 * Examples:
 *   ?bb=screen:subscription
 *   ?bb=screen:users,ws:65abc123
 *   ?bb=action:checkout,status:success,ws:65abc123,screen:subscription
 */
export const WorkspaceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentWorkspace, switchToWorkspace, workspaces } = useSaaSWorkspaces();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<WorkspaceSettingsSection>(SettingsScreen.Profile);
  const urlHandledRef = useRef(false);

  // Subscribe to settings manager (programmatic open/close)
  useEffect(() => {
    const initialState = workspaceSettingsManager.getState();
    setOpen(initialState.open);
    setSection(initialState.section);
    const unsubscribe = workspaceSettingsManager.subscribe(state => {
      setOpen(state.open);
      setSection(state.section);
    });
    return unsubscribe;
  }, []);

  // Auto-open from URL params when workspace is ready
  useEffect(() => {
    if (urlHandledRef.current) return;
    if (!currentWorkspace) return;

    const bbParams = readBBParams();
    if (!bbParams) return;

    const targetSection = resolveSection(bbParams);
    if (!targetSection) {
      urlHandledRef.current = true;
      cleanBBParams();
      return;
    }

    // Switch workspace if needed
    const targetWs = bbParams.ws;
    if (targetWs && targetWs !== currentWorkspace._id) {
      const found = workspaces.find(ws => ws._id === targetWs);
      if (found) {
        switchToWorkspace(found).catch(err => {
          handleError(err, {
            component: 'WorkspaceSettingsProvider',
            action: 'switchWorkspaceFromUrl',
            metadata: { targetWs },
          });
          urlHandledRef.current = true;
          cleanBBParams();
        });
        return;
      }
      urlHandledRef.current = true;
      cleanBBParams();
      return;
    }

    // Open dialog — pass BB params so sections can read them (e.g. selectPlan)
    urlHandledRef.current = true;
    workspaceSettingsManager.openWorkspaceSettings(targetSection, bbParams);
    cleanBBParams();
  }, [currentWorkspace, workspaces, switchToWorkspace]);

  return (
    <>
      {children}
      {currentWorkspace && open && (
        <SDKErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <WorkspaceSettingsDialog
              workspace={currentWorkspace}
              open={open}
              onOpenChange={isOpen => {
                if (!isOpen) {
                  workspaceSettingsManager.closeSettings();
                }
              }}
              section={section}
              onSectionChange={newSection => {
                workspaceSettingsManager.setSection(newSection);
              }}
              showTrigger={false}
            />
          </Suspense>
        </SDKErrorBoundary>
      )}
    </>
  );
};
