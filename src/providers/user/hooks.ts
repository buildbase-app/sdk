import { useContext } from 'react';
import { UserContext } from './provider';

export { useUserApi } from './api';

/**
 * Hook to access user attributes from the UserProvider.
 * Must be used within a UserProvider component.
 *
 * @returns User context object containing:
 * - `attributes`: Record of user attribute key-value pairs
 * - `isLoading`: Boolean indicating if attributes are being loaded
 * - `error`: Error message string (null if no error)
 * - `refreshAttributes()`: Function to manually refresh attributes
 *
 * @throws {Error} If used outside of UserProvider
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { attributes, isLoading } = useUserAttributes();
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <p>Plan: {attributes?.plan}</p>
 *       <p>Company: {attributes?.company}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserAttributes() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUserAttributes must be used within a UserProvider');
  }

  return context;
}

/**
 * Hook to access user feature flags from the UserProvider.
 * Must be used within a UserProvider component.
 *
 * @returns An object containing:
 * - `features`: Record of feature flag key-value pairs (boolean values)
 * - `isLoading`: Boolean indicating if features are being loaded
 * - `error`: Error message string (null if no error)
 * - `refreshFeatures()`: Function to manually refresh features
 * - `isFeatureEnabled(featureId)`: Function to check if a specific feature is enabled
 *
 * @throws {Error} If used outside of UserProvider
 *
 * @example
 * ```tsx
 * function FeatureContent() {
 *   const { isFeatureEnabled, isLoading } = useUserFeatures();
 *
 *   if (isLoading) return <Loading />;
 *
 *   if (isFeatureEnabled('premium-feature')) {
 *     return <PremiumFeature />;
 *   }
 *
 *   return <BasicFeature />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Check multiple features
 * function Dashboard() {
 *   const { isFeatureEnabled } = useUserFeatures();
 *
 *   return (
 *     <div>
 *       {isFeatureEnabled('analytics') && <Analytics />}
 *       {isFeatureEnabled('reports') && <Reports />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserFeatures() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUserFeatures must be used within a UserProvider');
  }

  return {
    features: context.features,
    // Per-resource state: reflects the FEATURES pipeline only (an attributes
    // fetch/update no longer flips this hook's loading/error).
    isLoading: context.featuresLoading,
    error: context.featuresError,
    refreshFeatures: context.refreshFeatures,
    isFeatureEnabled: (featureId: string) => Boolean(context.features[featureId]),
  };
}
