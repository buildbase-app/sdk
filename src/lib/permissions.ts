/**
 * Role-based permission system.
 * Framework-agnostic — used by both React hooks and server-side BuildBase.
 *
 * Two types of permissions:
 *
 * 1. **Platform permissions** (ours) — prefixed with `workspace:`, control SDK
 *    built-in features (settings, billing, members, usage). Defined as constants
 *    in `Permission`. Enforced by the BuildBase backend.
 *
 * 2. **App permissions** (developer's) — any custom string (e.g. `projects:create`,
 *    `reports:export`). Defined and enforced by the developer in their own app.
 *    Flow through the same `usePermissions()` / `can()` / `<WhenPermission>` API.
 *
 * Both are resolved from the same role→permission map. Owner always gets all
 * platform permissions + any app permissions defined in the config.
 */

import {
  getWorkspaceUserRole,
  isWorkspaceOwner,
  type WorkspaceLike as WorkspaceBase,
} from './workspace-utils';

// ─── Platform Permission Constants ────────────────────────────────────────────

export const Permission = {
  // Workspace management
  WORKSPACE_SETTINGS_VIEW: 'workspace:settings:view',
  WORKSPACE_SETTINGS_EDIT: 'workspace:settings:edit',
  WORKSPACE_DELETE: 'workspace:delete',

  // Member management
  WORKSPACE_MEMBERS_VIEW: 'workspace:members:view',
  WORKSPACE_MEMBERS_INVITE: 'workspace:members:invite',
  WORKSPACE_MEMBERS_REMOVE: 'workspace:members:remove',
  WORKSPACE_MEMBERS_ROLE_CHANGE: 'workspace:members:role-change',

  // Features
  WORKSPACE_FEATURES_VIEW: 'workspace:features:view',
  WORKSPACE_FEATURES_EDIT: 'workspace:features:edit',

  // Billing / Subscription
  WORKSPACE_BILLING_VIEW: 'workspace:billing:view',
  WORKSPACE_BILLING_MANAGE: 'workspace:billing:manage',

  // Usage
  WORKSPACE_USAGE_VIEW: 'workspace:usage:view',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

/** All platform permission keys */
const ALL_PLATFORM_PERMISSIONS: PermissionKey[] = Object.values(Permission);

// ─── Default Role → Permission Mapping ────────────────────────────────────────

export type RolePermissionMap = Record<string, string[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMap = {
  admin: ALL_PLATFORM_PERMISSIONS.filter(p => p !== Permission.WORKSPACE_DELETE),
  member: [
    Permission.WORKSPACE_SETTINGS_VIEW,
    Permission.WORKSPACE_MEMBERS_VIEW,
    Permission.WORKSPACE_FEATURES_VIEW,
    Permission.WORKSPACE_BILLING_VIEW,
    Permission.WORKSPACE_USAGE_VIEW,
  ],
  viewer: [Permission.WORKSPACE_SETTINGS_VIEW, Permission.WORKSPACE_MEMBERS_VIEW],
};

// ─── Permission Context ───────────────────────────────────────────────────────

export interface WorkspaceLike extends WorkspaceBase {
  permissions?: Record<string, string[]>;
}

interface SettingsLike {
  workspace?: {
    defaultRole?: string;
    permissions?: Record<string, string[]>;
    canInviteMembers?: boolean | 'admin-only';
    canCreateWorkspace?: boolean | 'owner-only';
  };
}

export interface PermissionContext {
  userId: string | null;
  workspaceRole?: string | null;
  workspace: WorkspaceLike | null;
  settings?: SettingsLike | null;
  /** Developer-defined app permissions per role. Merged with platform defaults. */
  appPermissions?: Record<string, string[]>;
}

// ─── Resolution ───────────────────────────────────────────────────────────────

/**
 * Collect all unique permission strings across all roles in a permission map.
 */
function collectAllPermissions(map: Record<string, string[]>): string[] {
  const all = new Set<string>();
  for (const perms of Object.values(map)) {
    for (const p of perms) all.add(p);
  }
  return Array.from(all);
}

/**
 * Resolve the full set of permissions for a user in a workspace.
 *
 * Returns both platform permissions (workspace:*) and app permissions
 * (developer-defined custom strings) in a single Set.
 *
 * Resolution order (matches backend 3-tier):
 * 1. If user is workspace owner → all platform permissions + all app permissions
 * 2. workspace.permissions[role] (per-workspace overrides)
 * 3. settings.workspace.permissions[role] (org-level template)
 * 4. DEFAULT_ROLE_PERMISSIONS[role] (SDK built-in defaults)
 * 5. Merge in appPermissions (developer-defined) for the role
 * 6. If role not found → use an explicitly-configured, known `defaultRole`;
 *    otherwise deny (no silent 'member' fallback for unknown roles)
 * 7. Apply setting restrictions (canInviteMembers)
 */
export function resolvePermissions(ctx: PermissionContext): Set<string> {
  const { userId, workspace, settings, appPermissions } = ctx;

  // No workspace or user → no permissions
  if (!workspace || !userId) return new Set();

  // Owner always gets everything — platform + all app permissions from all sources
  if (isWorkspaceOwner(workspace, userId)) {
    const all = new Set<string>(ALL_PLATFORM_PERMISSIONS);
    if (appPermissions) {
      for (const p of collectAllPermissions(appPermissions)) all.add(p);
    }
    if (workspace.permissions) {
      for (const p of collectAllPermissions(workspace.permissions)) all.add(p);
    }
    if (settings?.workspace?.permissions) {
      for (const p of collectAllPermissions(settings.workspace.permissions)) all.add(p);
    }
    return all;
  }

  // Determine workspace role
  const role = ctx.workspaceRole ?? getWorkspaceUserRole(workspace, userId);
  if (!role) return new Set();

  // workspace.permissions stores BOTH platform (workspace:*) and app permissions together.
  // We resolve them independently so one type doesn't accidentally override the other.
  const workspacePerms = workspace.permissions;
  const orgPerms = settings?.workspace?.permissions;

  // Extract only workspace:-prefixed strings from a permission array
  const platformOnly = (perms: string[]) => perms.filter(p => p.startsWith('workspace:'));
  const appOnly = (perms: string[]) => perms.filter(p => !p.startsWith('workspace:'));

  // Presence, not non-emptiness: an explicit entry for `role` at a tier fully
  // defines that role's permissions at that tier — including an explicit `[]`,
  // which is a deliberate revoke that must win over lower tiers (previously a
  // `[]` override silently fell through to defaults, so a revoke did nothing).
  const hasWsEntry = !!workspacePerms && role in workspacePerms;
  const hasOrgEntry = !!orgPerms && role in orgPerms;
  const hasDefaultEntry = role in DEFAULT_ROLE_PERMISSIONS;

  // ── Platform permissions (workspace:*) ──
  // 3-tier: workspace overrides > org settings > SDK defaults
  let platformPerms: string[];
  if (hasWsEntry) {
    platformPerms = platformOnly(workspacePerms![role]);
  } else if (hasOrgEntry) {
    platformPerms = platformOnly(orgPerms![role]);
  } else if (hasDefaultEntry) {
    platformPerms = DEFAULT_ROLE_PERMISSIONS[role];
  } else {
    // Unknown role: deny by default. Only honor an explicitly-configured,
    // *known* `defaultRole` — never silently grant `member` permissions to an
    // unrecognized (possibly spoofed) role.
    const fallbackRole = settings?.workspace?.defaultRole;
    platformPerms =
      fallbackRole && fallbackRole in DEFAULT_ROLE_PERMISSIONS
        ? DEFAULT_ROLE_PERMISSIONS[fallbackRole]
        : [];
  }

  const permissions = new Set<string>(platformPerms);

  // ── App permissions (non-workspace:*) ──
  // 2-tier: an explicit workspace entry defines the role's app perms (empty =
  // none); otherwise fall back to developer defaults (SaaSOSProvider prop).
  const wsApp = hasWsEntry ? appOnly(workspacePerms![role]) : [];
  const defaultApp = appPermissions?.[role] ? appOnly(appPermissions[role]) : [];

  const appPermsForRole = hasWsEntry ? wsApp : defaultApp;
  for (const p of appPermsForRole) {
    permissions.add(p);
  }

  // Apply setting-based restrictions (platform permissions only)
  applySettingRestrictions(permissions, role, settings);

  return permissions;
}

/**
 * Check if a user has a specific permission (or all of an array).
 * Works with both platform permissions (Permission.WORKSPACE_*) and
 * app permissions (any custom string).
 */
export function hasPermission(permission: string | string[], ctx: PermissionContext): boolean {
  const permissions = resolvePermissions(ctx);
  if (Array.isArray(permission)) {
    return permission.every(p => permissions.has(p));
  }
  return permissions.has(permission);
}

// ─── Setting-Based Restrictions ───────────────────────────────────────────────

function applySettingRestrictions(
  permissions: Set<string>,
  role: string,
  settings?: SettingsLike | null
): void {
  if (!settings?.workspace) return;

  const { canInviteMembers } = settings.workspace;

  // canInviteMembers: false → nobody can invite
  // canInviteMembers: 'admin-only' → only admin role keeps invite permission
  if (canInviteMembers === false) {
    permissions.delete(Permission.WORKSPACE_MEMBERS_INVITE);
  } else if (canInviteMembers === 'admin-only' && role !== 'admin') {
    permissions.delete(Permission.WORKSPACE_MEMBERS_INVITE);
  }
}
