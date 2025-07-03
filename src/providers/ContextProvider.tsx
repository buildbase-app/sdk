import React, {
  createContext,
  useContext as useReactContext,
  useMemo
} from 'react'
import { SaaSOSProviderProps, SaaSOSContextValue } from '../types'
import { Context } from '../api'
import '../styles/globals.css'

const SaaSOSContext = createContext<SaaSOSContextValue | null>(null)

// Error boundary for form components
class FormErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode
    fallback?: React.ReactNode
  }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div>Something went wrong with the form component.</div>
        )
      )
    }
    return this.props.children
  }
}

/**
 * Hook to access the SaaS OS SDK context
 * @returns The SaaS OS SDK context instance
 * @throws Error if used outside of SaaSOSProvider
 */
export const useSaaSOS = () => {
  const context = useReactContext(SaaSOSContext)
  if (!context) {
    throw new Error('useSaaSOS must be used within a SaaSOSProvider')
  }
  return context
}

/**
 * Provider component for SaaS OS SDK
 * @param props - The provider props
 * @returns The provider component
 */
export const SaaSOSProvider: React.FC<SaaSOSProviderProps> = ({
  serverUrl,
  version,
  orgId,
  children,
  components,
  defaultProps = {}
}) => {
  const contextValue = useMemo(
    () => ({
      context: new Context(serverUrl, version, orgId),
      components,
      defaultProps
    }),
    [serverUrl, version, orgId, components, defaultProps]
  )

  return (
    <FormErrorBoundary>
      <div className='saas-os-ui'>
        <SaaSOSContext.Provider value={contextValue}>
          {children}
        </SaaSOSContext.Provider>
      </div>
    </FormErrorBoundary>
  )
}
