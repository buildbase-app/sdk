/**
 * Agent-readiness discovery toolkit (server-side, framework-agnostic).
 *
 * Makes a consuming app "agent ready" (see https://isitagentready.com) by
 * serving the standard machine-readable discovery documents an AI agent looks
 * for — with the BuildBase server as the source of truth.
 *
 * The heavy lifting already lives on the platform: an org admin configures
 * agent readiness once (protected resources, scopes, llms.txt) and the server
 * publishes the OAuth2 authorization-server metadata (RFC 8414) and the
 * per-resource protected-resource metadata (RFC 9728). This module lets an app
 * re-serve those documents from its own origin — where agents actually look —
 * plus generate the static discovery documents (Agent Card, Agent Skills,
 * security.txt) from local config. The result: an org admin adds full agent
 * support to their app in a couple of lines, and never hand-writes a
 * `.well-known` route.
 *
 * Zero React and no framework types — every function returns plain data. The
 * only runtime dependency is `fetch`; SHA-256 (for Agent Skills digests) is a
 * dependency-free pure-JS implementation, so there is no Web Crypto / Node
 * `crypto` requirement and output is identical on every runtime (browser, edge,
 * Node 18+). Wire the returned documents into your router yourself (Next.js,
 * Hono, Express, …).
 *
 * @example Next.js App Router — the entire integration:
 * ```ts
 * // lib/agent-ready.ts
 * import { resolveAgentPath, type AgentReadyConfig } from "@buildbase/sdk";
 * export const agentConfig: AgentReadyConfig = {
 *   serverUrl: process.env.BUILDBASE_URL!,
 *   orgId: process.env.BUILDBASE_ORG_ID!,
 *   siteUrl: "https://imejis.io",
 *   site: { name: "Imejis", description: "Generate images from templates via API." },
 *   robots: { contentSignals: { search: true, aiInput: true, aiTrain: false } },
 * };
 * export async function serveAgentPath(req: Request): Promise<Response> {
 *   const doc = await resolveAgentPath(new URL(req.url).pathname, agentConfig);
 *   if (!doc) return new Response('{"error":"not_found"}', { status: 404 });
 *   return new Response(doc.body, {
 *     status: doc.status,
 *     headers: {
 *       "Content-Type": doc.contentType,
 *       "Cache-Control": doc.cacheControl,
 *       ...(doc.vary ? { Vary: doc.vary } : {}),
 *     },
 *   });
 * }
 *
 * // app/.well-known/[...path]/route.ts — plus identical two-liners at
 * // app/robots.txt/route.ts, app/llms.txt/route.ts, app/auth.md/route.ts, …
 * import { serveAgentPath } from "@/lib/agent-ready";
 * export const GET = serveAgentPath;
 * ```
 */

import { sha256Hex, utf8Bytes } from './sha256';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * The agent-readiness bundle the BuildBase server publishes for an org at
 * `GET /api/v1/public/:orgId/agent-readiness`. This is the single source of
 * truth an org admin edits; everything org-specific below is derived from it.
 */
export interface AgentReadinessBundle {
  /** False when the org has not enabled agent readiness — everything else absent. */
  enabled: boolean;
  /**
   * Pointer to the org's RFC 8414 authorization-server metadata. This is the
   * ONLY thing the platform owns and serves — discovery content (protected
   * resources, llms.txt, sitemap, API catalog, skills) is app-owned and
   * defined locally in {@link AgentReadyConfig}.
   */
  authorizationServer?: {
    issuer: string;
    metadataUrl: string;
  };
}

/** An Agent Skill (Agent Skills Discovery RFC v0.2.0) published by this app. */
export interface AgentSkill {
  /** Stable slug, e.g. `imejis-api`. */
  name: string;
  /** One-line human/agent-readable summary. */
  description: string;
  /** Full markdown content of the SKILL.md served for this skill. */
  content: string;
  /**
   * Path the SKILL.md is served from. Defaults to
   * `/.well-known/agent-skills/<name>/SKILL.md`.
   */
  path?: string;
  /** Skill artifact kind. Defaults to `skill-md`. */
  type?: 'skill-md' | 'archive';
}

/** One API described in an API Catalog (RFC 9727 / RFC 9264 linkset). */
export interface ApiCatalogApi {
  /** Anchor URL identifying the API, e.g. `https://api.imejis.io`. */
  anchor: string;
  /** OpenAPI / machine-readable description URL (link rel `service-desc`). */
  serviceDesc?: string;
  /** Human documentation URL (link rel `service-doc`). */
  serviceDoc?: string;
  /** Health / status endpoint URL (link rel `status`). */
  status?: string;
  /** Optional human title for the API. */
  title?: string;
}

/** MCP Server Card (SEP-1649 / SEP-2127), advertising a live MCP server. */
export interface McpServerCard {
  /** Server name. */
  name: string;
  /** Server version. */
  version: string;
  /** MCP transport endpoint URL the agent connects to. */
  endpoint: string;
  /** Transport type. Defaults to `"streamable-http"`. */
  transport?: string;
  /** Capabilities object, e.g. `{ tools: {}, resources: {} }`. */
  capabilities?: Record<string, unknown>;
  /** Optional human description. */
  description?: string;
  /** Documentation URL. */
  documentationUrl?: string;
}

/** One robots.txt policy group (a `User-agent:` block). */
export interface RobotsPolicy {
  /** User-agent(s) this group applies to, e.g. `'*'` or `'GPTBot'`. */
  userAgent: string | string[];
  /** Paths to allow, e.g. `['/']`. */
  allow?: string[];
  /** Paths to disallow, e.g. `['/api/']`. */
  disallow?: string[];
  /** Optional `Crawl-delay` (non-standard but widely honored). */
  crawlDelay?: number;
}

/**
 * Content Signals (https://contentsignals.org) — declares how crawlers may use
 * this site's content. Each flag renders as `<signal>=yes|no`; omitted flags
 * are not emitted (unset = no preference expressed).
 */
export interface ContentSignals {
  /** May content be indexed for search? → `search=yes|no`. */
  search?: boolean;
  /** May content be used as AI input (RAG, grounding)? → `ai-input=yes|no`. */
  aiInput?: boolean;
  /** May content be used for AI training? → `ai-train=yes|no`. */
  aiTrain?: boolean;
}

/** Configuration for `buildRobotsTxt`. Every field is optional. */
export interface RobotsConfig {
  /** Policy groups. Defaults to `[{ userAgent: '*', allow: ['/'] }]`. */
  policies?: RobotsPolicy[];
  /**
   * Stance toward known AI crawlers ({@link AI_BOT_USER_AGENTS}): `'allow'`
   * (default — an explicit `Allow: /` group per bot, so readiness checkers see
   * AI bots addressed), `'deny'` (a `Disallow: /` group per bot), or explicit
   * per-bot policies for finer control.
   */
  aiBots?: 'allow' | 'deny' | RobotsPolicy[];
  /** Content-Signal directive attached to the `User-agent: *` group. */
  contentSignals?: ContentSignals;
  /**
   * Sitemap URLs. Defaults to `${siteUrl}/sitemap.xml` when `config.sitemap`
   * is set; pass `[]` to emit no `Sitemap:` line.
   */
  sitemaps?: string[];
}

/** One URL entry for the generated sitemap.xml. */
export interface SitemapUrl {
  /** Absolute URL, or a path resolved against `siteUrl`. */
  loc: string;
  /** ISO-8601 last-modified date. */
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** 0.0–1.0. */
  priority?: number;
}

/** Configuration for the agent-readiness discovery layer. */
export interface AgentReadyConfig {
  /** BuildBase server base URL, e.g. `https://api.buildbase.app` (no trailing slash needed). */
  serverUrl: string;
  /** The org id (24-hex) whose agent-readiness config to serve. */
  orgId: string;
  /**
   * This app's public origin, e.g. `https://imejis.io`. Used to build absolute
   * URLs in the Agent Card and to match RFC 9728 resource paths.
   */
  siteUrl: string;
  /** Static metadata for the Agent Card (`/.well-known/agent.json`). */
  site: {
    name: string;
    description?: string;
    /** Absolute URL to human/agent documentation. */
    documentationUrl?: string;
    /** Support/contact email surfaced on the Agent Card. */
    contactEmail?: string;
    /** Provider block; defaults to `{ name: site.name, url: siteUrl }`. */
    provider?: { name: string; url: string };
  };
  /** Agent Skills to publish. Omit to skip the Agent Skills documents. */
  skills?: AgentSkill[];
  /** security.txt fields (RFC 9116). Omit to skip serving security.txt. */
  security?: {
    /** Contact URI(s) — email (`mailto:`) or URL. */
    contact: string | string[];
    /** ISO-8601 expiry; strongly recommended by RFC 9116. */
    expires?: string;
    /** Security policy URL. */
    policy?: string;
  };
  /**
   * API Catalog entries (RFC 9727), served at `/.well-known/api-catalog` as
   * `application/linkset+json`. Omit to skip.
   */
  apiCatalog?: ApiCatalogApi[];
  /**
   * MCP Server Card (SEP-1649), served at `/.well-known/mcp/server-card.json`.
   * Only set this when you actually run an MCP server — the card advertises a
   * live transport endpoint. Omit to skip.
   */
  mcpServerCard?: McpServerCard;
  /**
   * Raw `/auth.md` content (agent registration/auth instructions). If omitted,
   * `buildAuthMd` generates one from the OAuth metadata + site config.
   */
  authMd?: string;
  /**
   * Local `/llms.txt` content. Takes precedence over the org-authored llms.txt
   * from the platform bundle — use when the app owns richer llms.txt content.
   */
  llmsTxt?: string;
  /** robots.txt generation (`buildRobotsTxt`). Omitted = sane defaults. */
  robots?: RobotsConfig;
  /**
   * URLs for a minimal generated sitemap.xml (`buildSitemap`). Omit when the
   * app already generates sitemaps (e.g. next-sitemap) — the builder then
   * returns null and your own files win.
   */
  sitemap?: { urls: Array<string | SitemapUrl> };
  /**
   * RFC 9728 protected resources this app serves, defined locally (app-owned).
   * When set, the SDK builds the `/.well-known/oauth-protected-resource`
   * document from this config — `authorization_servers` is derived from
   * `serverUrl`/`orgId` (the BuildBase issuer). Takes precedence over the
   * platform bundle. Omit to fall back to the org-configured bundle.
   */
  protectedResources?: Array<{
    /** The protected API's resource URI. Defaults to `siteUrl`. */
    resource?: string;
    /** Scopes this resource accepts (`scopes_supported`). */
    scopes?: string[];
    /** Human documentation URL (`resource_documentation`). */
    documentationUrl?: string;
    /** Bearer methods (`bearer_methods_supported`). Defaults to `['header']`. */
    bearerMethods?: string[];
  }>;
  /** TTL (seconds) for cached platform fetches. Default 300 (5 min). */
  cacheTtlSeconds?: number;
  /**
   * Timeout (ms) for platform fetches. Fail-soft on timeout, so a hung or slow
   * BuildBase server can't hang discovery routes forever. Default 5000; set `0`
   * to disable.
   */
  fetchTimeoutMs?: number;
  /** Injectable fetch, mainly for testing. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** A rendered discovery document ready to become an HTTP response. */
export interface DiscoveryDocument {
  status: number;
  contentType: string;
  body: string;
  cacheControl: string;
  /** Value for a `Vary` response header, when the body is negotiated. */
  vary?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CACHE_TTL = 300;
const PROTECTED_RESOURCE_PREFIX = '/.well-known/oauth-protected-resource';
const AGENT_SKILLS_PREFIX = '/.well-known/agent-skills';
const API_CATALOG_PATH = '/.well-known/api-catalog';
const MCP_CARD_PATH = '/.well-known/mcp/server-card.json';
const JSON_CT = 'application/json';
const LINKSET_CT = 'application/linkset+json';
const MARKDOWN_CT = 'text/markdown; charset=utf-8';
const TEXT_CT = 'text/plain; charset=utf-8';
const XML_CT = 'application/xml; charset=utf-8';

/**
 * User-agent strings of the known AI crawlers/agents that agent-readiness
 * checkers look for in robots.txt (`buildRobotsTxt` emits a policy group per
 * entry when `robots.aiBots` is `'allow'`/`'deny'`).
 */
export const AI_BOT_USER_AGENTS: readonly string[] = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'meta-externalagent',
  'Amazonbot',
];

// ─── Small utilities ──────────────────────────────────────────────────────────

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function cacheHeader(ttl: number): string {
  return `public, max-age=${ttl}, s-maxage=${ttl}`;
}

/**
 * SHA-256 of `content` as `sha256:<hex>`, via the shared pure-JS hash (no Web
 * Crypto / Node `crypto`), so output is identical on every runtime.
 */
export function sha256Digest(content: string): string {
  return 'sha256:' + sha256Hex(utf8Bytes(content));
}

// ─── Platform fetch (with tiny TTL cache) ─────────────────────────────────────

interface CacheEntry {
  value: AgentReadinessBundle;
  expiresAt: number;
}

const bundleCache = new Map<string, CacheEntry>();

const DEFAULT_FETCH_TIMEOUT_MS = 5000;

/**
 * `fetch` with a bounded timeout via `AbortController`, so a hung platform
 * connection rejects (and the caller fail-softs) instead of pending forever.
 */
async function fetchWithTimeout(
  doFetch: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  if (!timeoutMs || timeoutMs <= 0) return doFetch(url, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await doFetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch (and cache) an org's agent-readiness bundle from the BuildBase server.
 *
 * Fail-soft: any network/HTTP/parse error resolves to `{ enabled: false }` so a
 * discovery route never 500s and never leaks the platform being down — agents
 * simply see the app as not (yet) agent-ready.
 */
export async function fetchAgentReadiness(config: AgentReadyConfig): Promise<AgentReadinessBundle> {
  const ttl = config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL;
  const key = `${trimTrailingSlash(config.serverUrl)}::${config.orgId}`;

  const cached = bundleCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const doFetch = config.fetch ?? fetch;
  const url = `${trimTrailingSlash(config.serverUrl)}/api/v1/public/${config.orgId}/agent-readiness`;

  let value: AgentReadinessBundle = { enabled: false };
  try {
    const res = await fetchWithTimeout(
      doFetch,
      url,
      { headers: { Accept: JSON_CT } },
      config.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
    );
    if (res.ok) {
      const data = (await res.json()) as AgentReadinessBundle;
      if (data && typeof data === 'object') value = data;
    }
  } catch {
    // fail-soft — value stays { enabled: false }
  }

  bundleCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  return value;
}

interface MetadataCacheEntry {
  value: Record<string, unknown> | null;
  expiresAt: number;
}

const authServerMetadataCache = new Map<string, MetadataCacheEntry>();

/**
 * Fetch (and cache) the platform's RFC 8414 authorization-server metadata so
 * it can be re-served from this app's origin. Fail-soft: null on any error.
 */
async function fetchAuthServerMetadata(
  metadataUrl: string,
  config: AgentReadyConfig
): Promise<Record<string, unknown> | null> {
  const ttl = config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL;

  const cached = authServerMetadataCache.get(metadataUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const doFetch = config.fetch ?? fetch;
  let value: Record<string, unknown> | null = null;
  try {
    const res = await fetchWithTimeout(
      doFetch,
      metadataUrl,
      { headers: { Accept: JSON_CT } },
      config.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      if (data && typeof data === 'object') value = data;
    }
  } catch {
    // fail-soft — value stays null
  }

  authServerMetadataCache.set(metadataUrl, { value, expiresAt: Date.now() + ttl * 1000 });
  return value;
}

/** Clear the in-memory agent-readiness caches (mainly for tests). */
export function clearAgentReadinessCache(): void {
  bundleCache.clear();
  authServerMetadataCache.clear();
}

// ─── Document builders ────────────────────────────────────────────────────────

/**
 * The Agent Card served at `/.well-known/agent.json`. A stable, machine-readable
 * entry point advertising who this app is and where agents can discover more.
 */
export function buildAgentCard(
  config: AgentReadyConfig,
  bundle: AgentReadinessBundle
): DiscoveryDocument {
  const site = trimTrailingSlash(config.siteUrl);
  const capabilities: Record<string, unknown> = {
    llms_txt: '/llms.txt',
    sitemap: '/sitemap.xml',
    robots: '/robots.txt',
    oauth_protected_resource: PROTECTED_RESOURCE_PREFIX,
  };
  if (bundle.authorizationServer?.metadataUrl) {
    capabilities.oauth_authorization_server = bundle.authorizationServer.metadataUrl;
    // Same metadata is also re-served at the OIDC discovery alias from this
    // origin (see resolveWellKnown), for agents that only probe that path.
    capabilities.openid_configuration = '/.well-known/openid-configuration';
  }
  // /auth.md exists whenever there's an authorization server (or an override).
  if (bundle.authorizationServer || config.authMd) {
    capabilities.auth = '/auth.md';
  }
  if (config.skills?.length) {
    capabilities.agent_skills = `${AGENT_SKILLS_PREFIX}/index.json`;
  }
  if (config.apiCatalog?.length) {
    capabilities.api_catalog = API_CATALOG_PATH;
  }
  if (config.mcpServerCard) {
    capabilities.mcp_server_card = MCP_CARD_PATH;
  }

  const card = {
    schema_version: '1.0',
    name: config.site.name,
    ...(config.site.description ? { description: config.site.description } : {}),
    url: site,
    ...(config.site.documentationUrl ? { documentation_url: config.site.documentationUrl } : {}),
    provider: config.site.provider ?? { name: config.site.name, url: site },
    capabilities,
    ...(config.site.contactEmail ? { contact: { email: config.site.contactEmail } } : {}),
  };

  return jsonDoc(card, config);
}

/**
 * Map a protected-resource URI to the RFC 9728 well-known path it is served at.
 * `https://site.com/`        → `/.well-known/oauth-protected-resource`
 * `https://site.com/api/img` → `/.well-known/oauth-protected-resource/api/img`
 */
function protectedResourceWellKnownPath(resource: string): string {
  let pathname = '/';
  try {
    pathname = new URL(resource).pathname;
  } catch {
    // resource wasn't an absolute URL; treat it as a path suffix directly
    pathname = resource.startsWith('/') ? resource : `/${resource}`;
  }
  const suffix = pathname === '/' ? '' : pathname.replace(/\/+$/, '');
  return PROTECTED_RESOURCE_PREFIX + suffix;
}

/**
 * Resolve the RFC 9728 protected-resource metadata for a request path, or null
 * if no configured resource maps to it.
 *
 * App-owned and local: built entirely from `config.protectedResources`, with
 * `authorization_servers` derived from `serverUrl`/`orgId` (the BuildBase
 * issuer). No platform round-trip.
 */
export function buildProtectedResourceMetadata(
  requestPath: string,
  config: AgentReadyConfig
): DiscoveryDocument | null {
  const resources = config.protectedResources ?? [];
  if (!resources.length) return null;

  const normalized = requestPath.replace(/\/+$/, '') || PROTECTED_RESOURCE_PREFIX;
  const authServer = `${trimTrailingSlash(config.serverUrl)}/org/${config.orgId}`;
  const built = resources.map(r => {
    const resource = r.resource ?? trimTrailingSlash(config.siteUrl);
    return {
      path: protectedResourceWellKnownPath(resource),
      metadata: {
        resource,
        authorization_servers: [authServer],
        bearer_methods_supported: r.bearerMethods ?? ['header'],
        ...(r.scopes?.length ? { scopes_supported: r.scopes } : {}),
        ...(r.documentationUrl ? { resource_documentation: r.documentationUrl } : {}),
      },
    };
  });

  const match = built.find(b => b.path === normalized);
  if (match) return jsonDoc(match.metadata, config);
  if (normalized === PROTECTED_RESOURCE_PREFIX && built.length === 1) {
    return jsonDoc(built[0].metadata, config);
  }
  return null;
}

/** Agent Skills discovery index (Agent Skills Discovery RFC v0.2.0). */
export function buildAgentSkillsIndex(config: AgentReadyConfig): DiscoveryDocument | null {
  const skills = config.skills ?? [];
  if (!skills.length) return null;

  const site = trimTrailingSlash(config.siteUrl);
  const entries = skills.map(skill => ({
    name: skill.name,
    type: skill.type ?? 'skill-md',
    description: skill.description,
    url: `${site}${skillPath(skill)}`,
    digest: sha256Digest(skill.content),
  }));

  return jsonDoc(
    {
      $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
      skills: entries,
    },
    config
  );
}

function skillPath(skill: AgentSkill): string {
  return skill.path ?? `${AGENT_SKILLS_PREFIX}/${skill.name}/SKILL.md`;
}

/** Serve a single skill's SKILL.md by request path, or null if none matches. */
export function buildSkillMd(
  requestPath: string,
  config: AgentReadyConfig
): DiscoveryDocument | null {
  const skill = (config.skills ?? []).find(s => skillPath(s) === requestPath);
  if (!skill) return null;
  return {
    status: 200,
    contentType: 'text/markdown; charset=utf-8',
    body: skill.content,
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

/** security.txt (RFC 9116), or null when not configured. */
export function buildSecurityTxt(config: AgentReadyConfig): DiscoveryDocument | null {
  if (!config.security) return null;
  const contacts = Array.isArray(config.security.contact)
    ? config.security.contact
    : [config.security.contact];
  const lines = contacts.map(c => `Contact: ${c}`);
  if (config.security.expires) lines.push(`Expires: ${config.security.expires}`);
  if (config.security.policy) lines.push(`Policy: ${config.security.policy}`);
  return {
    status: 200,
    contentType: TEXT_CT,
    body: lines.join('\n') + '\n',
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

/**
 * The `/llms.txt` document from `config.llmsTxt` (app-authored). Returns null
 * when not set — serve your own static file instead. llms.txt is app content,
 * not platform-managed.
 */
export function buildLlmsTxt(config: AgentReadyConfig): DiscoveryDocument | null {
  if (!config.llmsTxt) return null;
  return {
    status: 200,
    contentType: TEXT_CT,
    body: config.llmsTxt,
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

/**
 * API Catalog (RFC 9727) as a `linkset+json` document for
 * `/.well-known/api-catalog`. Returns null when no APIs are configured.
 */
export function buildApiCatalog(config: AgentReadyConfig): DiscoveryDocument | null {
  const apis = config.apiCatalog ?? [];
  if (!apis.length) return null;
  const linkset = apis.map(api => ({
    anchor: api.anchor,
    ...(api.title ? { title: api.title } : {}),
    ...(api.serviceDesc ? { 'service-desc': [{ href: api.serviceDesc }] } : {}),
    ...(api.serviceDoc ? { 'service-doc': [{ href: api.serviceDoc }] } : {}),
    ...(api.status ? { status: [{ href: api.status }] } : {}),
  }));
  return {
    status: 200,
    contentType: LINKSET_CT,
    body: JSON.stringify({ linkset }, null, 2),
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

/**
 * MCP Server Card (SEP-1649) for `/.well-known/mcp/server-card.json`. Returns
 * null when no card is configured (i.e. no MCP server is running).
 */
export function buildMcpServerCard(config: AgentReadyConfig): DiscoveryDocument | null {
  const card = config.mcpServerCard;
  if (!card) return null;
  return jsonDoc(
    {
      schema_version: '2024-11-05',
      serverInfo: { name: card.name, version: card.version },
      ...(card.description ? { description: card.description } : {}),
      transport: {
        type: card.transport ?? 'streamable-http',
        endpoint: card.endpoint,
      },
      capabilities: card.capabilities ?? { tools: {} },
      ...(card.documentationUrl ? { documentation_url: card.documentationUrl } : {}),
    },
    config
  );
}

/**
 * The `/auth.md` document (agent registration + authentication instructions).
 * Uses `config.authMd` verbatim when provided; otherwise generates one from the
 * OAuth authorization-server metadata + site config. Returns null only when
 * there is nothing to describe (no authorizationServer and no override).
 */
export function buildAuthMd(
  config: AgentReadyConfig,
  bundle: AgentReadinessBundle
): DiscoveryDocument | null {
  const cache = cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL);
  if (config.authMd) {
    return { status: 200, contentType: MARKDOWN_CT, body: config.authMd, cacheControl: cache };
  }
  const as = bundle.authorizationServer;
  if (!as) return null;
  const body = `# Agent Authentication

${config.site.name} supports AI-agent access via OAuth 2.0 (authorization code + PKCE).

## Authorization server
- Issuer: \`${as.issuer}\`
- Metadata (RFC 8414): ${as.metadataUrl}

Fetch the metadata document above for the \`authorization_endpoint\`, \`token_endpoint\`, supported grant types / PKCE methods, and — when the app allows it — the dynamic client \`registration_endpoint\` (RFC 7591).

## Protected resources (RFC 9728)
See \`/.well-known/oauth-protected-resource\`, which lists the resource, its supported scopes, and the authorization server(s) that can issue tokens for it.

## How an agent authenticates
1. Discover this document and \`/.well-known/oauth-protected-resource\`.
2. Fetch the authorization-server metadata for the endpoints.
3. Register a client (dynamic registration) or use a pre-issued client_id.
4. Run the authorization-code flow with PKCE (S256), requesting the scopes and target \`resource\`.
5. Exchange the code for an access token and call the API with \`Authorization: Bearer <token>\`.

Documentation: ${config.site.documentationUrl ?? config.siteUrl}
`;
  return { status: 200, contentType: MARKDOWN_CT, body, cacheControl: cache };
}

function jsonDoc(value: unknown, config: AgentReadyConfig): DiscoveryDocument {
  return {
    status: 200,
    contentType: JSON_CT,
    body: JSON.stringify(value, null, 2),
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

// ─── Site documents (robots.txt, sitemap.xml, markdown negotiation, Link) ────

/** Strip CR/LF (and other control chars) so a config value can't inject extra
 * robots.txt directives on its own line. */
function robotsValue(value: string | number): string {
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\x00-\x1f\x7f]/g, '');
}

function renderRobotsPolicy(policy: RobotsPolicy, contentSignals?: ContentSignals): string {
  const agents = Array.isArray(policy.userAgent) ? policy.userAgent : [policy.userAgent];
  const lines = agents.map(a => `User-agent: ${robotsValue(a)}`);
  if (contentSignals) {
    const signals = [
      ...(contentSignals.search !== undefined
        ? [`search=${contentSignals.search ? 'yes' : 'no'}`]
        : []),
      ...(contentSignals.aiInput !== undefined
        ? [`ai-input=${contentSignals.aiInput ? 'yes' : 'no'}`]
        : []),
      ...(contentSignals.aiTrain !== undefined
        ? [`ai-train=${contentSignals.aiTrain ? 'yes' : 'no'}`]
        : []),
    ];
    if (signals.length) lines.push(`Content-Signal: ${signals.join(', ')}`);
  }
  for (const p of policy.allow ?? []) lines.push(`Allow: ${robotsValue(p)}`);
  for (const p of policy.disallow ?? []) lines.push(`Disallow: ${robotsValue(p)}`);
  if (policy.crawlDelay !== undefined) lines.push(`Crawl-delay: ${robotsValue(policy.crawlDelay)}`);
  return lines.join('\n');
}

/**
 * robots.txt with AI-bot policy groups, Content Signals, and sitemap
 * references. Always returns a document — with no `config.robots` it emits an
 * allow-all default policy plus an explicit `Allow: /` group per known AI bot.
 */
export function buildRobotsTxt(config: AgentReadyConfig): DiscoveryDocument {
  const robots = config.robots ?? {};
  const site = trimTrailingSlash(config.siteUrl);
  const policies = robots.policies ?? [{ userAgent: '*', allow: ['/'] }];

  const aiBots = robots.aiBots ?? 'allow';
  const aiPolicies: RobotsPolicy[] =
    aiBots === 'allow'
      ? [{ userAgent: [...AI_BOT_USER_AGENTS], allow: ['/'] }]
      : aiBots === 'deny'
        ? [{ userAgent: [...AI_BOT_USER_AGENTS], disallow: ['/'] }]
        : aiBots;

  const sitemaps = robots.sitemaps ?? (config.sitemap ? [`${site}/sitemap.xml`] : []);

  const groups = [
    `# robots.txt — agent-ready. See ${site}/llms.txt and ${site}/.well-known/agent.json`,
    // Content Signals attach to the first (usually `*`) group.
    ...policies.map((p, i) => renderRobotsPolicy(p, i === 0 ? robots.contentSignals : undefined)),
    ...aiPolicies.map(p => renderRobotsPolicy(p)),
    ...(sitemaps.length ? [sitemaps.map(s => `Sitemap: ${robotsValue(s)}`).join('\n')] : []),
  ];

  return {
    status: 200,
    contentType: TEXT_CT,
    body: groups.join('\n\n') + '\n',
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

/** Clamp a sitemap `<priority>` to the spec's 0.0–1.0 range. */
function clampPriority(value: number): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0.5;
  return String(Math.min(1, Math.max(0, n)));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * A minimal sitemap.xml from `config.sitemap.urls`, or null when not
 * configured. Meant for API-first apps that would otherwise have no sitemap —
 * apps with real content pipelines (e.g. next-sitemap) should keep those and
 * omit `config.sitemap`.
 */
export function buildSitemap(config: AgentReadyConfig): DiscoveryDocument | null {
  const urls = config.sitemap?.urls;
  if (!urls?.length) return null;
  const site = trimTrailingSlash(config.siteUrl);

  const entries = urls.map(u => {
    const url: SitemapUrl = typeof u === 'string' ? { loc: u } : u;
    const loc = /^https?:\/\//.test(url.loc)
      ? url.loc
      : `${site}${url.loc.startsWith('/') ? '' : '/'}${url.loc}`;
    const fields = [
      `    <loc>${escapeXml(loc)}</loc>`,
      ...(url.lastmod ? [`    <lastmod>${escapeXml(url.lastmod)}</lastmod>`] : []),
      ...(url.changefreq
        ? [`    <changefreq>${escapeXml(String(url.changefreq))}</changefreq>`]
        : []),
      ...(url.priority !== undefined
        ? // Clamp to the spec's 0.0–1.0 range; non-numeric input falls back to 0.5.
          [`    <priority>${clampPriority(url.priority)}</priority>`]
        : []),
    ];
    return `  <url>\n${fields.join('\n')}\n  </url>`;
  });

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') +
    '\n</urlset>\n';

  return {
    status: 200,
    contentType: XML_CT,
    body,
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

/**
 * True when an `Accept` header prefers markdown (`text/markdown` /
 * `text/x-markdown`) over `text/html` — q-value aware, so
 * `text/html;q=0.5, text/markdown` is markdown but `text/markdown;q=0.1,
 * text/html` is not. A bare wildcard does not count as a markdown preference.
 */
export function wantsMarkdown(acceptHeader: string | null | undefined): boolean {
  if (!acceptHeader) return false;
  let markdownQ = 0;
  let htmlQ = 0;
  for (const part of acceptHeader.split(',')) {
    const [rawType, ...params] = part.trim().split(';');
    const type = rawType.trim().toLowerCase();
    let q = 1;
    for (const param of params) {
      const [k, v] = param.split('=').map(s => s.trim());
      if (k === 'q') {
        const parsed = Number(v);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    if (type === 'text/markdown' || type === 'text/x-markdown') {
      markdownQ = Math.max(markdownQ, q);
    } else if (type === 'text/html' || type === 'text/*' || type === '*/*') {
      htmlQ = Math.max(htmlQ, q);
    }
  }
  return markdownQ > 0 && markdownQ >= htmlQ;
}

/**
 * Markdown content negotiation: pick the markdown or HTML variant of a page
 * per the `Accept` header. The returned document carries `vary: 'Accept'` —
 * forward it so caches key on the header.
 */
export function negotiateMarkdown(
  acceptHeader: string | null | undefined,
  variants: { html: string; markdown: string },
  config?: Pick<AgentReadyConfig, 'cacheTtlSeconds'>
): DiscoveryDocument {
  const markdown = wantsMarkdown(acceptHeader);
  return {
    status: 200,
    contentType: markdown ? MARKDOWN_CT : 'text/html; charset=utf-8',
    body: markdown ? variants.markdown : variants.html,
    cacheControl: cacheHeader(config?.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
    vary: 'Accept',
  };
}

/**
 * Value for a `Link` response header advertising this app's discovery
 * documents (llms.txt, Agent Card, and — when configured — sitemap, API
 * catalog, MCP server card). Sync and pure (no platform fetch), so it's safe
 * in edge middleware.
 */
export function buildDiscoveryLinkHeader(config: AgentReadyConfig): string {
  const site = trimTrailingSlash(config.siteUrl);
  const links = [
    `<${site}/llms.txt>; rel="describedby"; type="text/plain"`,
    `<${site}/.well-known/agent.json>; rel="describedby"; type="application/json"`,
  ];
  if (config.sitemap || config.robots?.sitemaps?.length) {
    const sitemap = config.robots?.sitemaps?.[0] ?? `${site}/sitemap.xml`;
    links.push(`<${sitemap}>; rel="sitemap"; type="application/xml"`);
  }
  if (config.apiCatalog?.length) {
    links.push(`<${site}${API_CATALOG_PATH}>; rel="api-catalog"; type="${LINKSET_CT}"`);
  }
  if (config.mcpServerCard) {
    links.push(`<${site}${MCP_CARD_PATH}>; rel="mcp-server"; type="application/json"`);
  }
  return links.join(', ');
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Resolve any `.well-known` request path to its discovery document, or null if
 * this app serves nothing there (caller should 404).
 *
 * Handles: agent.json, oauth-protected-resource (+ per-resource paths),
 * oauth-authorization-server (pointer), agent-skills index + SKILL.md,
 * security.txt, api-catalog (RFC 9727), and the MCP server card.
 *
 * Root-level docs (`/robots.txt`, `/llms.txt`, `/auth.md`, …) are not handled
 * here — use {@link resolveAgentPath}, which covers both, for new wiring.
 */
export async function resolveWellKnown(
  requestPath: string,
  config: AgentReadyConfig
): Promise<DiscoveryDocument | null> {
  const path = requestPath.replace(/\/+$/, '') || requestPath;

  if (path === '/.well-known/agent.json') {
    const bundle = await fetchAgentReadiness(config);
    return buildAgentCard(config, bundle);
  }

  if (path === '/.well-known/security.txt') {
    return buildSecurityTxt(config);
  }

  if (path === `${AGENT_SKILLS_PREFIX}/index.json`) {
    return buildAgentSkillsIndex(config);
  }

  if (path.startsWith(`${AGENT_SKILLS_PREFIX}/`) && path.endsWith('SKILL.md')) {
    return buildSkillMd(path, config);
  }

  // RFC 8414 (`oauth-authorization-server`) and the OIDC discovery alias
  // (`openid-configuration`): serve the platform's full authorization-server
  // metadata from this origin (cached, fail-soft proxy). Both paths return the
  // same document — the auth/token endpoints an agent needs are identical, and
  // serving the OIDC path stops agents that only probe it from seeing a 404.
  // Strict clients should still use the canonical platform URL (the issuer's
  // origin); this endpoint exists so origin-only discovery finds valid metadata.
  if (
    path === '/.well-known/oauth-authorization-server' ||
    path === '/.well-known/openid-configuration'
  ) {
    const bundle = await fetchAgentReadiness(config);
    const as = bundle.authorizationServer;
    if (!as?.metadataUrl) return null;
    const metadata = await fetchAuthServerMetadata(as.metadataUrl, config);
    if (metadata) return jsonDoc(metadata, config);
    // Proxy fetch failed — fall back to the pointer shape.
    return jsonDoc(
      {
        ...(as.issuer ? { issuer: as.issuer } : {}),
        oauth_authorization_server_metadata: as.metadataUrl,
      },
      config
    );
  }

  if (path === API_CATALOG_PATH) {
    return buildApiCatalog(config);
  }

  if (path === MCP_CARD_PATH) {
    return buildMcpServerCard(config);
  }

  if (path.startsWith(PROTECTED_RESOURCE_PREFIX)) {
    // App-owned, built from local config — no platform round-trip.
    return buildProtectedResourceMetadata(path, config);
  }

  return null;
}

/**
 * Superset of {@link resolveWellKnown}: resolves ANY agent-facing path — the
 * root-level documents (`/robots.txt`, `/sitemap.xml`, `/llms.txt`,
 * `/auth.md`, `/security.txt`) plus everything under `/.well-known/*`. One
 * catch-all (or middleware) wired to this function covers the app's entire
 * agent-readiness surface. Returns null for paths this app doesn't serve.
 */
export async function resolveAgentPath(
  requestPath: string,
  config: AgentReadyConfig
): Promise<DiscoveryDocument | null> {
  const path = requestPath.replace(/\/+$/, '') || requestPath;

  if (path === '/robots.txt') {
    return buildRobotsTxt(config);
  }

  if (path === '/sitemap.xml') {
    return buildSitemap(config);
  }

  if (path === '/llms.txt') {
    return buildLlmsTxt(config);
  }

  if (path === '/auth.md') {
    return buildAuthMd(config, await fetchAgentReadiness(config));
  }

  // RFC 9116 legacy location (canonical is /.well-known/security.txt).
  if (path === '/security.txt') {
    return buildSecurityTxt(config);
  }

  if (path.startsWith('/.well-known')) {
    return resolveWellKnown(path, config);
  }

  return null;
}

// ─── WebMCP (browser-side) ────────────────────────────────────────────────────

/** A WebMCP tool definition exposed to in-page agents via `navigator.modelContext`. */
export interface WebMcpTool {
  name: string;
  description: string;
  /** JSON Schema for the tool's input. */
  inputSchema: Record<string, unknown>;
  /** Called when an agent invokes the tool. */
  execute: (input: any) => unknown | Promise<unknown>;
}

/**
 * Register WebMCP tools with the browser so in-page AI agents can invoke your
 * site's actions (WebMCP `navigator.modelContext.provideContext`). Client-side
 * only — a no-op returning `false` when the API is unavailable, so it's safe to
 * call unconditionally in a browser effect.
 */
export function provideWebMcpTools(tools: WebMcpTool[]): boolean {
  const nav = (globalThis as unknown as { navigator?: any }).navigator;
  if (!nav?.modelContext?.provideContext) return false;
  nav.modelContext.provideContext({ tools });
  return true;
}

// ─── Wiring ───────────────────────────────────────────────────────────────────
//
// This module is intentionally framework-agnostic: every function above returns
// plain data (a `DiscoveryDocument` = `{ status, contentType, body,
// cacheControl }`, or the raw bundle). It performs no I/O beyond fetching the
// platform bundle and never touches a `Request`/`Response` or `(req, res)`.
//
// Wire it into any framework in a couple of lines — call `resolveAgentPath`
// for every agent-facing path (root docs + `.well-known/*`), then hand the
// returned document to your framework's response. Examples:
//
//   // Next.js App Router — app/.well-known/[...path]/route.ts (and identical
//   // two-line routes at app/robots.txt/route.ts, app/llms.txt/route.ts, …)
//   export async function GET(req: Request) {
//     const { pathname } = new URL(req.url);
//     const doc = await resolveAgentPath(pathname, config);
//     if (!doc) return new Response('{"error":"not_found"}', { status: 404 });
//     return new Response(doc.body, {
//       status: doc.status,
//       headers: {
//         'Content-Type': doc.contentType,
//         'Cache-Control': doc.cacheControl,
//         ...(doc.vary ? { Vary: doc.vary } : {}),
//       },
//     });
//   }
//
//   // Express — one middleware covers everything
//   app.use(async (req, res, next) => {
//     const doc = await resolveAgentPath(req.path, config);
//     if (!doc) return next();
//     res.status(doc.status)
//        .setHeader('Content-Type', doc.contentType)
//        .setHeader('Cache-Control', doc.cacheControl)
//        .send(doc.body);
//   });
