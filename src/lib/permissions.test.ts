import { describe, expect, it } from 'vitest';
import type { WorkspaceLike } from './permissions';
import { DEFAULT_ROLE_PERMISSIONS, Permission, resolvePermissions } from './permissions';

const OWNER = 'user_owner';

function ws(overrides: Partial<WorkspaceLike> = {}): WorkspaceLike {
  return {
    _id: 'ws_1',
    createdBy: OWNER,
    users: [
      { _id: 'user_member', role: 'member' },
      { _id: 'user_admin', role: 'admin' },
      { _id: 'user_ghost', role: 'contractor' }, // role unknown to the SDK
    ],
    ...overrides,
  };
}

describe('resolvePermissions — revoke semantics', () => {
  it('grants SDK defaults when no overrides exist', () => {
    const perms = resolvePermissions({ userId: 'user_member', workspace: ws() });
    expect([...perms].sort()).toEqual([...DEFAULT_ROLE_PERMISSIONS.member].sort());
  });

  it('an explicit [] workspace override revokes everything for the role', () => {
    const perms = resolvePermissions({
      userId: 'user_member',
      workspace: ws({ permissions: { member: [] } }),
    });
    expect(perms.size).toBe(0);
  });

  it('an explicit [] org-settings override revokes (does not fall through to defaults)', () => {
    const perms = resolvePermissions({
      userId: 'user_member',
      workspace: ws(),
      settings: { workspace: { permissions: { member: [] } } },
    });
    expect(perms.size).toBe(0);
  });

  it('a workspace override wins over org settings and defaults', () => {
    const perms = resolvePermissions({
      userId: 'user_member',
      workspace: ws({ permissions: { member: [Permission.WORKSPACE_USAGE_VIEW] } }),
      settings: {
        workspace: { permissions: { member: [Permission.WORKSPACE_BILLING_VIEW] } },
      },
    });
    expect(perms.has(Permission.WORKSPACE_USAGE_VIEW)).toBe(true);
    expect(perms.has(Permission.WORKSPACE_BILLING_VIEW)).toBe(false);
  });

  it('an explicit [] workspace entry also clears developer app permissions', () => {
    const perms = resolvePermissions({
      userId: 'user_member',
      workspace: ws({ permissions: { member: [] } }),
      appPermissions: { member: ['reports:export'] },
    });
    expect(perms.has('reports:export')).toBe(false);
  });
});

describe('resolvePermissions — unknown roles', () => {
  it('denies unknown roles by default (no silent member fallback)', () => {
    const perms = resolvePermissions({ userId: 'user_ghost', workspace: ws() });
    expect(perms.size).toBe(0);
  });

  it('honors an explicitly-configured KNOWN defaultRole for unknown roles', () => {
    const perms = resolvePermissions({
      userId: 'user_ghost',
      workspace: ws(),
      settings: { workspace: { defaultRole: 'member' } },
    });
    expect([...perms].sort()).toEqual([...DEFAULT_ROLE_PERMISSIONS.member].sort());
  });

  it('ignores an unknown defaultRole (still denies)', () => {
    const perms = resolvePermissions({
      userId: 'user_ghost',
      workspace: ws(),
      settings: { workspace: { defaultRole: 'superuser' } },
    });
    expect(perms.size).toBe(0);
  });
});

describe('resolvePermissions — owner and restrictions', () => {
  it('owner always gets all platform permissions', () => {
    const perms = resolvePermissions({ userId: OWNER, workspace: ws() });
    for (const p of Object.values(Permission)) {
      expect(perms.has(p)).toBe(true);
    }
  });

  it('canInviteMembers: false strips the invite permission', () => {
    const perms = resolvePermissions({
      userId: 'user_admin',
      workspace: ws(),
      settings: { workspace: { canInviteMembers: false } },
    });
    expect(perms.has(Permission.WORKSPACE_MEMBERS_INVITE)).toBe(false);
  });

  it("canInviteMembers: 'admin-only' keeps invite for admin, strips it for member", () => {
    const settings = { workspace: { canInviteMembers: 'admin-only' as const } };
    const admin = resolvePermissions({ userId: 'user_admin', workspace: ws(), settings });
    const member = resolvePermissions({ userId: 'user_member', workspace: ws(), settings });
    expect(admin.has(Permission.WORKSPACE_MEMBERS_INVITE)).toBe(true);
    expect(member.has(Permission.WORKSPACE_MEMBERS_INVITE)).toBe(false);
  });
});
