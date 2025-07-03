import { Context } from '../api'
import { ReactNode } from 'react'

// Provider Props
export interface SaaSOSProviderProps {
  serverUrl: string
  version: string
  orgId: string
  children: ReactNode
}

// Context Value
export interface SaaSOSContextValue {
  context: Context
}

export type { Context }
