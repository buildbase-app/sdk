'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FullScreenLoader } from '../components/ui/full-screen-loader';
import { handleError } from '../lib/error-handler';

/** Props passed to the custom loadingComponent render function. */
export interface LoadingProps {
  /** Human-readable, locale-aware message describing what's happening */
  message: string;
}

/** Maximum time (ms) the loader can stay visible before auto-hiding as a safety net. */
const LOADER_TIMEOUT_MS = 60_000;

interface LoaderState {
  visible: boolean;
  message: string;
}

interface FullScreenLoaderContextValue {
  /** Show the full-screen loader with a message */
  show: (message: string) => void;
  /** Hide the full-screen loader */
  hide: () => void;
  /** Whether the loader is currently visible */
  visible: boolean;
  /** Current loader message */
  message: string;
}

const FullScreenLoaderContext = createContext<FullScreenLoaderContextValue | null>(null);

interface FullScreenLoaderProviderProps {
  children: React.ReactNode;
  /**
   * Custom content or render function for the loading screen.
   * The SDK handles the full-screen white backdrop and centering.
   *
   * - Pass a `ReactNode` for static content (logo, spinner).
   * - Pass a function to receive `{ message }` — the SDK manages which message to show.
   */
  loadingComponent?: React.ReactNode | ((props: LoadingProps) => React.ReactNode);
}

export const FullScreenLoaderProvider = ({
  children,
  loadingComponent,
}: FullScreenLoaderProviderProps) => {
  const [state, setState] = useState<LoaderState>({ visible: false, message: '' });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoaderTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearLoaderTimeout();
    setState({ visible: false, message: '' });
  }, [clearLoaderTimeout]);

  const show = useCallback(
    (message: string) => {
      clearLoaderTimeout();
      setState({ visible: true, message });

      // Safety net: auto-hide after timeout to prevent stuck loaders
      timeoutRef.current = setTimeout(() => {
        handleError(new Error('FullScreenLoader timed out — auto-hiding after 60s'), {
          component: 'FullScreenLoaderProvider',
          action: 'timeout',
        });
        setState({ visible: false, message: '' });
      }, LOADER_TIMEOUT_MS);
    },
    [clearLoaderTimeout]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => clearLoaderTimeout();
  }, [clearLoaderTimeout]);

  const value = useMemo(
    () => ({ show, hide, visible: state.visible, message: state.message }),
    [show, hide, state.visible, state.message]
  );

  const content =
    typeof loadingComponent === 'function'
      ? loadingComponent({ message: state.message })
      : loadingComponent;

  return (
    <FullScreenLoaderContext.Provider value={value}>
      {children}
      {state.visible && (
        <FullScreenLoader message={state.message}>{content}</FullScreenLoader>
      )}
    </FullScreenLoaderContext.Provider>
  );
};

FullScreenLoaderProvider.displayName = 'FullScreenLoaderProvider';

/**
 * Hook to control the full-screen loader from anywhere in the SDK.
 *
 * @example
 * ```tsx
 * const { show, hide } = useFullScreenLoader();
 *
 * show('Processing payment...');
 * await processPayment();
 * hide();
 * ```
 */
export function useFullScreenLoader(): FullScreenLoaderContextValue {
  const ctx = useContext(FullScreenLoaderContext);
  if (!ctx) {
    throw new Error('useFullScreenLoader must be used within FullScreenLoaderProvider');
  }
  return ctx;
}
