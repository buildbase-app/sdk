import { useUserFeatures } from '../../providers/user/hooks';
import { useSaaSWorkspaces } from '../../providers/workspace/hooks';

interface IProps {
  slug: string;
  children: React.ReactNode;
}

/**
 * Conditional component that renders children only when the specified workspace feature is enabled.
 * Checks feature flags at the workspace level.
 *
 * @param props - Component props
 * @param props.slug - Feature flag slug/key to check
 * @param props.children - Content to render when feature is enabled
 *
 * @example
 * ```tsx
 * function PremiumFeature() {
 *   return (
 *     <WhenWorkspaceFeatureEnabled slug="premium-analytics">
 *       <AnalyticsDashboard />
 *     </WhenWorkspaceFeatureEnabled>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Multiple features
 * function FeatureContent() {
 *   return (
 *     <>
 *       <WhenWorkspaceFeatureEnabled slug="feature-a">
 *         <FeatureA />
 *       </WhenWorkspaceFeatureEnabled>
 *       <WhenWorkspaceFeatureEnabled slug="feature-b">
 *         <FeatureB />
 *       </WhenWorkspaceFeatureEnabled>
 *     </>
 *   );
 * }
 * ```
 */
export const WhenWorkspaceFeatureEnabled = (props: IProps) => {
  const { children, slug } = props;
  const { currentWorkspace } = useSaaSWorkspaces();
  const currentFeature = currentWorkspace?.features?.[slug];
  if (!currentFeature) return null;
  return children;
};

/**
 * Conditional component that renders children only when the specified workspace feature is disabled.
 * Checks feature flags at the workspace level.
 *
 * @param props - Component props
 * @param props.slug - Feature flag slug/key to check
 * @param props.children - Content to render when feature is disabled
 *
 * @example
 * ```tsx
 * function UpgradePrompt() {
 *   return (
 *     <WhenWorkspaceFeatureDisabled slug="premium-feature">
 *       <UpgradeButton />
 *     </WhenWorkspaceFeatureDisabled>
 *   );
 * }
 * ```
 */
export const WhenWorkspaceFeatureDisabled = (props: IProps) => {
  const { children, slug } = props;
  const { currentWorkspace } = useSaaSWorkspaces();
  const currentFeature = currentWorkspace?.features?.[slug];
  if (currentFeature) return null;
  return children;
};

/**
 * Conditional component that renders children only when the specified user feature is enabled.
 * Checks feature flags at the user level (from UserProvider).
 *
 * @param props - Component props
 * @param props.slug - Feature flag slug/key to check
 * @param props.children - Content to render when feature is enabled
 *
 * @example
 * ```tsx
 * function BetaFeature() {
 *   return (
 *     <WhenUserFeatureEnabled slug="beta-access">
 *       <BetaContent />
 *     </WhenUserFeatureEnabled>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Edge case: Feature not loaded yet
 * function FeatureContent() {
 *   const { loading } = useUserFeatures();
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <WhenUserFeatureEnabled slug="feature-x">
 *       <FeatureX />
 *     </WhenUserFeatureEnabled>
 *   );
 * }
 * ```
 */
export const WhenUserFeatureEnabled = (props: IProps) => {
  const { children, slug } = props;
  const { isFeatureEnabled } = useUserFeatures();
  if (!isFeatureEnabled(slug)) return null;
  return children;
};

/**
 * Conditional component that renders children only when the specified user feature is disabled.
 * Checks feature flags at the user level (from UserProvider).
 *
 * @param props - Component props
 * @param props.slug - Feature flag slug/key to check
 * @param props.children - Content to render when feature is disabled
 *
 * @example
 * ```tsx
 * function UpgradePrompt() {
 *   return (
 *     <WhenUserFeatureDisabled slug="premium-access">
 *       <UpgradeButton />
 *     </WhenUserFeatureDisabled>
 *   );
 * }
 * ```
 */
export const WhenUserFeatureDisabled = (props: IProps) => {
  const { children, slug } = props;
  const { isFeatureEnabled } = useUserFeatures();
  if (isFeatureEnabled(slug)) return null;
  return children;
};

WhenWorkspaceFeatureEnabled.displayName = 'WhenWorkspaceFeatureEnabled';
WhenWorkspaceFeatureDisabled.displayName = 'WhenWorkspaceFeatureDisabled';
WhenUserFeatureEnabled.displayName = 'WhenUserFeatureEnabled';
WhenUserFeatureDisabled.displayName = 'WhenUserFeatureDisabled';
