import { useContext } from 'react';
import { UserContext } from './provider';

export function useUserAttributes() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUserAttributes must be used within a UserProvider');
  }

  return context;
}
