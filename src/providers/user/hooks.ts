import { useContext, useMemo } from 'react';
import { UserContext } from './provider';

export { useUserApi } from './api';

/**
 * Hook to access user attributes from the UserProvider.
 * Must be used within a UserProvider component.
 *
 * @returns An object containing:
 * - `attributes`: Record of user attribute key-value pairs
 * - `loading`: Boolean indicating if attributes are being loaded (attributes pipeline only)
 * - `error`: Last attributes fetch/update error (null if no error)
 * - `refetch()`: Function to manually refresh attributes
 * - `updateAttributes(updates)`: Function to update multiple attributes
 * - `updateAttribute(key, value)`: Function to update one attribute
 *
 * @throws {Error} If used outside of UserProvider
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { attributes, loading } = useUserAttributes();
 *
 *   if (loading) return <Loading />;
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

  return useMemo(
    () => ({
      attributes: context.attributes,
      // Per-resource state: reflects the ATTRIBUTES pipeline only (a features
      // fetch no longer flips this hook's loading/error).
      loading: context.attributesLoading,
      error: context.attributesError,
      refetch: context.refreshAttributes,
      updateAttributes: context.updateAttributes,
      updateAttribute: context.updateAttribute,
      /** @deprecated Use `loading` (note: this legacy flag combines BOTH pipelines). */
      isLoading: context.isLoading,
      /** @deprecated Use `refetch`. */
      refreshAttributes: context.refreshAttributes,
    }),
    [context]
  );
}

/**
 * Hook to access user feature flags from the UserProvider.
 * Must be used within a UserProvider component.
 *
 * @returns An object containing:
 * - `features`: Record of feature flag key-value pairs (boolean values)
 * - `loading`: Boolean indicating if features are being loaded (features pipeline only)
 * - `error`: Last features fetch error (null if no error)
 * - `refetch()`: Function to manually refresh features
 * - `isFeatureEnabled(featureId)`: Function to check if a specific feature is enabled
 *
 * @throws {Error} If used outside of UserProvider
 *
 * @example
 * ```tsx
 * function FeatureContent() {
 *   const { isFeatureEnabled, loading } = useUserFeatures();
 *
 *   if (loading) return <Loading />;
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

  return useMemo(
    () => ({
      features: context.features,
      // Per-resource state: reflects the FEATURES pipeline only (an attributes
      // fetch/update no longer flips this hook's loading/error).
      loading: context.featuresLoading,
      error: context.featuresError,
      refetch: context.refreshFeatures,
      isFeatureEnabled: (featureId: string) => Boolean(context.features[featureId]),
      /** @deprecated Use `loading`. */
      isLoading: context.featuresLoading,
      /** @deprecated Use `refetch`. */
      refreshFeatures: context.refreshFeatures,
    }),
    [context]
  );
}
