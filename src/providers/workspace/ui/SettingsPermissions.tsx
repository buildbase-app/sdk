'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { StatusBanner } from '../../../components/ui/status-banner';
import { Switch } from '../../../components/ui/switch';
import { usePermissionConfig } from '../../../contexts/PermissionContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSuccessMessage } from '../../../hooks/useSuccessMessage';
import { useTranslation } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { useSaaSSettings } from '../../os/hooks';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import NoPermission from './NoPermission';
import SettingSkeleton from './Skeleton';

/**
 * Permissions editor for the SDK settings dialog.
 * Shows app permissions defined by the developer (via SaaSOSProvider `defaultPermissions` prop).
 * Workspace owners can customize which roles get which permissions — saved to backend.
 *
 * Merge order: workspace.permissions (backend) > developer defaults (prop)
 */
const WorkspaceSettingsPermissions: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const { t } = useTranslation();
  const { isOwner } = usePermissions();
  const { settings } = useSaaSSettings();
  const { appPermissions } = usePermissionConfig();
  const { updateWorkspacePermissions } = useSaaSWorkspaces();
  const [isSaving, setIsSaving] = useState(false);
  const success = useSuccessMessage();

  const roles = useMemo(
    () => settings?.workspace?.roles ?? workspace.roles ?? [],
    [settings?.workspace?.roles, workspace.roles]
  );

  // Collect all unique app permission strings from the developer's defaults
  const allAppPermissions = useMemo(() => {
    if (!appPermissions) return [];
    const all = new Set<string>();
    for (const perms of Object.values(appPermissions)) {
      for (const p of perms) {
        if (!p.startsWith('workspace:')) all.add(p);
      }
    }
    return Array.from(all).sort();
  }, [appPermissions]);

  // Build the editable permission map:
  // workspace.permissions (backend overrides) > appPermissions (developer defaults)
  const [permMap, setPermMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!appPermissions) return;
    const backendPerms = workspace.permissions;
    const initial: Record<string, string[]> = {};
    for (const role of roles) {
      if (backendPerms && role in backendPerms) {
        // Filter to only app permissions (not workspace: prefixed)
        initial[role] = backendPerms[role].filter(p => !p.startsWith('workspace:'));
      } else if (role in appPermissions) {
        initial[role] = appPermissions[role].filter(p => !p.startsWith('workspace:'));
      } else {
        initial[role] = [];
      }
    }
    setPermMap(initial);
  }, [workspace.permissions, appPermissions, roles]);

  if (!workspace) return <SettingSkeleton />;

  if (!appPermissions || allAppPermissions.length === 0) return null;

  const toggle = (role: string, permission: string) => {
    setPermMap(prev => {
      const current = prev[role] ?? [];
      const has = current.includes(permission);
      return {
        ...prev,
        [role]: has ? current.filter(p => p !== permission) : [...current, permission],
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    success.clear();
    try {
      // Merge app permissions with existing platform permissions (workspace:* prefixed)
      // so we don't wipe platform overrides set via the admin dashboard
      const existing = workspace.permissions ?? {};
      const merged: Record<string, string[]> = {};
      const allRoles = new Set([...Object.keys(existing), ...Object.keys(permMap)]);
      for (const role of allRoles) {
        const existingPlatform = (existing[role] ?? []).filter(p => p.startsWith('workspace:'));
        const newApp = permMap[role] ?? [];
        merged[role] = [...existingPlatform, ...newApp];
      }
      await updateWorkspacePermissions(workspace._id, merged);
      success.show(t('permissions.saveSuccess'));
    } catch (error) {
      handleError(error, {
        component: 'WorkspaceSettingsPermissions',
        action: 'savePermissions',
        metadata: { workspaceId: workspace._id },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {success.message && (
        <StatusBanner
          variant="success"
          title={t('settings.common.success')}
          message={success.message}
          className="mb-4"
        />
      )}

      {!isOwner && <NoPermission descriptionKey="permissions.ownerOnly" />}

      <p className="text-sm text-muted-foreground mb-4">{t('permissions.description')}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-start py-2 pe-4 font-medium text-muted-foreground min-w-[160px]"></th>
              {roles.map(role => (
                <th
                  key={role}
                  className="text-center py-2 px-3 font-medium text-foreground capitalize min-w-[80px]"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allAppPermissions.map(perm => (
              <tr key={perm} className="border-b border-border/40 hover:bg-muted/30">
                <td className="py-2 pe-4 text-foreground font-mono text-xs">{perm}</td>
                {roles.map(role => {
                  const isAdmin = role === 'admin';
                  const checked = isAdmin || (permMap[role] ?? []).includes(perm);
                  return (
                    <td key={role} className="text-center py-2 px-3">
                      <Switch
                        checked={checked}
                        disabled={!isOwner || isAdmin}
                        onCheckedChange={() => toggle(role, perm)}
                        className="mx-auto"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="mt-6">
          <Button onClick={handleSave} disabled={isSaving} progress={isSaving}>
            {isSaving ? t('permissions.saving') : t('permissions.save')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsPermissions;
