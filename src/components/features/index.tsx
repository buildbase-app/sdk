import { useSaaSWorkspaces } from '../../providers/workspace/hooks';

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
