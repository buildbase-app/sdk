import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { IOsState } from './types';

// Define the initial state using that type
const initialState = (): IOsState => {
  return {
    serverUrl: '',
    version: '',
    orgId: '',
  };
};

export const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSaaSOSConfig: (state, action: PayloadAction<IOsState>) => {
      return {
        ...state,
        ...action.payload,
      };
    },
    removeSaaSOSConfig: state => {
      return initialState();
    },
  },
});

export const { setSaaSOSConfig, removeSaaSOSConfig } = slice.actions;

export default slice.reducer;
