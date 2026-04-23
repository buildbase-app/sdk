'use client';

import React, { createContext, useContext, useMemo } from 'react';

interface PermissionContextValue {
  /** Developer-defined app permissions per role */
  appPermissions: Record<string, string[]> | undefined;
}

const PermissionContext = createContext<PermissionContextValue>({
  appPermissions: undefined,
});

export function PermissionConfigProvider({
  appPermissions,
  children,
}: {
  appPermissions?: Record<string, string[]>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ appPermissions }), [appPermissions]);
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissionConfig() {
  return useContext(PermissionContext);
}
