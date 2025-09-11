import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IWorkspace, IWorkspaceFeature } from './types';

export interface IState {
  workspaces: IWorkspace[];
  loading: boolean;
  error: string | null;
  currentWorkspace: IWorkspace | null;
  refreshing: boolean;
  switching: boolean;
  isInitialized: boolean;
  allFeatures: IWorkspaceFeature[];
}
// Define the initial state using that type
const initialState = (): IState => {
  return {
    workspaces: [],
    loading: false,
    error: null,
    currentWorkspace: null,
    refreshing: false,
    switching: false,
    isInitialized: false,
    allFeatures: [],
  };
};

export const slice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    setWorkspaces: (state, action: PayloadAction<IWorkspace[]>) => {
      state.workspaces = action.payload;
    },
    setAllFeatures: (state, action: PayloadAction<IWorkspaceFeature[]>) => {
      state.allFeatures = action.payload;
    },
    setCurrentWorkspace: (state, action: PayloadAction<IWorkspace>) => {
      state.currentWorkspace = action.payload;
    },
    resetCurrentWorkspace: state => {
      state.currentWorkspace = null;
    },
    setIsInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
    setSwitching: (state, action: PayloadAction<boolean>) => {
      state.switching = action.payload;
    },
  },
});

export const {
  setWorkspaces,
  setCurrentWorkspace,
  setIsInitialized,
  setLoading,
  setError,
  setRefreshing,
  setSwitching,
  setAllFeatures,
  resetCurrentWorkspace,
} = slice.actions;

export default slice.reducer;
