'use client';

import { createContextProvider } from '../shared/createContext';
import { getInitialWorkspaceState, workspaceReducer } from './reducer';
import type { WorkspaceAction, WorkspaceContextValue, WorkspaceState } from './types';

const { Provider, useContext, useState, useDispatch, useSelector, useStore } =
  createContextProvider<WorkspaceState, WorkspaceAction>({
    name: 'Workspace',
    initialState: getInitialWorkspaceState(),
    reducer: workspaceReducer,
  });

export const WorkspaceContextProvider = Provider;
export const useWorkspaceContext = (): WorkspaceContextValue => useContext();
export const useWorkspaceState = useState;
export const useWorkspaceDispatch = useDispatch;
export const useWorkspaceSelector = useSelector;
/** Internal: raw store access for cross-context subscriptions (useAppSelector). */
export const useWorkspaceStore = useStore;
