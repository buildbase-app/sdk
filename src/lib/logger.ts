/**
 * Centralized logger for SDK
 * All console output should go through this for consistency and configurable behavior
 */

import { isDevelopment } from './utils';

let enableLogging = true;

/**
 * Configure the SDK logger
 */
export function configureLogger(config: { enableLogging?: boolean }): void {
  if (config.enableLogging !== undefined) enableLogging = config.enableLogging;
}

/**
 * Log info (dev only, respects enableLogging)
 */
export function sdkLog(message: string, ...args: unknown[]): void {
  if (enableLogging && isDevelopment()) {
    console.log(message, ...args);
  }
}

/**
 * Log warning (dev only, respects enableLogging)
 */
export function sdkWarn(message: string, ...args: unknown[]): void {
  if (enableLogging && isDevelopment()) {
    console.warn(message, ...args);
  }
}

/**
 * Log error (dev only, respects enableLogging)
 */
export function sdkLogError(message: string, ...args: unknown[]): void {
  if (enableLogging && isDevelopment()) {
    console.error(message, ...args);
  }
}

/**
 * Log internal/critical error - always logs.
 * Use when the error handling system itself fails (e.g. user's onError callback throws).
 */
export function sdkError(message: string, ...args: unknown[]): void {
  console.error(message, ...args);
}
