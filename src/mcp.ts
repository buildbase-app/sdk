/**
 * @buildbase/sdk/mcp — MCP server entry point (server-only, zero React).
 *
 * Expose a live MCP (Model Context Protocol) server from your app so AI agents
 * can operate its BuildBase capabilities — plus your own custom tools. Pure
 * functions and Web-standard `Request`/`Response`; runs on Node 18+, edge,
 * Deno, and Bun. See `createMcpHandler` for wiring examples.
 *
 * Split from the core entry because this module uses `zod` at runtime for tool
 * input validation — importing `@buildbase/sdk` alone stays zod-free.
 */

// ─── MCP server ───────────────────────────────────────────────────────────────
export { createMcpHandler, defineMcpTool } from './lib/mcp-server';
export type {
  CreateMcpHandlerConfig,
  McpAuthInfo,
  McpBuildBaseClient,
  McpHandler,
  McpHttpRequest,
  McpHttpResponse,
  McpToolAnnotations,
  McpToolContext,
  McpToolDefinition,
} from './lib/mcp-server';

// ─── Built-in BuildBase tools ─────────────────────────────────────────────────
export { builtinMcpTools, selectBuiltinTools } from './lib/mcp-tools';
export type { BuiltinMcpToolName } from './lib/mcp-tools';

// ─── Auth helpers (re-exported so MCP consumers import from one place) ────────
export {
  AppBridgeError,
  bearerChallenge,
  extractBearerToken,
  signClientJwt,
  verifyClientJwt,
} from './lib/agent-bridge';

// ─── Related types from core ──────────────────────────────────────────────────
export type { McpServerCard } from './lib/agent-discovery';
export type { ScopedActions } from './lib/server-client';
