import { useSaaSWorkspaces } from '../../providers/workspace/hooks';
import { useUserFeatures } from '../../providers/user/hooks';

interface IProps {
  slug: string;
  children: React.ReactNode;
}

export const WhenWorkspaceFeatureEnabled = (props: IProps) => {
  const { children, slug } = props;
  const { currentWorkspace } = useSaaSWorkspaces();
  const currentFeature = currentWorkspace?.features?.[slug];
  if (!currentFeature) return null;
  return children;
};

export const WhenWorkspaceFeatureDisabled = (props: IProps) => {
  const { children, slug } = props;
  const { currentWorkspace } = useSaaSWorkspaces();
  const currentFeature = currentWorkspace?.features?.[slug];
  if (currentFeature) return null;
  return children;
};

export const WhenUserFeatureEnabled = (props: IProps) => {
  const { children, slug } = props;
  const { isFeatureEnabled } = useUserFeatures();
  if (!isFeatureEnabled(slug)) return null;
  return children;
};

export const WhenUserFeatureDisabled = (props: IProps) => {
  const { children, slug } = props;
  const { isFeatureEnabled } = useUserFeatures();
  if (isFeatureEnabled(slug)) return null;
  return children;
};
