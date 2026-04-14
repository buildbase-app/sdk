'use client';

import { usePermissions } from '../hooks/usePermissions';

interface WhenPermissionProps {
  /** Single permission or array of permissions (all must be granted). Works with both platform permissions (Permission.*) and app permissions (custom strings). */
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditional component that renders children only when the current user
 * has the specified permission(s) in the current workspace.
 *
 * @example
 * ```tsx
 * import { WhenPermission, Permission } from '@buildbase/sdk/react';
 *
 * <WhenPermission permission={Permission.WORKSPACE_MEMBERS_INVITE}>
 *   <InviteForm />
 * </WhenPermission>
 *
 * <WhenPermission
 *   permission={[Permission.WORKSPACE_BILLING_VIEW, Permission.WORKSPACE_BILLING_MANAGE]}
 *   fallback={<p>You don't have access to billing.</p>}
 * >
 *   <BillingDashboard />
 * </WhenPermission>
 * ```
 */
export const WhenPermission = (props: WhenPermissionProps) => {
  const { children, fallback, permission } = props;
  const { can } = usePermissions();

  if (!can(permission)) {
    return fallback ?? null;
  }
  return children;
};

WhenPermission.displayName = 'WhenPermission';
