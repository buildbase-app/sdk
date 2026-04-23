'use client';

import { useCallback, useMemo } from 'react';
import { usePermissionConfig } from '../contexts/PermissionContext';
import { resolvePermissions, type WorkspaceLike } from '../lib/permissions';
import { getWorkspaceUserRole, isWorkspaceOwner } from '../lib/workspace-utils';
import { useSaaSAuth } from '../providers/auth/hooks';
import { useSaaSSettings } from '../providers/os/hooks';
import { useSaaSWorkspaces } from '../providers/workspace/hooks';

/**
 * Resolve the current user's permissions in the current (or specified) workspace.
 *
 * Returns both platform permissions (workspace:*, billing:*) managed by BuildBase
 * and app permissions (custom strings) defined by the developer.
 *
 * @example Platform permissions (automatic)
 * ```tsx
 * import { usePermissions, Permission } from '@buildbase/sdk/react';
 *
 * function InviteSection() {
 *   const { can } = usePermissions();
 *   if (!can(Permission.WORKSPACE_MEMBERS_INVITE)) return null;
 *   return <InviteForm />;
 * }
 * ```
 *
 * @example App permissions (developer-defined)
 * ```tsx
 * function ProjectActions() {
 *   const { can } = usePermissions();
 *   return (
 *     <>
 *       {can('projects:create') && <CreateButton />}
 *       {can('reports:export') && <ExportButton />}
 *     </>
 *   );
 * }
 * ```
 */
export function usePermissions(workspace?: WorkspaceLike | null) {
  const { user } = useSaaSAuth();
  const { currentWorkspace } = useSaaSWorkspaces();
  const { settings } = useSaaSSettings();
  const { appPermissions } = usePermissionConfig();

  const effectiveWorkspace: WorkspaceLike | null = workspace ?? currentWorkspace ?? null;
  const userId = user?.id ?? null;

  const workspaceRole = useMemo(
    () => (effectiveWorkspace ? getWorkspaceUserRole(effectiveWorkspace, userId) : null),
    [effectiveWorkspace, userId]
  );

  const isOwner = useMemo(
    () => (effectiveWorkspace ? isWorkspaceOwner(effectiveWorkspace, userId) : false),
    [effectiveWorkspace, userId]
  );

  const permissions = useMemo(
    () =>
      resolvePermissions({
        userId,
        workspaceRole,
        workspace: effectiveWorkspace,
        settings,
        appPermissions,
      }),
    [userId, workspaceRole, effectiveWorkspace, settings, appPermissions]
  );

  const can = useCallback(
    (permission: string | string[]): boolean => {
      if (Array.isArray(permission)) {
        return permission.every(p => permissions.has(p));
      }
      return permissions.has(permission);
    },
    [permissions]
  );

  return { can, permissions, isOwner, role: workspaceRole };
}
