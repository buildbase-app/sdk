import { useSaaSAuth } from '../../providers/auth/hooks';
import { useSaaSWorkspaces } from '../../providers/workspace/hooks';

interface IProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditional component that renders children only when user has one of the specified roles.
 * Checks the user's global role (not workspace-specific).
 *
 * @param props - Component props
 * @param props.roles - Array of role strings to check against user's role
 * @param props.children - Content to render when user has matching role
 * @param props.fallback - Optional content to render when user doesn't have matching role (default: null)
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   return (
 *     <WhenRoles roles={['admin', 'super-admin']}>
 *       <AdminContent />
 *     </WhenRoles>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With fallback
 * function SettingsPage() {
 *   return (
 *     <WhenRoles
 *       roles={['admin']}
 *       fallback={<p>You don't have permission to access this page.</p>}
 *     >
 *       <AdminSettings />
 *     </WhenRoles>
 *   );
 * }
 * ```
 */
export const WhenRoles = (props: IProps) => {
  const { children, fallback, roles } = props;
  const { user } = useSaaSAuth();
  if (!roles.includes(user?.role ?? '')) {
    if (fallback) return fallback;
    return null;
  }
  return children;
};

/**
 * Conditional component that renders children only when user has one of the specified roles
 * in the current workspace. Checks workspace-specific role, not global role.
 *
 * @param props - Component props
 * @param props.roles - Array of role strings to check against user's workspace role
 * @param props.children - Content to render when user has matching workspace role
 * @param props.fallback - Optional content to render when user doesn't have matching role (default: null)
 *
 * @example
 * ```tsx
 * function WorkspaceSettings() {
 *   return (
 *     <WhenWorkspaceRoles roles={['owner', 'admin']}>
 *       <SettingsContent />
 *     </WhenWorkspaceRoles>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Edge case: User not in current workspace
 * function WorkspaceContent() {
 *   return (
 *     <WhenWorkspaceRoles
 *       roles={['member']}
 *       fallback={<p>You are not a member of this workspace.</p>}
 *     >
 *       <WorkspaceDashboard />
 *     </WhenWorkspaceRoles>
 *   );
 * }
 * ```
 */
export const WhenWorkspaceRoles = (props: IProps) => {
  const { children, fallback, roles } = props;
  const { user } = useSaaSAuth();
  const { currentWorkspace } = useSaaSWorkspaces();
  const workspaceUser = currentWorkspace?.users.find(
    workspaceUser => workspaceUser._id === user?.id
  );
  if (!workspaceUser) {
    if (fallback) return fallback;
    return null;
  }
  if (!roles.includes(workspaceUser?.role ?? '')) {
    if (fallback) return fallback;
    return null;
  }
  return children;
};

WhenRoles.displayName = 'WhenRoles';
WhenWorkspaceRoles.displayName = 'WhenWorkspaceRoles';
