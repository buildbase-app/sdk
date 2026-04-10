/**
 * Base API client for SDK endpoints.
 * All domain API classes (WorkspaceApi, UserApi, etc.) extend this to share
 * URL building, auth headers, and request/response handling.
 *
 * Supports two auth modes:
 * 1. **Client-side (default):** reads sessionId from localStorage automatically.
 * 2. **Server-side:** pass `sessionId` in config — no localStorage access.
 *
 * @example Server-side usage
 * ```ts
 * const api = new WorkspaceApi({
 *   serverUrl: "https://api.buildbase.app",
 *   version: "v1",
 *   orgId: "...",
 *   sessionId: req.headers["x-session-id"], // from your request
 * });
 * const sub = await api.getCurrentSubscription(workspaceId);
 * ```
 */

import { getAuthHeaders } from './auth-utils';
import type { ApiVersion } from '../api/services/shared-types';
import { handleApiResponse } from './api-utils';

export interface IBaseApiConfig {
  serverUrl: string;
  version: ApiVersion;
  orgId?: string;
  /** When true, ensureReady() also requires orgId. Used by WorkspaceApi and SettingsApi. */
  requireOrgId?: boolean;
  /** API path segment after version (default 'public'). e.g. 'public' => .../v1/public, 'beta' => .../v1/beta */
  basePath?: string;
  /**
   * Session ID for server-side usage. When provided, this is used for auth
   * instead of reading from localStorage. Pass the session token from your
   * request headers, cookies, or any server-side session store.
   */
  sessionId?: string;
  /** Request timeout in milliseconds. 0 = no timeout. */
  timeout?: number;
  /** Max automatic retries for network errors / 5xx. */
  maxRetries?: number;
  /** Enable debug logging for all requests. */
  debug?: boolean;
  /** Custom headers merged into every request. */
  headers?: Record<string, string>;
  /** Error callback — called before error is thrown. */
  onError?: (error: Error, context: { method: string; path: string }) => void;
  /** Custom fetch implementation. */
  fetch?: typeof globalThis.fetch;
}

const NOT_READY_MESSAGE = 'SDK is not ready (missing serverUrl, version, or orgId)';

/**
 * Base class for SDK API clients.
 * Provides:
 * - baseUrl: `${serverUrl}/api/${version}/public`
 * - getAuthHeaders()
 * - fetchJson<T>(path, init, errorMessage): GET/POST/etc. with handleApiResponse
 * - fetchResponse(path, init): raw Response for custom parsing (e.g. non-JSON or custom error handling)
 */
export abstract class BaseApi {
  protected readonly serverUrl: string;
  protected readonly version: ApiVersion;
  protected readonly orgId: string | undefined;
  private readonly requireOrgId: boolean;
  private readonly basePath: string;
  private readonly _sessionId: string | undefined;
  private readonly _timeout: number;
  private readonly _maxRetries: number;
  private readonly _debug: boolean;
  private readonly _customHeaders: Record<string, string>;
  private readonly _onError?: (error: Error, context: { method: string; path: string }) => void;
  private readonly _fetch: typeof globalThis.fetch;

  constructor(config: IBaseApiConfig) {
    this.serverUrl = config.serverUrl;
    this.version = config.version;
    this.orgId = config.orgId;
    this.requireOrgId = config.requireOrgId ?? false;
    this.basePath = config.basePath ?? 'public';
    this._sessionId = config.sessionId;
    this._timeout = config.timeout ?? 30_000;
    this._maxRetries = config.maxRetries ?? 0;
    this._debug = config.debug ?? false;
    this._customHeaders = config.headers ?? {};
    this._onError = config.onError;
    this._fetch = config.fetch ?? globalThis.fetch;
  }

  /** Throws if config is not ready for API calls. Called automatically by fetchJson/fetchResponse. */
  protected ensureReady(): void {
    if (!this.serverUrl?.trim() || !this.version) {
      throw new Error(NOT_READY_MESSAGE);
    }
    if (this.requireOrgId && !this.orgId?.trim()) {
      throw new Error(NOT_READY_MESSAGE);
    }
  }

  /** Base URL: ${serverUrl}/api/${version}/${basePath} */
  protected get baseUrl(): string {
    this.ensureReady();
    return `${this.serverUrl}/api/${this.version}/${this.basePath}`;
  }

  /**
   * Auth headers (x-session-id).
   * Uses injected sessionId (server-side) or falls back to localStorage (client-side).
   * Subclasses can override to add more headers.
   */
  protected getAuthHeaders(): Record<string, string> {
    // Server-side: use explicitly provided session ID
    if (this._sessionId) {
      return { 'x-session-id': this._sessionId };
    }
    // Client-side: read from localStorage
    return getAuthHeaders();
  }

  /** Build full URL from path (path can be "workspaces" or "/workspaces"). */
  protected url(path: string): string {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    return `${base}/${p}`;
  }

  /** Merge auth + custom + per-request headers. */
  private buildHeaders(init: RequestInit): Record<string, string> {
    const headers: Record<string, string> = {
      ...this._customHeaders,
      ...this.getAuthHeaders(),
    };
    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }
    if (init.body != null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  /** Execute fetch with timeout, retries, debug logging, and error callback. */
  private async executeFetch(path: string, init: RequestInit): Promise<Response> {
    const fullUrl = this.url(path);
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = this.buildHeaders(init);
    const fetchOptions: RequestInit = { ...init, headers };

    // Timeout via AbortController
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (this._timeout > 0) {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), this._timeout);
      fetchOptions.signal = init.signal
        ? AbortSignal.any([init.signal, controller.signal])
        : controller.signal;
    }

    const attempt = async (retryCount: number): Promise<Response> => {
      try {
        const fetchFn = this._fetch.bind(globalThis);
        const response = await fetchFn(fullUrl, fetchOptions);

        if (this._debug) {
          console.log(`[BuildBase] ${method} ${fullUrl} → ${response.status}`);
        }

        // Retry on 5xx (server errors) if retries remaining
        if (response.status >= 500 && retryCount < this._maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10_000);
          if (this._debug) {
            console.log(`[BuildBase] Retrying in ${delay}ms (attempt ${retryCount + 1}/${this._maxRetries})`);
          }
          await new Promise(r => setTimeout(r, delay));
          return attempt(retryCount + 1);
        }

        return response;
      } catch (error) {
        // Don't retry abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          if (timeoutId !== undefined) {
            const timeoutError = new Error(`Request timeout after ${this._timeout}ms: ${method} ${path}`);
            this._onError?.(timeoutError, { method, path });
            throw timeoutError;
          }
          throw error;
        }

        // Retry network errors
        if (retryCount < this._maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10_000);
          if (this._debug) {
            console.log(`[BuildBase] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${this._maxRetries})`);
          }
          await new Promise(r => setTimeout(r, delay));
          return attempt(retryCount + 1);
        }

        // Call onError callback
        if (error instanceof Error) {
          this._onError?.(error, { method, path });
        }
        throw error;
      }
    };

    try {
      return await attempt(0);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  /**
   * Execute request and parse JSON with handleApiResponse (throws on !response.ok).
   * Use for standard JSON APIs.
   */
  protected async fetchJson<T>(
    path: string,
    init: RequestInit = {},
    errorMessage: string = 'Request failed'
  ): Promise<T> {
    this.ensureReady();
    try {
      const response = await this.executeFetch(path, init);
      return await handleApiResponse<T>(response, errorMessage);
    } catch (error) {
      if (error instanceof Error) {
        this._onError?.(error, { method: (init.method ?? 'GET').toUpperCase(), path });
      }
      throw error;
    }
  }

  /**
   * Execute request and return raw Response (for custom parsing or error handling).
   * Caller is responsible for checking response.ok and parsing body.
   */
  protected async fetchResponse(path: string, init: RequestInit = {}): Promise<Response> {
    this.ensureReady();
    return this.executeFetch(path, init);
  }
}
