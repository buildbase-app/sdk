/**
 * Base API client for SDK endpoints.
 * All domain API classes (WorkspaceApi, UserApi, etc.) extend this to share
 * URL building, auth headers, and request/response handling.
 */

import { getAuthHeaders } from '../providers/auth/utils';
import type { ApiVersion } from '../providers/os/types';
import { handleApiResponse, safeFetch } from './api-utils';

export interface IBaseApiConfig {
  serverUrl: string;
  version: ApiVersion;
  orgId?: string;
  /** When true, ensureReady() also requires orgId. Used by WorkspaceApi and SettingsApi. */
  requireOrgId?: boolean;
  /** API path segment after version (default 'public'). e.g. 'public' => .../v1/public, 'beta' => .../v1/beta */
  basePath?: string;
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

  constructor(config: IBaseApiConfig) {
    this.serverUrl = config.serverUrl;
    this.version = config.version;
    this.orgId = config.orgId;
    this.requireOrgId = config.requireOrgId ?? false;
    this.basePath = config.basePath ?? 'public';
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

  /** Auth headers (x-session-id). Subclasses can override to add more. */
  protected getAuthHeaders(): Record<string, string> {
    return getAuthHeaders();
  }

  /** Build full URL from path (path can be "workspaces" or "/workspaces"). */
  protected url(path: string): string {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    return `${base}/${p}`;
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
    const headers: Record<string, string> = { ...this.getAuthHeaders() };
    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }
    if (init.body != null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await safeFetch(this.url(path), { ...init, headers });
    return handleApiResponse<T>(response, errorMessage);
  }

  /**
   * Execute request and return raw Response (for custom parsing or error handling).
   * Caller is responsible for checking response.ok and parsing body.
   */
  protected async fetchResponse(path: string, init: RequestInit = {}): Promise<Response> {
    this.ensureReady();
    const headers: Record<string, string> = { ...this.getAuthHeaders() };
    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }
    if (init.body != null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return safeFetch(this.url(path), { ...init, headers });
  }
}
