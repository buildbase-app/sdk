import { useContext } from 'react';
import { UserContext } from './provider';

export function useUserAttributes() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUserAttributes must be used within a UserProvider');
  }

  return context;
}

export function useUserFeatures() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUserFeatures must be used within a UserProvider');
  }

  return {
    features: context.features,
    isLoading: context.isLoading,
    error: context.error,
    refreshFeatures: context.refreshFeatures,
    isFeatureEnabled: (featureId: string) => Boolean(context.features[featureId]),
  };
}
