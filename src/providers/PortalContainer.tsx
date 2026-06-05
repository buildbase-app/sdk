'use client';

import React, { createContext } from 'react';

// create global context for portal
export const PortalContext = createContext<{
  container: HTMLDivElement | null;
  setContainer: (container: HTMLDivElement | null) => void;
}>({
  container: null,
  setContainer: () => {},
});

const PortalProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({ container, setContainer }), [container]);

  return (
    <PortalContext.Provider value={contextValue}>
      {children}
      <div
        ref={setContainer}
        id="saas-os-portal"
        className="saas-os-ui"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </PortalContext.Provider>
  );
});

PortalProvider.displayName = 'PortalProvider';

export default PortalProvider;
