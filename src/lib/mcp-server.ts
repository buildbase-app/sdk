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
 *   serverInfo: { name: 'acme', version: '1.0.0' },
 *   auth: {
 *     verify: (token) => {
 *       const c = verifyClientJwt(token, process.env.BUILDBASE_CLIENT_SECRET!);
 *       // Claims beyond RFC 7519 are `unknown` — narrow before use.
 *       return {
 *         sessionId: typeof c.sid === 'string' ? c.sid : '',
 *         userId: c.sub,
 *         scopes: Array.isArray(c.scope)
 *           ? c.scope.filter((s): s is string => typeof s === 'string')
 *           : undefined,
 *       };
 *     },
 *     resourceMetadataUrl: 'https://example.com/.well-known/oauth-protected-resource',
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

/** An icon for display in host UIs (SEP-973, protocol 2025-11-25). */
export interface McpIcon {
  /** Icon URL (https or data URI). */
  src: string;
  mimeType?: string;
  /** e.g. `['48x48']` or `['any']` for scalable formats. */
  sizes?: string[];
}

/** MCP tool annotations (behavior hints for agents). */
export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// ─── Tool result content blocks (MCP 2025-06-18) ──────────────────────────────

/** Plain text block. */
export interface McpTextContent {
  type: 'text';
  text: string;
}

/** Base64-encoded image (`data` has no data-URI prefix). */
export interface McpImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

/** Base64-encoded audio (`data` has no data-URI prefix). */
export interface McpAudioContent {
  type: 'audio';
  data: string;
  mimeType: string;
}

/** Link to a resource the client may fetch — the content itself is not embedded. */
export interface McpResourceLinkContent {
  type: 'resource_link';
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
}

/** Resource contents embedded directly in the result (text or base64 blob). */
export interface McpEmbeddedResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    title?: string;
  } & ({ text: string } | { blob: string });
}

/** Any content block a tool result may carry. */
export type McpContentBlock =
  | McpTextContent
  | McpImageContent
  | McpAudioContent
  | McpResourceLinkContent
  | McpEmbeddedResourceContent;

/**
 * Full wire-shaped tool result. Return this from `execute` to control the
 * result exactly — mixed content blocks (text + images + resource links),
 * `structuredContent`, and the `isError` flag. Any other return value keeps
 * the legacy behavior: strings become one text block, objects become
 * JSON text + `structuredContent`.
 */
export interface McpToolResult {
  content: McpContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Text content block (`mcpText('done')`). */
export const mcpText = (text: string): McpTextContent => ({ type: 'text', text });

/** Image content block from base64 data (`mcpImage(pngBase64, 'image/png')`). */
export const mcpImage = (data: string, mimeType: string): McpImageContent => ({
  type: 'image',
  data,
  mimeType,
});

/** Audio content block from base64 data (`mcpAudio(wavBase64, 'audio/wav')`). */
export const mcpAudio = (data: string, mimeType: string): McpAudioContent => ({
  type: 'audio',
  data,
  mimeType,
});

/** Resource-link content block (`mcpResourceLink('https://…/report.pdf', 'report')`). */
export const mcpResourceLink = (
  uri: string,
  name: string,
  extra?: Omit<McpResourceLinkContent, 'type' | 'uri' | 'name'>
): McpResourceLinkContent => ({ type: 'resource_link', uri, name, ...extra });

/** Embedded-resource content block (`mcpEmbeddedResource({ uri, text })`). */
export const mcpEmbeddedResource = (
  resource: McpEmbeddedResourceContent['resource']
): McpEmbeddedResourceContent => ({ type: 'resource', resource });

const isContentBlock = (value: unknown): value is McpContentBlock => {
  if (typeof value !== 'object' || value === null) return false;
  const block = value as Record<string, unknown>;
  switch (block.type) {
    case 'text':
      return typeof block.text === 'string';
    case 'image':
    case 'audio':
      return typeof block.data === 'string' && typeof block.mimeType === 'string';
    case 'resource_link':
      return typeof block.uri === 'string' && typeof block.name === 'string';
    case 'resource': {
      const resource = block.resource as Record<string, unknown> | undefined;
      return (
        typeof resource === 'object' &&
        resource !== null &&
        typeof resource.uri === 'string' &&
        (typeof resource.text === 'string' || typeof resource.blob === 'string')
      );
    }
    default:
      return false;
  }
};

/**
 * Structural check for the wire shape: a non-empty `content` array whose
 * every entry is a valid block. Strict on purpose — a plain data object that
 * happens to have a `content` key will not match unless its entries are
 * exactly MCP blocks (if your data genuinely collides, return
 * `{ content: [mcpText(…)], structuredContent: data }` explicitly).
 */
const isMcpToolResult = (value: unknown): value is McpToolResult =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as McpToolResult).content) &&
  (value as McpToolResult).content.length > 0 &&
  (value as McpToolResult).content.every(isContentBlock);

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
  /** Optional icons for host UIs (protocol 2025-11-25). */
  icons?: McpIcon[];
  /**
   * Scopes required to see/call this tool. The token must carry ALL of them
   * (`McpAuthInfo.scopes`) for the tool to be visible or callable; a token
   * with no scopes sees only tools that declare none. Built-in tools declare
   * no scopes and are governed by `builtinTools` + the user's own permissions.
   */
  requiredScopes?: string[];
  /**
   * Runs the tool. Return an {@link McpToolResult} for full control over the
   * wire result (images, resource links, mixed blocks); any other value is
   * auto-wrapped (string → text block; object → JSON text + structuredContent).
   */
  execute: (input: z.output<S>, ctx: McpToolContext<TCustom>) => unknown | Promise<unknown>;
}

/**
 * Existential tool type for heterogeneous lists (registries, config arrays).
 * Each tool keeps its precise schema/context types at its definition site
 * (use {@link defineMcpTool}); `any` here only erases them for storage —
 * never use it to define a tool.
 */
export type AnyMcpTool = McpToolDefinition<any, any>;

// ─── Resources & prompts ──────────────────────────────────────────────────────

/**
 * What a resource `read` may return. Strings become text contents, plain
 * objects become pretty-printed JSON (`application/json`), and an explicit
 * `{ text }` or `{ blob }` shape is used as-is (blob = base64).
 */
export type McpResourceReadResult =
  | string
  | { text: string; mimeType?: string }
  | { blob: string; mimeType?: string }
  // Any other object/array is serialized as pretty-printed JSON.
  | object;

/** A fixed-URI resource served via `resources/list` + `resources/read`. */
export interface McpResourceDefinition<TCustom = any> {
  /** Unique resource URI (custom schemes welcome, e.g. `app://orders`). */
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  icons?: McpIcon[];
  /** Same gating semantics as tools: token must carry ALL listed scopes. */
  requiredScopes?: string[];
  read: (ctx: McpToolContext<TCustom>) => McpResourceReadResult | Promise<McpResourceReadResult>;
}

/**
 * A parameterized resource (RFC 6570 level-1 `{var}` templates only), served
 * via `resources/templates/list` and matched on `resources/read`.
 */
export interface McpResourceTemplateDefinition<TCustom = any> {
  /** e.g. `buildbase://workspace/{workspaceId}` — `{var}` matches one segment. */
  uriTemplate: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  icons?: McpIcon[];
  requiredScopes?: string[];
  read: (
    params: Record<string, string>,
    uri: string,
    ctx: McpToolContext<TCustom>
  ) => McpResourceReadResult | Promise<McpResourceReadResult>;
}

/** Message content allowed in prompts (spec: text, image, audio, embedded resource). */
export type McpPromptContent =
  | McpTextContent
  | McpImageContent
  | McpAudioContent
  | McpEmbeddedResourceContent;

/** One message of a prompt template. */
export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: McpPromptContent;
}

/** A prompt template served via `prompts/list` + `prompts/get`. */
export interface McpPromptDefinition<TCustom = any> {
  /** Unique prompt name (same charset rules as tool names). */
  name: string;
  title?: string;
  description?: string;
  icons?: McpIcon[];
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
  requiredScopes?: string[];
  /**
   * Build the messages. A plain string return becomes one user text message;
   * an array is used as the messages; the object form also sets `description`.
   */
  get: (
    args: Record<string, string>,
    ctx: McpToolContext<TCustom>
  ) =>
    | string
    | McpPromptMessage[]
    | { description?: string; messages: McpPromptMessage[] }
    | Promise<string | McpPromptMessage[] | { description?: string; messages: McpPromptMessage[] }>;
}

/** Identity helper for inferred types (mirror of {@link defineMcpTool}). */
export const defineMcpResource = <TCustom = any>(
  resource: McpResourceDefinition<TCustom>
): McpResourceDefinition<TCustom> => resource;

/** Identity helper for inferred types (mirror of {@link defineMcpTool}). */
export const defineMcpResourceTemplate = <TCustom = any>(
  template: McpResourceTemplateDefinition<TCustom>
): McpResourceTemplateDefinition<TCustom> => template;

/** Identity helper for inferred types (mirror of {@link defineMcpTool}). */
export const defineMcpPrompt = <TCustom = any>(
  prompt: McpPromptDefinition<TCustom>
): McpPromptDefinition<TCustom> => prompt;

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
  tools?: AnyMcpTool[];
  /**
   * App-defined resources (`resources/list` + `resources/read`). The
   * `resources` capability is advertised only when at least one resource,
   * template, or `builtinResources` is configured.
   */
  resources?: McpResourceDefinition[];
  /** App-defined parameterized resources (`resources/templates/list`). */
  resourceTemplates?: McpResourceTemplateDefinition[];
  /**
   * Built-in BuildBase context resources (opt-in; requires `buildbase`):
   * `buildbase://profile`, `buildbase://workspaces`, and the
   * `buildbase://workspace/{workspaceId}` template — read-only context a host
   * can load without spending tool calls. Richer data (subscription, usage,
   * credits) stays tools-only.
   */
  builtinResources?: boolean;
  /**
   * App-defined prompt templates (`prompts/list` + `prompts/get`). The
   * `prompts` capability is advertised only when at least one is configured.
   */
  prompts?: McpPromptDefinition[];
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

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];
const JSON_CT = 'application/json';
const TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;

// JSON-RPC error codes.
const RESOURCE_NOT_FOUND = -32002; // per the resources spec
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
  const tools = new Map<string, AnyMcpTool>();
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

  // Resource & prompt registries. Deliberately lean: the built-in catalog is
  // opt-in context only (profile, workspace list, one workspace) — richer data
  // (subscription, usage, credits) stays tools-only to avoid duplicating the
  // whole tool surface as resources.
  if (config.builtinResources && !config.buildbase) {
    throw new Error(
      'builtinResources requires a `buildbase` client — pass one to createMcpHandler.'
    );
  }
  const resources = new Map<string, McpResourceDefinition>();
  const resourceTemplates: McpResourceTemplateDefinition[] = [];
  if (config.builtinResources) {
    resources.set('buildbase://profile', {
      uri: 'buildbase://profile',
      name: 'profile',
      title: 'Your profile',
      description: "The authenticated user's BuildBase profile.",
      mimeType: 'application/json',
      read: ctx => ctx.bb.users.getProfile(),
    });
    resources.set('buildbase://workspaces', {
      uri: 'buildbase://workspaces',
      name: 'workspaces',
      title: 'Your workspaces',
      description: "The authenticated user's workspaces (id, name, roles).",
      mimeType: 'application/json',
      read: ctx => ctx.bb.workspace.list(),
    });
    resourceTemplates.push({
      uriTemplate: 'buildbase://workspace/{workspaceId}',
      name: 'workspace',
      title: 'One workspace',
      description: 'A single workspace: name, members, feature flags, quota snapshot.',
      mimeType: 'application/json',
      read: (params, _uri, ctx) => ctx.bb.workspace.get(params.workspaceId),
    });
  }
  for (const resource of config.resources ?? []) {
    // Custom resources may shadow built-ins on purpose (same URI wins).
    resources.set(resource.uri, resource);
  }
  resourceTemplates.push(...(config.resourceTemplates ?? []));

  const prompts = new Map<string, McpPromptDefinition>();
  for (const prompt of config.prompts ?? []) {
    if (!TOOL_NAME_RE.test(prompt.name)) {
      throw new Error(`Invalid MCP prompt name: "${prompt.name}" (want ${String(TOOL_NAME_RE)})`);
    }
    if (prompts.has(prompt.name)) {
      throw new Error(`Duplicate MCP prompt name: "${prompt.name}"`);
    }
    prompts.set(prompt.name, prompt);
  }

  // Capabilities are truthful: advertised only when something is configured.
  const hasResources = resources.size > 0 || resourceTemplates.length > 0;
  const hasPrompts = prompts.size > 0;

  /** Scope gating shared by tools, resources, and prompts. */
  const scopesSatisfied = (required: string[] | undefined, auth: McpAuthInfo | null): boolean => {
    const granted = new Set(auth?.scopes ?? []);
    return (required ?? []).every(s => granted.has(s));
  };

  /** Execution context shared by tools/call, resources/read, and prompts/get. */
  function contextFor(auth: McpAuthInfo | null, custom: unknown): McpToolContext {
    const sessionId = auth?.sessionId ?? '';
    return {
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
  }

  /**
   * Match a level-1 RFC 6570 template (`{var}` = one path segment) against a
   * URI. Returns the decoded variables, or null when it doesn't match.
   */
  function matchUriTemplate(template: string, uri: string): Record<string, string> | null {
    const names: string[] = [];
    const pattern = template
      .replace(/[.*+?^$()|[\]\\]/g, m => '\\' + m)
      .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name: string) => {
        names.push(name);
        return '([^/]+)';
      });
    const match = new RegExp(`^${pattern}$`).exec(uri);
    if (!match) return null;
    const params: Record<string, string> = {};
    names.forEach((name, i) => {
      try {
        params[name] = decodeURIComponent(match[i + 1]);
      } catch {
        params[name] = match[i + 1];
      }
    });
    return params;
  }

  /** Normalize a resource `read` return value to spec ResourceContents. */
  function resourceContents(
    uri: string,
    declaredMimeType: string | undefined,
    result: McpResourceReadResult
  ): Record<string, unknown> {
    if (typeof result === 'string') {
      return { uri, mimeType: declaredMimeType ?? 'text/plain', text: result };
    }
    if (result && typeof result === 'object') {
      const shaped = result as { text?: unknown; blob?: unknown; mimeType?: unknown };
      if (typeof shaped.text === 'string') {
        return {
          uri,
          mimeType:
            typeof shaped.mimeType === 'string'
              ? shaped.mimeType
              : (declaredMimeType ?? 'text/plain'),
          text: shaped.text,
        };
      }
      if (typeof shaped.blob === 'string') {
        return {
          uri,
          mimeType:
            typeof shaped.mimeType === 'string'
              ? shaped.mimeType
              : (declaredMimeType ?? 'application/octet-stream'),
          blob: shaped.blob,
        };
      }
    }
    return {
      uri,
      mimeType: declaredMimeType ?? 'application/json',
      text: JSON.stringify(result, null, 2),
    };
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
  function toolJsonSchema(tool: AnyMcpTool): Record<string, unknown> {
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

  function visibleTools(auth: McpAuthInfo | null): AnyMcpTool[] {
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
          // Truthful capabilities: resources/prompts appear only when
          // something is actually configured. No subscribe/listChanged —
          // the stateless transport has no push channel.
          capabilities: {
            tools: { listChanged: false },
            ...(hasResources ? { resources: {} } : {}),
            ...(hasPrompts ? { prompts: {} } : {}),
          },
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
          ...(tool.icons ? { icons: tool.icons } : {}),
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
            // Per SEP-1303 (2025-11-25): input-validation failures are tool
            // execution errors, not protocol errors — the model sees the issues
            // in-band and can self-correct the arguments.
            const issues = parsed.error.issues
              .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
              .join('; ');
            return rpcResult(id, {
              content: [{ type: 'text', text: `Invalid arguments for ${name}: ${issues}` }],
              isError: true,
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

        const context = contextFor(auth, custom);

        try {
          const result = await tool.execute(input, context);
          // Wire-shaped results pass through untouched — full control over
          // content blocks (images, audio, resource links), structuredContent,
          // and isError.
          if (isMcpToolResult(result)) {
            return rpcResult(id, {
              content: result.content,
              ...(result.structuredContent !== undefined
                ? { structuredContent: result.structuredContent }
                : {}),
              isError: result.isError ?? false,
            });
          }
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

      case 'resources/list': {
        if (!hasResources) break;
        // Single page — cursor accepted (spec pagination) and ignored.
        const list = Array.from(resources.values())
          .filter(r => scopesSatisfied(r.requiredScopes, auth))
          .map(r => ({
            uri: r.uri,
            name: r.name,
            ...(r.title ? { title: r.title } : {}),
            ...(r.description ? { description: r.description } : {}),
            ...(r.mimeType ? { mimeType: r.mimeType } : {}),
            ...(r.icons ? { icons: r.icons } : {}),
          }));
        return rpcResult(id, { resources: list });
      }

      case 'resources/templates/list': {
        if (!hasResources) break;
        const list = resourceTemplates
          .filter(t => scopesSatisfied(t.requiredScopes, auth))
          .map(t => ({
            uriTemplate: t.uriTemplate,
            name: t.name,
            ...(t.title ? { title: t.title } : {}),
            ...(t.description ? { description: t.description } : {}),
            ...(t.mimeType ? { mimeType: t.mimeType } : {}),
            ...(t.icons ? { icons: t.icons } : {}),
          }));
        return rpcResult(id, { resourceTemplates: list });
      }

      case 'resources/read': {
        if (!hasResources) break;
        if (typeof params.uri !== 'string' || params.uri === '') {
          return rpcError(id, INVALID_PARAMS, 'Missing required parameter: uri');
        }
        const uri = params.uri;
        let mimeType: string | undefined;
        let read: ((ctx: McpToolContext) => Promise<McpResourceReadResult>) | null = null;

        const exact = resources.get(uri);
        if (exact) {
          // An exact resource owns its URI outright: when the token lacks its
          // scopes, stop here — falling through to a laxer-scoped template
          // matching the same URI would bypass the resource's scope gate.
          if (!scopesSatisfied(exact.requiredScopes, auth)) {
            return rpcError(id, RESOURCE_NOT_FOUND, 'Resource not found', 200, { uri });
          }
          mimeType = exact.mimeType;
          read = async ctx => exact.read(ctx);
        } else {
          for (const template of resourceTemplates) {
            if (!scopesSatisfied(template.requiredScopes, auth)) continue;
            const templateParams = matchUriTemplate(template.uriTemplate, uri);
            if (templateParams) {
              mimeType = template.mimeType;
              read = async ctx => template.read(templateParams, uri, ctx);
              break;
            }
          }
        }
        // Not-found and not-visible are indistinguishable on purpose (no
        // resource-existence oracle for under-scoped tokens).
        if (!read) {
          return rpcError(id, RESOURCE_NOT_FOUND, 'Resource not found', 200, { uri });
        }

        let custom: unknown;
        if (config.context) {
          try {
            custom = await config.context(auth, req);
          } catch (error) {
            reportError(error, { method: rpcMethod });
            return rpcError(id, INTERNAL_ERROR, 'Context initialization failed');
          }
        }
        try {
          const result = await read(contextFor(auth, custom));
          return rpcResult(id, { contents: [resourceContents(uri, mimeType, result)] });
        } catch (error) {
          reportError(error, { method: rpcMethod });
          return rpcError(id, INTERNAL_ERROR, 'Resource read failed', 200, { uri });
        }
      }

      case 'prompts/list': {
        if (!hasPrompts) break;
        const list = Array.from(prompts.values())
          .filter(p => scopesSatisfied(p.requiredScopes, auth))
          .map(p => ({
            name: p.name,
            ...(p.title ? { title: p.title } : {}),
            ...(p.description ? { description: p.description } : {}),
            ...(p.arguments ? { arguments: p.arguments } : {}),
            ...(p.icons ? { icons: p.icons } : {}),
          }));
        return rpcResult(id, { prompts: list });
      }

      case 'prompts/get': {
        if (!hasPrompts) break;
        const name = typeof params.name === 'string' ? params.name : '';
        const prompt = prompts.get(name);
        if (!prompt || !scopesSatisfied(prompt.requiredScopes, auth)) {
          return rpcError(id, INVALID_PARAMS, `Unknown prompt: ${name || '(missing name)'}`);
        }

        const rawArgs =
          typeof params.arguments === 'object' && params.arguments !== null
            ? (params.arguments as Record<string, unknown>)
            : {};
        const args: Record<string, string> = {};
        for (const [key, value] of Object.entries(rawArgs)) {
          if (typeof value === 'string') args[key] = value;
        }
        const missing = (prompt.arguments ?? [])
          .filter(a => a.required && !(a.name in args))
          .map(a => a.name);
        if (missing.length) {
          return rpcError(id, INVALID_PARAMS, `Missing required arguments: ${missing.join(', ')}`);
        }

        let custom: unknown;
        if (config.context) {
          try {
            custom = await config.context(auth, req);
          } catch (error) {
            reportError(error, { method: rpcMethod });
            return rpcError(id, INTERNAL_ERROR, 'Context initialization failed');
          }
        }
        try {
          const result = await prompt.get(args, contextFor(auth, custom));
          const normalized: { description?: string; messages: McpPromptMessage[] } =
            typeof result === 'string'
              ? { messages: [{ role: 'user', content: mcpText(result) }] }
              : Array.isArray(result)
                ? { messages: result }
                : result;
          const description = normalized.description ?? prompt.description;
          return rpcResult(id, {
            ...(description ? { description } : {}),
            messages: normalized.messages,
          });
        } catch (error) {
          reportError(error, { method: rpcMethod });
          return rpcError(id, INTERNAL_ERROR, 'Prompt rendering failed');
        }
      }

      default:
        break;
    }
    return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${rpcMethod}`);
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
      capabilities: {
        tools: { listChanged: false },
        ...(hasResources ? { resources: {} } : {}),
        ...(hasPrompts ? { prompts: {} } : {}),
      },
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
