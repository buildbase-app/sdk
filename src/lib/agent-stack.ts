/**
 * createAgentStack — the whole agent-readiness + MCP surface from ONE config.
 *
 * Everything the SDK can derive, it derives: the MCP endpoint, the server
 * card, the RFC 9728 protected-resource metadata, the API-catalog entry, the
 * BuildBase client, token verification (via `buildbaseAuth`), CORS, and the
 * discovery `Link` header — so a consumer configures identity once and wires
 * two routes. Every derived value stays overridable ("accelerate, never
 * gate").
 *
 * @example Next.js App Router — complete agent support:
 * ```ts
 * // lib/agent.ts
 * import { createAgentStack } from "@buildbase/sdk/mcp";
 * export const agent = createAgentStack({
 *   serverUrl: process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL!,
 *   orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID!,
 *   siteUrl: "https://app.example.com",
 *   site: { name: "My App" },
 *   secret: process.env.SYSTEM_SECRET!,
 * });
 *
 * // app/api/mcp/route.ts
 * import { agent } from "@/lib/agent";
 * export const { GET, POST, DELETE, OPTIONS } = agent.routes;
 *
 * // app/.well-known/[...path]/route.ts — and identical one-liners at
 * // app/robots.txt/route.ts, app/auth.md/route.ts, app/security.txt/route.ts
 * import { agent } from "@/lib/agent";
 * export const GET = agent.serveAgentPath;
 * ```
 *
 * @example Express / Hono / Bun — same stack, `handle`/`fetch` style:
 * ```ts
 * app.all("/api/mcp", async (req, res) => {
 *   const r = await agent.mcp.handle({ method: req.method, headers: req.headers, body: req.body });
 *   res.status(r.status).set(r.headers).send(r.body);
 * });
 * app.use(async (req, res, next) => {
 *   const doc = await agent.resolvePath(req.path);
 *   if (!doc) return next();
 *   res.status(doc.status).set("Content-Type", doc.contentType).send(doc.body);
 * });
 * ```
 */

import { buildbaseAuth } from './agent-auth';
import {
  buildDiscoveryLinkHeader,
  resolveAgentPath,
  type AgentReadyConfig,
  type AppScope,
  type DiscoveryDocument,
} from './agent-discovery';
import {
  createMcpHandler,
  type CreateMcpHandlerConfig,
  type McpBuildBaseClient,
  type McpHandler,
  type McpToolDefinition,
} from './mcp-server';
import BuildBase from './server-client';

/** Configuration for {@link createAgentStack}. */
export interface AgentStackConfig {
  /** BuildBase server base URL. */
  serverUrl: string;
  /** The org id. */
  orgId: string;
  /** This app's public origin, e.g. `https://app.example.com`. */
  siteUrl: string;
  /** Site identity for every discovery document. */
  site: AgentReadyConfig['site'];
  /**
   * The app's token-signing secret — wires `buildbaseAuth` (verify + audience
   * binding + `sid` decryption) automatically. Never sent anywhere. Omit only
   * when supplying `mcp.auth` yourself.
   */
  secret?: string;
  /**
   * The app's OAuth scope catalog (see `AgentReadyConfig.scopes`) —
   * `scopes_supported` in the protected-resource metadata reads from it.
   */
  scopes?: AppScope[];
  /** MCP server options. All optional — omit the whole block for defaults. */
  mcp?: {
    /** Endpoint path on `siteUrl`. Default `/api/mcp`. */
    path?: string;
    /** Advertised server identity. Defaults to the site name, v1.0.0. */
    serverInfo?: { name: string; version: string };
    /** Your custom tools. */
    tools?: McpToolDefinition<any, any>[];
    /** Built-in tool selection. Default `'readonly'`. */
    builtinTools?: CreateMcpHandlerConfig['builtinTools'];
    /** Scopes advertised on the protected-resource metadata. */
    scopes?: string[];
    /** Your own BuildBase client; auto-created from serverUrl/orgId if omitted. */
    buildbase?: McpBuildBaseClient;
    /** Override the derived auth (e.g. `false` for local dev). */
    auth?: CreateMcpHandlerConfig['auth'];
    /** Any remaining `createMcpHandler` option, merged last. */
    handler?: Partial<CreateMcpHandlerConfig>;
  };
  /**
   * Any {@link AgentReadyConfig} field (robots, skills, llms.txt, security,
   * a2aCard, extraPaths, …) — merged over the derived discovery config, so
   * every derived value can be replaced.
   */
  discovery?: Partial<AgentReadyConfig>;
}

/** What {@link createAgentStack} returns. */
export interface AgentStack {
  /** The MCP handler (`handle`/`fetch`/`listTools`/`serverCard`). */
  mcp: McpHandler;
  /** Absolute MCP endpoint URL. */
  mcpEndpoint: string;
  /** The fully derived discovery config (inspect or reuse in middleware). */
  config: AgentReadyConfig;
  /** Discovery `Link` header value for your middleware / edge responses. */
  linkHeader: string;
  /** Resolve any agent-facing path to a document (framework-agnostic). */
  resolvePath(path: string): Promise<DiscoveryDocument | null>;
  /** Web-standard discovery route: hand it any `Request`, get a `Response`. */
  serveAgentPath(request: Request): Promise<Response>;
  /**
   * Web-standard MCP route handlers, ready to re-export from a route file:
   * `export const { GET, POST, DELETE, OPTIONS } = agent.routes`.
   */
  routes: {
    GET: (request: Request) => Promise<Response>;
    POST: (request: Request) => Promise<Response>;
    DELETE: (request: Request) => Promise<Response>;
    OPTIONS: (request: Request) => Promise<Response>;
  };
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Build the complete agent stack — MCP server + discovery surface — from one
 * config object. See the module doc for full wiring examples.
 */
export function createAgentStack(stack: AgentStackConfig): AgentStack {
  const site = trimTrailingSlash(stack.siteUrl);
  const mcpPath = stack.mcp?.path ?? '/api/mcp';
  const mcpEndpoint = `${site}${mcpPath.startsWith('/') ? mcpPath : `/${mcpPath}`}`;
  const serverInfo = stack.mcp?.serverInfo ?? { name: stack.site.name, version: '1.0.0' };

  // BuildBase RFC 9728 convention: the canonical MCP resource identifier is
  // `<host>/mcp` (metadata at /.well-known/oauth-protected-resource/mcp) even
  // when the HTTP route lives elsewhere (e.g. Next.js /api/mcp). Both URIs are
  // accepted as token audiences so clients that bind to the literal endpoint
  // URL (RFC 9728 path derivation from the URL they connect to) keep working.
  const canonicalMcpResource = `${site}/mcp`;
  const audiences = Array.from(new Set([canonicalMcpResource, mcpEndpoint]));

  const auth =
    stack.mcp?.auth ??
    (stack.secret
      ? buildbaseAuth({
          secret: stack.secret,
          resource: audiences,
          resourceMetadataUrl: `${site}/.well-known/oauth-protected-resource/mcp`,
          requireAudience: true,
        })
      : undefined);
  if (auth === undefined) {
    throw new Error(
      'createAgentStack: pass `secret` (the app token-signing secret) to derive auth, ' +
        'or set `mcp.auth` yourself (`false` disables auth — local development only).'
    );
  }

  const buildbase =
    stack.mcp?.buildbase ?? BuildBase({ serverUrl: stack.serverUrl, orgId: stack.orgId });

  const mcp = createMcpHandler({
    buildbase,
    serverInfo,
    auth,
    tools: stack.mcp?.tools,
    builtinTools: stack.mcp?.builtinTools ?? 'readonly',
    ...stack.mcp?.handler,
  });

  const config: AgentReadyConfig = {
    serverUrl: stack.serverUrl,
    orgId: stack.orgId,
    siteUrl: stack.siteUrl,
    site: stack.site,
    mcpServerCard: mcp.serverCard({
      endpoint: mcpEndpoint,
      ...(stack.site.description ? { description: stack.site.description } : {}),
      ...(stack.site.documentationUrl ? { documentationUrl: stack.site.documentationUrl } : {}),
    }),
    ...(stack.scopes ? { scopes: stack.scopes } : {}),
    // One convention, three documents: the whole-API root resource, the
    // canonical `<host>/mcp` resource, and (when the route lives elsewhere)
    // the literal endpoint URL — so RFC 9728 path derivation resolves from
    // either identifier.
    protectedResources: audiences
      .map(resource => ({
        resource,
        ...(stack.mcp?.scopes?.length ? { scopes: stack.mcp.scopes } : {}),
        ...(stack.site.documentationUrl ? { documentationUrl: stack.site.documentationUrl } : {}),
      }))
      .concat([
        {
          resource: site,
          ...(stack.site.documentationUrl ? { documentationUrl: stack.site.documentationUrl } : {}),
        },
      ]),
    apiCatalog: [
      {
        anchor: mcpEndpoint,
        title: `${stack.site.name} MCP server`,
        serviceDesc: `${site}/.well-known/mcp/server-card.json`,
      },
    ],
    ...stack.discovery,
  };

  // Discovery documents are public by definition and fetched cross-origin by
  // browser-based agents/inspectors, so they are CORS-open.
  const DISCOVERY_CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  async function serveAgentPath(request: Request): Promise<Response> {
    if (request.method.toUpperCase() === 'OPTIONS') {
      return new Response(null, { status: 204, headers: DISCOVERY_CORS });
    }
    const doc = await resolveAgentPath(new URL(request.url).pathname, config);
    if (!doc) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...DISCOVERY_CORS },
      });
    }
    return new Response(doc.body, {
      status: doc.status,
      headers: {
        'Content-Type': doc.contentType,
        'Cache-Control': doc.cacheControl,
        ...(doc.vary ? { Vary: doc.vary } : {}),
        ...DISCOVERY_CORS,
      },
    });
  }

  const route = (request: Request) => mcp.fetch(request);

  return {
    mcp,
    mcpEndpoint,
    config,
    linkHeader: buildDiscoveryLinkHeader(config),
    resolvePath: (path: string) => resolveAgentPath(path, config),
    serveAgentPath,
    routes: { GET: route, POST: route, DELETE: route, OPTIONS: route },
  };
}
