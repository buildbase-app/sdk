import React, { createContext } from 'react'

// create global context for portal
export const PortalContext = createContext<{
  container: HTMLDivElement | null
  setContainer: (container: HTMLDivElement | null) => void
}>({
  container: null,
  setContainer: () => {}
})

export default function PortalProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

  return (
    <PortalContext.Provider value={{ container, setContainer }}>
      {children}
      <div ref={setContainer} id='saas-os-portal' className='saas-os-ui' />
    </PortalContext.Provider>
  )
}
