import { useSaaSAuth } from '../../providers/auth/hooks';
import { useSaaSWorkspaces } from '../../providers/workspace/hooks';

interface IProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const WhenRoles = (props: IProps) => {
  const { children, fallback, roles } = props;
  const { user } = useSaaSAuth();
  if (!roles.includes(user?.role ?? '')) {
    if (fallback) return fallback;
    return null;
  }
  return children;
};

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
