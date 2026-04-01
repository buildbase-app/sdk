import { isAbortError } from './api-utils';
import { configureLogger, sdkError as logInternalError, sdkLogError } from './logger';

/**
 * Centralized Error Handler for SDK
 * Provides consistent error handling, logging, and user-facing error management
 */

export interface SDKErrorContext {
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export class SDKError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: SDKErrorContext,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SDKError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof Error !== 'undefined' && 'captureStackTrace' in Error) {
      (Error as any).captureStackTrace(this, SDKError);
    }
  }
}

export interface ErrorHandlerConfig {
  /**
   * Custom error callback for handling errors
   * @param error - The error that occurred
   * @param context - Additional context about where the error occurred
   */
  onError?: (error: Error, context: SDKErrorContext) => void;

  /**
   * Whether to log errors to console in development
   * @default true
   */
  enableConsoleLogging?: boolean;

  /**
   * Whether to show user-facing error notifications
   * @default false
   */
  showUserNotifications?: boolean;
}

class ErrorHandler {
  private config: ErrorHandlerConfig = {
    enableConsoleLogging: true,
    showUserNotifications: false,
  };

  /**
   * Configure the error handler
   */
  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
    // Sync logger with error handler config for consistent dev logging
    if (config.enableConsoleLogging !== undefined) {
      configureLogger({ enableLogging: config.enableConsoleLogging });
    }
  }

  /**
   * Handle an error with context
   */
  handleError(error: Error | unknown, context: SDKErrorContext = {}): void {
    // Skip abort errors - they are expected when requests are cancelled (e.g. unmount, deps change)
    if (isAbortError(error)) return;

    // Normalize error to Error instance
    const normalizedError =
      error instanceof Error
        ? error
        : new SDKError(
            typeof error === 'string' ? error : 'An unknown error occurred',
            'UNKNOWN_ERROR',
            context
          );

    // Create SDKError if not already
    const sdkError =
      normalizedError instanceof SDKError
        ? normalizedError
        : new SDKError(normalizedError.message, 'SDK_ERROR', context, normalizedError);

    // Log to console in development
    if (this.config.enableConsoleLogging) {
      sdkLogError(`[SDK Error] ${context.component || 'Unknown'}:`, {
        message: sdkError.message,
        code: sdkError.code,
        context: sdkError.context,
        originalError: sdkError.originalError,
        stack: sdkError.stack,
      });
    }

    // Call custom error callback if provided
    if (this.config.onError) {
      try {
        this.config.onError(sdkError, context);
      } catch (callbackError) {
        // Prevent error in error handler from crashing the app
        logInternalError('[SDK Error Handler] Error in custom error callback:', callbackError);
      }
    }

    // Show user notification if enabled
    if (this.config.showUserNotifications) {
      // This could emit an event or trigger a toast notification
      // Implementation depends on the app's notification system
      this.notifyUser(sdkError, context);
    }
  }

  /**
   * Notify user of error (placeholder for notification system)
   */
  private notifyUser(error: SDKError, context: SDKErrorContext): void {
    // This can be extended to integrate with toast libraries, event emitters, etc.
    // For now, it's a placeholder that can be customized
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('sdk-error', {
          detail: { error, context },
        })
      );
    }
  }

  /**
   * Create a safe error handler wrapper for async functions
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(fn: T, context: SDKErrorContext): T {
    return ((...args: Parameters<T>) => {
      return fn(...args).catch((error: unknown) => {
        this.handleError(error, context);
        throw error; // Re-throw to allow caller to handle
      });
    }) as T;
  }

  /**
   * Create a safe error handler wrapper for sync functions
   */
  wrapSync<T extends (...args: any[]) => any>(fn: T, context: SDKErrorContext): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error: unknown) {
        this.handleError(error, context);
        throw error; // Re-throw to allow caller to handle
      }
    }) as T;
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Convenience function to handle an error with context.
 * Uses the global error handler instance.
 *
 * @param error - The error to handle (Error instance, string, or unknown)
 * @param context - Optional context about where the error occurred
 *
 * @example
 * ```tsx
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, {
 *     component: 'MyComponent',
 *     action: 'someOperation',
 *     metadata: { userId: '123' },
 *   });
 * }
 * ```
 */
export function handleError(error: Error | unknown, context: SDKErrorContext = {}): void {
  errorHandler.handleError(error, context);
}

/**
 * Handle an error only if it is not an AbortError.
 * Convenience for async code that uses AbortSignal - call this in catch and abort errors are ignored.
 *
 * @param error - The error that occurred
 * @param context - Optional context about where the error occurred
 * @returns true if error was handled, false if it was an abort error (ignored)
 *
 * @example
 * ```tsx
 * try {
 *   await safeFetch(url, { signal });
 * } catch (error) {
 *   handleErrorUnlessAborted(error, { component: 'MyComponent', action: 'fetch' });
 * }
 * ```
 */
export function handleErrorUnlessAborted(
  error: Error | unknown,
  context: SDKErrorContext = {}
): boolean {
  if (isAbortError(error)) return false;
  errorHandler.handleError(error, context);
  return true;
}

/**
 * Creates a new SDKError instance with optional code and context.
 * Useful for creating standardized errors throughout the SDK.
 *
 * @param message - Error message
 * @param code - Optional error code (e.g., 'AUTH_FAILED', 'NETWORK_ERROR')
 * @param context - Optional context about where the error occurred
 * @param originalError - Optional original error that caused this error
 * @returns A new SDKError instance
 *
 * @example
 * ```tsx
 * throw createSDKError(
 *   'Failed to authenticate user',
 *   'AUTH_FAILED',
 *   { component: 'AuthProvider', action: 'signIn' },
 *   originalError
 * );
 * ```
 */
export function createSDKError(
  message: string,
  code?: string,
  context?: SDKErrorContext,
  originalError?: Error
): SDKError {
  return new SDKError(message, code, context, originalError);
}
