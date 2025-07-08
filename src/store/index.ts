import { configureStore } from '@reduxjs/toolkit';

import authReducer from '../providers/auth/reducer';
import osReducer from '../providers/os/reducer';
import workspacesReducer from '../providers/workspace/reducer';

export const store = configureStore({
  reducer: {
    os: osReducer,
    auth: authReducer,
    workspaces: workspacesReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
