'use client';

import React, { Component, type ReactNode } from 'react';
import { handleError } from '../lib/error-handler';
import { sdkError } from '../lib/logger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Fallback UI to render when an error occurs
   */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  /**
   * Called when an error is caught
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * Whether to reset error state when children change
   * @default true
   */
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching React component errors.
 * Wraps SDK components to prevent crashes from propagating to the entire app.
 * Automatically logs errors using the SDK error handler.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SDKErrorBoundary
 *       fallback={(error, reset) => (
 *         <div>
 *           <p>Error: {error.message}</p>
 *           <button onClick={reset}>Try Again</button>
 *         </div>
 *       )}
 *       onError={(error, errorInfo) => {
 *         // Custom error reporting
 *         reportError(error, errorInfo);
 *       }}
 *     >
 *       <YourApp />
 *     </SDKErrorBoundary>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Simple usage with default fallback
 * function App() {
 *   return (
 *     <SDKErrorBoundary>
 *       <YourApp />
 *     </SDKErrorBoundary>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Disable auto-reset on props change
 * function App() {
 *   return (
 *     <SDKErrorBoundary resetOnPropsChange={false}>
 *       <YourApp />
 *     </SDKErrorBoundary>
 *   );
 * }
 * ```
 */
export class SDKErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error with context
    handleError(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        // Prevent error in error handler from causing issues
        sdkError('[SDK ErrorBoundary] Error in onError callback:', handlerError);
      }
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when children change (if enabled)
    if (
      this.state.hasError &&
      this.props.resetOnPropsChange !== false &&
      prevProps.children !== this.props.children
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetError);
        }
        return this.props.fallback;
      }

      // Default fallback UI — theme tokens with fallbacks so it works without the SDK stylesheet
      return (
        <div
          style={{
            padding: '1rem',
            border: '1px solid hsl(var(--destructive, 0 84.2% 60.2%))',
            borderRadius: '0.5rem',
            backgroundColor: 'hsl(var(--destructive, 0 84.2% 60.2%) / 0.08)',
            color: 'hsl(var(--destructive, 0 70% 35%))',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
            Something went wrong
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
            {this.state.error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.resetError}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'hsl(var(--destructive, 0 84.2% 60.2%))',
              color: 'hsl(var(--destructive-foreground, 210 40% 98%))',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export default error boundary with SDK styling
export default SDKErrorBoundary;
