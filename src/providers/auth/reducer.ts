import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { AuthSession, IAuthState } from './types';

export const AUTH_TOKEN_KEY = 'saas_os_auth_token';

export function loadUserFromCookies(): { session: AuthSession | null } {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      const session: AuthSession = JSON.parse(token);

      // Check if session is expired
      if (new Date(session.expires) > new Date()) {
        return { session };
      } else {
        // Session expired, clear storage
        removeCredentials();
      }
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
    // Clear corrupted data
    removeCredentials();
  }

  return { session: null };
}

export function saveCredentials(session: AuthSession) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(session));
  }
}

export function removeCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

// Define the initial state using that type
const initialState = (): IAuthState => {
  const { session } = loadUserFromCookies();
  return {
    user: session?.user || null,
    session: session || null,
    isLoading: false,
    isAuthenticated: session ? true : false,
    isRedirecting: false,
    status: session ? 'authenticated' : 'unauthenticated',
  };
};

export const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authenticationStarted: state => {
      state.isLoading = true;
      state.isAuthenticated = false;
      state.isRedirecting = true;
      state.status = 'authenticating';
    },
    authenticationFailed: state => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.isRedirecting = false;
      state.status = 'unauthenticated';
    },
    setSession: (state, action: PayloadAction<AuthSession>) => {
      state.session = action.payload;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.isRedirecting = false;
      state.isLoading = false;
      state.status = 'authenticated';
      saveCredentials(action.payload);
    },
    removeSession: state => {
      state.user = null;
      state.session = null;
      state.isLoading = false;
      state.isAuthenticated = false;
      state.isRedirecting = false;
      state.status = 'unauthenticated';
      removeCredentials();
    },
  },
});

export const { setSession, removeSession, authenticationFailed, authenticationStarted } =
  slice.actions;

export default slice.reducer;
