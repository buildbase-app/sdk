import { ReactNode } from 'react';
import { Context } from '../api';
import { IAuth } from '../api/context';

// Provider Props
export interface SaaSOSProviderProps {
  serverUrl: string;
  version: string;
  orgId: string;
  auth?: IAuth;
  children: ReactNode;
}

// Context Value
export interface SaaSOSContextValue {
  context: Context;
}

export type { Context };
