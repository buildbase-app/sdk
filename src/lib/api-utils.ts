/**
 * API utility functions for consistent error handling and request management
 */

import { sdkLog } from './logger';
import { isDevelopment } from './utils';

/** Redact sensitive keys in objects used for dev logging */
function redactForLog(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  const sensitive = new Set([
    'authorization',
    'token',
    'password',
    'accesstoken',
    'refreshtoken',
    'secret',
    'apikey',
    'api_key',
    'session',
    'sessionid',
    'x-session-id',
  ]);
  if (Array.isArray(obj)) return obj.map(redactForLog);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sensitive.has(k.toLowerCase()) ? '[redacted]' : redactForLog(v);
  }
  return out;
}

/**
 * Check if an error is from AbortController (request was cancelled).
 * Useful for ignoring abort errors when components unmount or requests are cancelled.
 *
 * @param error - The error to check
 * @returns True if the error is an AbortError, false otherwise
 *
 * @example
 * ```tsx
 * try {
 *   await safeFetch(url, { signal });
 * } catch (error) {
 *   if (isAbortError(error)) {
 *     // Request was cancelled, ignore
 *     return;
 *   }
 *   // Handle other errors
 *   console.error('Request failed:', error);
 * }
 * ```
 */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || (error as Error & { code?: string }).code === 'ERR_CANCELED')
  );
}

/**
 * Safely execute a fetch request with network error handling.
 * Wraps native fetch to provide better error messages for network failures.
 * Supports AbortSignal - when aborted, throws with name 'AbortError' (caller can use isAbortError()).
 * In development mode, automatically logs request/response for debugging (prefixed with [SDK API]).
 * Sensitive data (tokens, passwords) is automatically redacted from logs.
 *
 * @param url - The URL to fetch
 * @param options - Optional fetch options (RequestInit), including AbortSignal
 * @returns Promise resolving to Response object
 * @throws {Error} Network errors with descriptive messages, or AbortError if request was aborted
 *
 * @example
 * ```tsx
 * // Basic usage
 * const response = await safeFetch('/api/users');
 * ```
 *
 * @example
 * ```tsx
 * // With abort signal
 * const controller = new AbortController();
 * const response = await safeFetch('/api/users', {
 *   signal: controller.signal,
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'John' }),
 * });
 *
 * // Cancel request
 * controller.abort();
 * ```
 *
 * @example
 * ```tsx
 * // Handle network errors
 * try {
 *   const response = await safeFetch('/api/users');
 * } catch (error) {
 *   if (isAbortError(error)) {
 *     // Request was cancelled
 *     return;
 *   }
 *   // Network error: "Network error: Please check your internet connection"
 *   console.error(error.message);
 * }
 * ```
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (isDevelopment()) {
      const method = (options?.method ?? 'GET').toUpperCase();
      let request: unknown = undefined;
      if (options?.body != null) {
        try {
          request =
            typeof options.body === 'string'
              ? (JSON.parse(options.body) as unknown)
              : { body: '(non-JSON)' };
        } catch {
          request = { body: '(parse failed)' };
        }
      }
      const cloned = response.clone();
      let responsePayload: unknown = undefined;
      try {
        const text = await cloned.text();
        if (text) {
          try {
            responsePayload = JSON.parse(text) as unknown;
          } catch {
            responsePayload = text.substring(0, 200) + (text.length > 200 ? '...' : '');
          }
        }
      } catch {
        responsePayload = '(read failed)';
      }
      sdkLog('[SDK API]', method, url, {
        request: redactForLog(request),
        response: redactForLog(responsePayload),
        status: response.status,
      });
    }
    return response;
  } catch (error) {
    // Don't wrap abort errors - let caller handle (e.g. ignore on unmount)
    if (isAbortError(error)) {
      throw error;
    }
    // Handle network errors (offline, CORS, DNS, etc.)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Please check your internet connection');
    }
    // Re-throw other errors as-is
    throw error;
  }
}

/**
 * Extract error message from a failed response.
 * Parses JSON body and returns message/error field, or defaultMsg if not available.
 *
 * @param response - The Response object (typically from a failed request)
 * @param defaultMsg - Default message if parsing fails or no message in body
 * @returns Promise resolving to the error message string
 *
 * @example
 * ```tsx
 * const response = await safeFetch('/api/users');
 * if (!response.ok) {
 *   const msg = await getErrorMessage(response, 'Failed to fetch users');
 *   throw new Error(msg);
 * }
 * ```
 */
export async function getErrorMessage(response: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await response.json();
    return (data?.message || data?.error || defaultMsg) as string;
  } catch {
    return defaultMsg;
  }
}

/**
 * Parse JSON response with error handling.
 * Provides better error messages if response is not valid JSON.
 *
 * @param response - The Response object to parse
 * @returns Promise resolving to parsed JSON data
 * @throws {Error} If response body is empty or not valid JSON
 *
 * @example
 * ```tsx
 * const response = await safeFetch('/api/users');
 * const users = await parseJsonResponse<User[]>(response);
 * ```
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error('Empty response body');
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`
    );
  }
}

/**
 * Create a standardized API error from a response.
 * Provides user-friendly error messages based on HTTP status codes.
 *
 * @param response - The Response object with error status
 * @param defaultMessage - Default error message if status-specific message not available
 * @returns Error instance with descriptive message
 *
 * @example
 * ```tsx
 * const response = await safeFetch('/api/users');
 * if (!response.ok) {
 *   throw createApiError(response, 'Failed to fetch users');
 *   // Error message: "Failed to fetch users (401: Unauthorized - Please check your session)"
 * }
 * ```
 */
export function createApiError(response: Response, defaultMessage: string): Error {
  // Try to extract error message from response
  // Note: This doesn't await the JSON, so it's safe for immediate use
  // The caller should handle JSON parsing separately if needed
  const statusMessages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized - Please check your session',
    403: 'Forbidden - You do not have permission',
    404: 'Resource not found',
    500: 'Internal server error',
    502: 'Bad Gateway',
    503: 'Service unavailable',
  };

  const statusMessage = statusMessages[response.status] || response.statusText || defaultMessage;

  return new Error(`${defaultMessage} (${response.status}: ${statusMessage})`);
}

/**
 * Handle API response with consistent error handling.
 * Checks response status, parses JSON, and provides standardized error messages.
 * This is the recommended way to handle API responses in the SDK.
 *
 * @param response - The Response object to handle
 * @param defaultErrorMessage - Default error message if response is not ok
 * @returns Promise resolving to parsed JSON data
 * @throws {Error} If response is not ok or JSON parsing fails
 *
 * @example
 * ```tsx
 * const response = await safeFetch('/api/users');
 * const users = await handleApiResponse<User[]>(response, 'Failed to fetch users');
 * ```
 *
 * @example
 * ```tsx
 * // With error handling
 * try {
 *   const response = await safeFetch('/api/users');
 *   const users = await handleApiResponse<User[]>(response);
 * } catch (error) {
 *   // Error message includes status code and descriptive text
 *   console.error(error.message);
 * }
 * ```
 */
export async function handleApiResponse<T>(
  response: Response,
  defaultErrorMessage: string = 'Request failed'
): Promise<T> {
  if (!response.ok) {
    let errorMessage = defaultErrorMessage;
    try {
      const error = await parseJsonResponse<{ message?: string; error?: string }>(response);
      errorMessage = error.message || error.error || errorMessage;
    } catch {
      // If JSON parsing fails, use status-based message
      errorMessage = createApiError(response, defaultErrorMessage).message;
    }
    throw new Error(errorMessage);
  }

  try {
    return await parseJsonResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid JSON')) {
      throw error;
    }
    throw new Error('Failed to parse response as JSON');
  }
}

/**
 * Fetch with timeout support.
 * Automatically cancels request if it takes longer than specified timeout.
 *
 * @param url - The URL to fetch
 * @param options - Optional fetch options (RequestInit)
 * @param timeout - Timeout in milliseconds (default: 10000ms / 10 seconds)
 * @returns Promise resolving to Response object
 * @throws {Error} If request times out: "Request timeout after {timeout}ms"
 *
 * @example
 * ```tsx
 * // 5 second timeout
 * const response = await fetchWithTimeout('/api/users', {}, 5000);
 * ```
 *
 * @example
 * ```tsx
 * // Handle timeout
 * try {
 *   const response = await fetchWithTimeout('/api/users', {}, 5000);
 * } catch (error) {
 *   if (error.message.includes('timeout')) {
 *     console.error('Request took too long');
 *   }
 * }
 * ```
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const mergedOptions: RequestInit = {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal,
  };

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return safeFetch(url, mergedOptions)
    .then(response => {
      clearTimeout(timeoutId);
      return response;
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (controller.signal.aborted && !options.signal?.aborted) {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    });
}
