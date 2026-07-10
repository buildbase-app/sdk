/**
 * MCP server toolkit (server-side, framework-agnostic).
 *
 * Turns a consuming app into a live MCP (Model Context Protocol) server so AI
 * agents can operate its BuildBase capabilities — workspaces, subscriptions,
 * quotas, credits, feature flags, permissions — plus any custom tools the app
 * defines. The transport is stateless Streamable HTTP: a single JSON-RPC
 * message per POST, no sessions and no SSE, which keeps the handler pure and
 * identical on Node 18+, edge, Deno, and Bun.
 *
 * Zero framework types: the core `handle()` takes a plain
 * `{ method, headers, body }` and returns `{ status, headers, body }` (wire it
 * into Express/Fastify/Hono yourself), while `fetch()` adapts Web-standard
 * `Request` → `Response` for Next.js App Router and edge runtimes.
 *
 * Agents authenticate with the Bearer tokens the app mints via the OAuth2
 * app-bridge (`handleAppTokenRequest` + `signClientJwt`); the `auth.verify`
 * callback maps a verified token to the BuildBase session the tools run under.
 *
 * @example Next.js App Router — the entire integration:
 * ```ts
 * // lib/mcp.ts
 * import BuildBase from '@buildbase/sdk';
 * import { createMcpHandler, verifyClientJwt } from '@buildbase/sdk/mcp';
 *
 * const buildbase = BuildBase({
 *   serverUrl: process.env.BUILDBASE_URL!,
 *   orgId: process.env.BUILDBASE_ORG_ID!,
 * });
 *
 * export const mcp = createMcpHandler({
 *   buildbase,
 *   serverInfo: { name: 'imejis', version: '1.0.0' },
 *   auth: {
 *     verify: (token) => {
 *       const c = verifyClientJwt(token, process.env.BUILDBASE_CLIENT_SECRET!);
 *       return { sessionId: String(c.sid), userId: String(c.sub), scopes: c.scope };
 *     },
 *     resourceMetadataUrl: 'https://imejis.io/.well-known/oauth-protected-resource',
 *   },
 * });
 *
 * // app/api/mcp/route.ts
 * import { mcp } from '@/lib/mcp';
 * export const POST = (req: Request) => mcp.fetch(req);
 * export const GET = (req: Request) => mcp.fetch(req);    // 405 per spec (no SSE)
 * export const DELETE = (req: Request) => mcp.fetch(req); // 405 (stateless)
 * ```
 */

import { z } from 'zod';
import { bearerChallenge, extractBearerToken } from './agent-bridge';
import type { McpServerCard } from './agent-discovery';
import { selectBuiltinTools, type BuiltinMcpToolName } from './mcp-tools';
import type { ScopedActions } from './server-client';

/**
 * The slice of the `BuildBase()` client the MCP handler needs. Structural on
 * purpose (instead of the full `BuildBaseResult`) so the type stays assignable
 * across the SDK's separately-bundled entry points.
 */
export interface McpBuildBaseClient {
  withSession(sessionId: string): ScopedActions;
}

// ─── Types ──────────────────────────────────────────────────────────────────

/** A transport-agnostic HTTP request (mirror of the DiscoveryDocument idea). */
export interface McpHttpRequest {
  /** HTTP method, e.g. `'POST'`. */
  method: string;
  /** Header map. Keys are matched case-insensitively. */
  headers: Record<string, string | undefined>;
  /** Raw JSON body string, or an already-parsed value (e.g. Express req.body). */
  body?: string | unknown;
}

/** A rendered HTTP response ready to hand to any framework. */
export interface McpHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** The identity a verified Bearer token resolves to. */
export interface McpAuthInfo {
  /** BuildBase session all tool calls run under (`buildbase.withSession(...)`). */
  sessionId: string;
  /** The acting BuildBase user id — default subject for permission checks. */
  userId?: string;
  /** Pin tools to one workspace; used when the agent omits `workspaceId`. */
  workspaceId?: string;
  /** OAuth scopes granted to the agent; filters tools with `requiredScopes`. */
  scopes?: string[];
  /** Raw verified claims, passed through to tool context. */
  claims?: Record<string, unknown>;
}

/** Context passed to every tool execution. */
export interface McpToolContext<TCustom = unknown> {
  /**
   * Session-scoped BuildBase actions (`workspace`, `usage`, `credits`, …).
   * Only usable when a `buildbase` client was configured — otherwise any
   * access throws a clear error (tools that don't touch BuildBase never
   * notice).
   */
  bb: ScopedActions;
  auth: McpAuthInfo;
  /** Default workspace (from `auth.workspaceId`), if any. */
  workspaceId?: string;
  /**
   * Whatever your `context` factory returned for this request — your own
   * database handles, services, request info. `undefined` when no factory is
   * configured.
   */
  custom: TCustom;
}

/** MCP tool annotations (behavior hints for agents). */
export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/** A tool exposed over MCP. Use {@link defineMcpTool} for inferred input types. */
export interface McpToolDefinition<S extends z.ZodType = z.ZodType, TCustom = any> {
  /** Tool name: `[a-zA-Z0-9_-]`, 1–128 chars. */
  name: string;
  description: string;
  /**
   * Input schema: a zod schema (validated, converted to JSON Schema for
   * `tools/list`) or a raw JSON Schema object (served as-is, not validated).
   */
  inputSchema: S | Record<string, unknown>;
  annotations?: McpToolAnnotations;
  /**
   * Scopes required to see/call this tool. The token must carry ALL of them
   * (`McpAuthInfo.scopes`) for the tool to be visible or callable; a token
   * with no scopes sees only tools that declare none. Built-in tools declare
   * no scopes and are governed by `builtinTools` + the user's own permissions.
   */
  requiredScopes?: string[];
  execute: (input: z.output<S>, ctx: McpToolContext<TCustom>) => unknown | Promise<unknown>;
}

/** Configuration for {@link createMcpHandler}. */
export interface CreateMcpHandlerConfig {
  /**
   * The `BuildBase()` instance the built-in tools run against (via
   * `withSession`). Optional — omit it to run a standalone MCP server with
   * only your own tools (built-ins are then disabled and `ctx.bb` throws a
   * clear error if a tool touches it).
   */
  buildbase?: McpBuildBaseClient;
  /** Advertised in `initialize`. Defaults to `buildbase-mcp`. */
  serverInfo?: { name: string; version: string };
  /** Optional usage instructions surfaced to agents on `initialize`. */
  instructions?: string;
  /**
   * Per-request context factory for YOUR tools: whatever it returns (your
   * database, services, request info) is available as `ctx.custom` in every
   * `execute`. Runs once per `tools/call`, after auth.
   */
  context?: (auth: McpAuthInfo | null, req: McpHttpRequest) => unknown | Promise<unknown>;
  /**
   * Bearer-token verification. Return null to reject (401). Set `false` to
   * disable auth entirely — local development only.
   */
  auth:
    | {
        verify: (
          token: string,
          req: McpHttpRequest
        ) => McpAuthInfo | null | Promise<McpAuthInfo | null>;
        /** When set, 401s carry the RFC 9728 `WWW-Authenticate` challenge. */
        resourceMetadataUrl?: string;
      }
    | false;
  /**
   * App-defined tools. A custom tool with a built-in's name REPLACES the
   * built-in (your definition wins); duplicate custom names or invalid names
   * throw at create time.
   */
  tools?: McpToolDefinition<any, any>[];
  /**
   * Which built-in BuildBase tools to expose. **Defaults to `'readonly'`**
   * when a `buildbase` client is configured (`false` otherwise) — reads only,
   * so no agent can mutate, bill, or delete anything unless you opt in. Set
   * `'all'` to expose the full surface (reads + writes + destructive/billing
   * ops like workspace delete, subscription cancel, credit purchase); `false`
   * for none; or an `{ include, exclude }` selection to hand-pick. Every tool
   * still runs under the user's session, so the platform enforces the user's
   * real permissions on top — but least privilege starts here.
   */
  builtinTools?:
    | 'all'
    | 'readonly'
    | false
    | { include?: BuiltinMcpToolName[]; exclude?: BuiltinMcpToolName[] };
  /**
   * Allowed `Origin` header values (DNS-rebinding protection). When set, a
   * request with a non-matching Origin is rejected with 403. Requests without
   * an Origin header (curl, server-to-server) always pass.
   */
  allowedOrigins?: string[];
  /**
   * CORS for browser-based MCP clients. Default **true**: emit
   * `Access-Control-Allow-Origin: *` (safe for a Bearer-token API — no
   * cookies are ever involved), or reflect the matching origin when
   * `allowedOrigins` is set. Pass an origin array to allow only those, or
   * `false` to emit no CORS headers at all. Preflight (OPTIONS) is answered
   * automatically either way — no wrapper needed in your route.
   */
  cors?: boolean | string[];
  /**
   * Hard cap on the raw request-body size in bytes (DoS protection). Bodies
   * larger than this are rejected with 413 before parsing. Defaults to
   * 1 MiB (`1_048_576`); set `0` to disable the check.
   */
  maxRequestBytes?: number;
  /**
   * Optional rate-limit gate, called after authentication and before the
   * JSON-RPC message is dispatched. Return `false` (or a `{ retryAfter }`
   * object) to reject the request with 429. The SDK is stateless and holds no
   * counters itself — back this with your own store (KV, Redis, edge limiter),
   * keyed by `auth.userId`/`auth.sessionId`. Recommended in production; also
   * apply platform/edge rate limiting in front of the endpoint.
   */
  rateLimit?: (
    auth: McpAuthInfo | null,
    req: McpHttpRequest
  ) =>
    | boolean
    | { ok: boolean; retryAfter?: number }
    | Promise<boolean | { ok: boolean; retryAfter?: number }>;
  /** Called on tool-execution and auth-callback errors (for logging). */
  onError?: (error: Error, ctx: { method: string; tool?: string }) => void;
  /**
   * Map a thrown tool error to the message returned to the agent. Use it to
   * redact internal details in production (the full error still reaches
   * `onError`). Defaults to the raw `error.message`. Return a generic string
   * — e.g. `() => 'Tool execution failed'` — to leak nothing.
   */
  formatToolError?: (error: Error, ctx: { tool: string }) => string;
}

/** The handler returned by {@link createMcpHandler}. */
export interface McpHandler {
  /** Pure, framework-agnostic core (Express, Fastify, Hono, tests). */
  handle(req: McpHttpRequest): Promise<McpHttpResponse>;
  /** Web-standard adapter (Next.js App Router route handlers, edge). */
  fetch(request: Request): Promise<Response>;
  /** Metadata for the exposed tools (before per-request scope filtering). */
  listTools(): Array<{ name: string; description: string; annotations?: McpToolAnnotations }>;
  /** A ready-to-assign `AgentReadyConfig.mcpServerCard` for this server. */
  serverCard(options: {
    endpoint: string;
    description?: string;
    documentationUrl?: string;
  }): McpServerCard;
}

// ─── Protocol constants ──────────────────────────────────────────────────────

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];
const JSON_CT = 'application/json';
const TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;

// JSON-RPC error codes.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// ─── Small helpers ───────────────────────────────────────────────────────────

function headerGet(headers: Record<string, string | undefined>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

function jsonResponse(status: number, value: unknown): McpHttpResponse {
  return {
    status,
    headers: { 'Content-Type': JSON_CT },
    body: JSON.stringify(value),
  };
}

function rpcResult(id: unknown, result: unknown): McpHttpResponse {
  return jsonResponse(200, { jsonrpc: '2.0', id: id ?? null, result });
}

function rpcError(
  id: unknown,
  code: number,
  message: string,
  httpStatus = 200,
  data?: unknown
): McpHttpResponse {
  return jsonResponse(httpStatus, {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  });
}

function isZodSchema(schema: unknown): schema is z.ZodType {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    typeof (schema as { safeParse?: unknown }).safeParse === 'function'
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/**
 * Create a stateless MCP server handler exposing BuildBase capabilities (and
 * any custom tools) over Streamable HTTP. See the module docs for wiring.
 */
export function createMcpHandler(config: CreateMcpHandlerConfig): McpHandler {
  const serverInfo = config.serverInfo ?? { name: 'buildbase-mcp', version: '1.0.0' };

  // Discovery footgun: auth is enforced but no RFC 9728 pointer is advertised,
  // so agents get a bare 401 and can't bootstrap OAuth — the server silently
  // looks "not agent-ready". Warn once at create time.
  if (config.auth && !config.auth.resourceMetadataUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      '[buildbase/mcp] auth is enabled but `auth.resourceMetadataUrl` is unset — ' +
        '401 responses will carry no WWW-Authenticate/resource_metadata pointer, ' +
        'so MCP clients cannot discover your authorization server. Set it to your ' +
        '/.well-known/oauth-protected-resource URL.'
    );
  }

  // Normalize the DNS-rebind / CORS origin allowlist ONCE (lowercase, strip a
  // trailing slash) so a stray-slash or uppercased entry can't silently fail to
  // match — which would disable both protection and CORS with no error.
  const normalizeOrigin = (o: string): string => o.trim().toLowerCase().replace(/\/+$/, '');
  const allowedOrigins = config.allowedOrigins
    ? new Set(config.allowedOrigins.map(normalizeOrigin))
    : null;
  const originAllowed = (origin: string | undefined): boolean =>
    !!origin && !!allowedOrigins && allowedOrigins.has(normalizeOrigin(origin));

  // Assemble the tool registry once, at create time. Built-ins need the
  // BuildBase client; without one the server is standalone (your tools only).
  // Least privilege by default: reads only. Writes/destructive ops are opt-in
  // via `builtinTools: 'all'` (or an explicit include list).
  const builtinSelection = config.builtinTools ?? (config.buildbase ? 'readonly' : false);
  const maxRequestBytes = config.maxRequestBytes ?? 1_048_576;
  if (builtinSelection !== false && !config.buildbase) {
    throw new Error(
      'builtinTools require a `buildbase` client — pass one to createMcpHandler, or set builtinTools: false.'
    );
  }
  const tools = new Map<string, McpToolDefinition<any>>();
  for (const tool of selectBuiltinTools(builtinSelection)) {
    tools.set(tool.name, tool);
  }
  const customNames = new Set<string>();
  for (const tool of config.tools ?? []) {
    if (!TOOL_NAME_RE.test(tool.name)) {
      throw new Error(`Invalid MCP tool name: "${tool.name}" (want ${String(TOOL_NAME_RE)})`);
    }
    if (customNames.has(tool.name)) {
      throw new Error(`Duplicate MCP tool name: "${tool.name}"`);
    }
    customNames.add(tool.name);
    // Custom tools may shadow built-ins on purpose — the app's definition wins.
    tools.set(tool.name, tool);
  }

  // Standalone mode: any BuildBase access from a tool gets a clear error
  // instead of an undefined crash.
  const missingBb = new Proxy({} as ScopedActions, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      throw new Error(
        `No \`buildbase\` client configured — pass one to createMcpHandler to use bb.${prop} in tools.`
      );
    },
  });

  // Authenticated but session-less: the token verified yet carried no BuildBase
  // session id. Fail CLOSED — never call BuildBase with an empty session (which
  // would run unscoped) — while leaving session-less tools (e.g. public content)
  // working. Any `ctx.bb.*` access throws a clear, non-ambiguous error.
  const sessionlessBb = new Proxy({} as ScopedActions, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      throw new Error(
        `This tool needs an authenticated BuildBase session, but the token carried none (bb.${prop}). Re-authenticate.`
      );
    },
  });

  // JSON Schemas are static per tool — convert lazily, cache forever.
  const jsonSchemaCache = new Map<string, Record<string, unknown>>();
  function toolJsonSchema(tool: McpToolDefinition<any>): Record<string, unknown> {
    const cached = jsonSchemaCache.get(tool.name);
    if (cached) return cached;
    let schema: Record<string, unknown>;
    try {
      schema = isZodSchema(tool.inputSchema)
        ? (z.toJSONSchema(tool.inputSchema, { target: 'draft-2020-12' }) as Record<string, unknown>)
        : tool.inputSchema;
    } catch (error) {
      // z.toJSONSchema throws on schemas it can't represent (transforms,
      // z.custom, functions). Never let one tool's schema take down tools/list:
      // report it and advertise a permissive object schema instead.
      reportError(error, { method: 'tools/list', tool: tool.name });
      schema = { type: 'object', additionalProperties: true };
    }
    jsonSchemaCache.set(tool.name, schema);
    return schema;
  }

  function visibleTools(auth: McpAuthInfo | null): McpToolDefinition<any>[] {
    // Least privilege: a tool that declares `requiredScopes` is visible only
    // when the token actually carries all of them. A token with no scopes
    // (undefined or []) sees only tools with no scope requirement — the two
    // "empty" states are treated identically, and a missing `scope` claim can
    // never unlock a scoped tool.
    const granted = new Set(auth?.scopes ?? []);
    return Array.from(tools.values()).filter(t =>
      (t.requiredScopes ?? []).every(s => granted.has(s))
    );
  }

  function reportError(error: unknown, ctx: { method: string; tool?: string }): void {
    try {
      config.onError?.(error instanceof Error ? error : new Error(errorMessage(error)), ctx);
    } catch {
      // never let a logging callback break the response
    }
  }

  function unauthorized(): McpHttpResponse {
    if (config.auth && config.auth.resourceMetadataUrl) {
      const challenge = bearerChallenge({
        resourceMetadataUrl: config.auth.resourceMetadataUrl,
      });
      return { status: challenge.status, headers: challenge.headers, body: challenge.body };
    }
    return jsonResponse(401, { error: 'unauthorized' });
  }

  // CORS is on by default so browser MCP clients work with zero config:
  // `*` for a Bearer-token API is safe (no cookies, no credentialed requests),
  // and the server never reflects an arbitrary origin — an origin list
  // (`cors: [...]` or `allowedOrigins`) narrows it to exact matches.
  const corsOrigins = Array.isArray(config.cors) ? new Set(config.cors.map(normalizeOrigin)) : null;
  function corsHeaders(req: McpHttpRequest): Record<string, string> {
    if (config.cors === false) return {};
    const origin = headerGet(req.headers, 'origin');
    let allowOrigin: string | null;
    if (corsOrigins) {
      allowOrigin = origin && corsOrigins.has(normalizeOrigin(origin)) ? origin : null;
    } else if (allowedOrigins) {
      allowOrigin = originAllowed(origin) ? (origin as string) : null;
    } else {
      allowOrigin = '*';
    }
    if (!allowOrigin) return {};
    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
      'Access-Control-Expose-Headers': 'MCP-Protocol-Version, Mcp-Session-Id, WWW-Authenticate',
      'Access-Control-Max-Age': '86400',
      ...(allowOrigin !== '*' ? { Vary: 'Origin' } : {}),
    };
  }

  async function handle(req: McpHttpRequest): Promise<McpHttpResponse> {
    const cors = corsHeaders(req);
    // Preflight: answer before auth/method checks so browsers can proceed.
    if (req.method.toUpperCase() === 'OPTIONS') {
      return { status: 204, headers: cors, body: '' };
    }
    const res = await dispatch(req);
    return Object.keys(cors).length ? { ...res, headers: { ...res.headers, ...cors } } : res;
  }

  async function dispatch(req: McpHttpRequest): Promise<McpHttpResponse> {
    const method = req.method.toUpperCase();

    // DNS-rebinding protection: enforce the Origin allowlist when configured.
    if (allowedOrigins) {
      const origin = headerGet(req.headers, 'origin');
      if (origin && !originAllowed(origin)) {
        return jsonResponse(403, { error: 'origin_not_allowed' });
      }
    }

    // Stateless server: no SSE stream to GET, no session to DELETE.
    if (method !== 'POST') {
      return {
        status: 405,
        headers: { 'Content-Type': JSON_CT, Allow: 'POST, OPTIONS' },
        body: JSON.stringify({ error: 'method_not_allowed' }),
      };
    }

    // Reject oversized payloads before parsing (DoS protection). Byte length of
    // a UTF-8 string is always >= its char length, so a char-count check never
    // rejects a body that is actually under the byte cap.
    if (maxRequestBytes > 0 && typeof req.body === 'string' && req.body.length > maxRequestBytes) {
      return jsonResponse(413, { error: 'payload_too_large' });
    }

    // Authenticate before touching the payload.
    let auth: McpAuthInfo | null = null;
    if (config.auth !== false) {
      const token = extractBearerToken(headerGet(req.headers, 'authorization'));
      if (!token) return unauthorized();
      try {
        auth = await config.auth.verify(token, req);
      } catch (error) {
        reportError(error, { method: 'auth' });
        auth = null;
      }
      if (!auth) return unauthorized();
    }

    // Optional rate-limit gate (app-supplied; the SDK keeps no counters).
    if (config.rateLimit) {
      let decision: boolean | { ok: boolean; retryAfter?: number };
      try {
        decision = await config.rateLimit(auth, req);
      } catch (error) {
        // A failing limiter must fail closed, not open.
        reportError(error, { method: 'rateLimit' });
        decision = false;
      }
      const ok = typeof decision === 'boolean' ? decision : decision.ok;
      if (!ok) {
        const retryAfter = typeof decision === 'object' ? decision.retryAfter : undefined;
        return {
          status: 429,
          headers: {
            'Content-Type': JSON_CT,
            ...(retryAfter !== undefined ? { 'Retry-After': String(retryAfter) } : {}),
          },
          body: JSON.stringify({ error: 'rate_limited' }),
        };
      }
    }

    // Parse the JSON-RPC message.
    let message: unknown = req.body;
    if (typeof req.body === 'string') {
      try {
        message = JSON.parse(req.body);
      } catch {
        return rpcError(null, PARSE_ERROR, 'Invalid JSON', 400);
      }
    }
    if (Array.isArray(message)) {
      // JSON-RPC batching was removed in protocol 2025-06-18.
      return rpcError(null, INVALID_REQUEST, 'Batch requests are not supported', 400);
    }
    if (typeof message !== 'object' || message === null) {
      return rpcError(null, INVALID_REQUEST, 'Expected a JSON-RPC request object', 400);
    }

    const rpc = message as { id?: unknown; method?: unknown; params?: unknown };
    const id = rpc.id;
    const rpcMethod = typeof rpc.method === 'string' ? rpc.method : null;
    if (!rpcMethod) {
      return rpcError(id, INVALID_REQUEST, 'Missing method', 400);
    }

    // Notifications (no id) are acknowledged with 202 and an empty body.
    if (id === undefined || id === null) {
      return { status: 202, headers: { 'Content-Type': JSON_CT }, body: '' };
    }

    const params = (rpc.params ?? {}) as Record<string, unknown>;

    switch (rpcMethod) {
      case 'initialize': {
        const requested = params.protocolVersion;
        const protocolVersion =
          typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
            ? requested
            : LATEST_PROTOCOL_VERSION;
        return rpcResult(id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo,
          ...(config.instructions ? { instructions: config.instructions } : {}),
        });
      }

      case 'ping':
        return rpcResult(id, {});

      case 'tools/list': {
        const list = visibleTools(auth).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: toolJsonSchema(tool),
          ...(tool.annotations ? { annotations: tool.annotations } : {}),
        }));
        return rpcResult(id, { tools: list });
      }

      case 'tools/call': {
        const name = typeof params.name === 'string' ? params.name : '';
        const tool = visibleTools(auth).find(t => t.name === name);
        if (!tool) {
          return rpcError(id, INVALID_PARAMS, `Unknown tool: ${name || '(missing name)'}`);
        }

        let input: unknown = params.arguments ?? {};
        if (isZodSchema(tool.inputSchema)) {
          const parsed = tool.inputSchema.safeParse(input);
          if (!parsed.success) {
            return rpcError(id, INVALID_PARAMS, `Invalid arguments for ${name}`, 200, {
              issues: parsed.error.issues,
            });
          }
          input = parsed.data;
        }

        let custom: unknown;
        if (config.context) {
          try {
            custom = await config.context(auth, req);
          } catch (error) {
            reportError(error, { method: rpcMethod, tool: name });
            return rpcError(id, INTERNAL_ERROR, 'Context initialization failed');
          }
        }

        const sessionId = auth?.sessionId ?? '';
        const context: McpToolContext = {
          // No buildbase → missingBb. Authenticated but empty session → fail
          // CLOSED via sessionlessBb (never call BuildBase unscoped). Otherwise
          // bind the user's session so every bb call runs as that user.
          bb: config.buildbase
            ? sessionId
              ? config.buildbase.withSession(sessionId)
              : sessionlessBb
            : missingBb,
          auth: auth ?? { sessionId: '' },
          workspaceId: auth?.workspaceId,
          custom,
        };

        try {
          const result = await tool.execute(input, context);
          const structured =
            typeof result === 'object' && result !== null && !Array.isArray(result);
          return rpcResult(id, {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              },
            ],
            ...(structured ? { structuredContent: result } : {}),
            isError: false,
          });
        } catch (error) {
          // Per spec, tool failures are results (isError), not protocol errors.
          reportError(error, { method: rpcMethod, tool: name });
          const err = error instanceof Error ? error : new Error(errorMessage(error));
          const text = config.formatToolError
            ? config.formatToolError(err, { tool: name })
            : err.message;
          return rpcResult(id, {
            content: [{ type: 'text', text }],
            isError: true,
          });
        }
      }

      default:
        return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${rpcMethod}`);
    }
  }

  async function fetchAdapter(request: Request): Promise<Response> {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    // Cheap pre-check: reject on advertised Content-Length before reading the
    // stream, so a huge upload never gets buffered into memory.
    if (maxRequestBytes > 0) {
      const declared = Number(request.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > maxRequestBytes) {
        return new Response(JSON.stringify({ error: 'payload_too_large' }), {
          status: 413,
          headers: { 'Content-Type': JSON_CT },
        });
      }
    }
    const body = request.method.toUpperCase() === 'POST' ? await request.text() : undefined;
    const result = await handle({ method: request.method, headers, body });
    return new Response(result.body === '' ? null : result.body, {
      status: result.status,
      headers: result.headers,
    });
  }

  return {
    handle,
    fetch: fetchAdapter,
    listTools: () =>
      Array.from(tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
      })),
    serverCard: options => ({
      name: serverInfo.name,
      version: serverInfo.version,
      endpoint: options.endpoint,
      transport: 'streamable-http',
      capabilities: { tools: { listChanged: false } },
      ...(options.description ? { description: options.description } : {}),
      ...(options.documentationUrl ? { documentationUrl: options.documentationUrl } : {}),
    }),
  };
}

/**
 * Identity helper that infers the tool's input type from its zod schema.
 * Pass a second type argument to type `ctx.custom` from your `context`
 * factory: `defineMcpTool<typeof schema, MyContext>({ ... })`.
 */
export function defineMcpTool<S extends z.ZodType, TCustom = any>(
  tool: McpToolDefinition<S, TCustom>
): McpToolDefinition<S, TCustom> {
  return tool;
}
