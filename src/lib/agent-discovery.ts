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
 * import type { AgentReadyConfig } from "@buildbase/sdk";
 * export const agentConfig: AgentReadyConfig = {
 *   serverUrl: process.env.BUILDBASE_URL!,
 *   orgId: process.env.BUILDBASE_ORG_ID!,
 *   siteUrl: "https://imejis.io",
 *   site: { name: "Imejis", description: "Generate images from templates via API." },
 * };
 *
 * // app/.well-known/[...path]/route.ts
 * import { resolveWellKnown } from "@buildbase/sdk";
 * import { agentConfig } from "@/lib/agent-ready";
 * export async function GET(req: Request) {
 *   const doc = await resolveWellKnown(new URL(req.url).pathname, agentConfig);
 *   if (!doc) return new Response('{"error":"not_found"}', { status: 404 });
 *   return new Response(doc.body, {
 *     status: doc.status,
 *     headers: { "Content-Type": doc.contentType, "Cache-Control": doc.cacheControl },
 *   });
 * }
 *
 * // app/llms.txt/route.ts
 * import { buildLlmsTxt, fetchAgentReadiness } from "@buildbase/sdk";
 * import { agentConfig } from "@/lib/agent-ready";
 * export async function GET() {
 *   const doc = buildLlmsTxt(agentConfig, await fetchAgentReadiness(agentConfig));
 *   if (!doc) return new Response("Not found", { status: 404 });
 *   return new Response(doc.body, { headers: { "Content-Type": doc.contentType } });
 * }
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
  /** Pointer to the org's RFC 8414 authorization-server metadata. */
  authorizationServer?: {
    issuer: string;
    metadataUrl: string;
  };
  /**
   * RFC 9728 protected-resource metadata objects, ready to serve. Each `metadata`
   * is a complete document; `resource` is the canonical resource URI it describes.
   */
  protectedResources?: Array<{
    resource: string;
    metadata: Record<string, unknown>;
  }>;
  /** Org-authored llms.txt content, or null when unset. */
  llmsTxt?: string | null;
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
  /** TTL (seconds) for cached platform fetches. Default 300 (5 min). */
  cacheTtlSeconds?: number;
  /** Injectable fetch, mainly for testing. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** A rendered discovery document ready to become an HTTP response. */
export interface DiscoveryDocument {
  status: number;
  contentType: string;
  body: string;
  cacheControl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CACHE_TTL = 300;
const PROTECTED_RESOURCE_PREFIX = '/.well-known/oauth-protected-resource';
const AGENT_SKILLS_PREFIX = '/.well-known/agent-skills';
const JSON_CT = 'application/json';
const TEXT_CT = 'text/plain; charset=utf-8';

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
    const res = await doFetch(url, {
      headers: { Accept: JSON_CT },
    });
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

/** Clear the in-memory agent-readiness cache (mainly for tests). */
export function clearAgentReadinessCache(): void {
  bundleCache.clear();
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
  }
  if (config.skills?.length) {
    capabilities.agent_skills = `${AGENT_SKILLS_PREFIX}/index.json`;
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
 */
export function buildProtectedResourceMetadata(
  requestPath: string,
  config: AgentReadyConfig,
  bundle: AgentReadinessBundle
): DiscoveryDocument | null {
  const resources = bundle.protectedResources ?? [];
  if (!resources.length) return null;

  const normalized = requestPath.replace(/\/+$/, '') || PROTECTED_RESOURCE_PREFIX;

  // Exact path match first (handles multiple resources at distinct paths).
  const match = resources.find(r => protectedResourceWellKnownPath(r.resource) === normalized);
  if (match) return jsonDoc(match.metadata, config);

  // Bare `/.well-known/oauth-protected-resource` with a single resource: serve it.
  if (normalized === PROTECTED_RESOURCE_PREFIX && resources.length === 1) {
    return jsonDoc(resources[0].metadata, config);
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

/** The org-authored llms.txt, or null when the org hasn't set one. */
export function buildLlmsTxt(
  config: AgentReadyConfig,
  bundle: AgentReadinessBundle
): DiscoveryDocument | null {
  if (!bundle.llmsTxt) return null;
  return {
    status: 200,
    contentType: TEXT_CT,
    body: bundle.llmsTxt,
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

function jsonDoc(value: unknown, config: AgentReadyConfig): DiscoveryDocument {
  return {
    status: 200,
    contentType: JSON_CT,
    body: JSON.stringify(value, null, 2),
    cacheControl: cacheHeader(config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL),
  };
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Resolve any `.well-known` request path to its discovery document, or null if
 * this app serves nothing there (caller should 404).
 *
 * Handles: agent.json, oauth-protected-resource (+ per-resource paths),
 * oauth-authorization-server (pointer), agent-skills index + SKILL.md,
 * security.txt.
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

  // RFC 8414 pointer: forward agents to the platform's canonical metadata URL.
  if (path === '/.well-known/oauth-authorization-server') {
    const bundle = await fetchAgentReadiness(config);
    const metadataUrl = bundle.authorizationServer?.metadataUrl;
    if (!metadataUrl) return null;
    return jsonDoc(
      {
        ...(bundle.authorizationServer?.issuer
          ? { issuer: bundle.authorizationServer.issuer }
          : {}),
        oauth_authorization_server_metadata: metadataUrl,
      },
      config
    );
  }

  if (path.startsWith(PROTECTED_RESOURCE_PREFIX)) {
    const bundle = await fetchAgentReadiness(config);
    return buildProtectedResourceMetadata(path, config, bundle);
  }

  return null;
}

// ─── Wiring ───────────────────────────────────────────────────────────────────
//
// This module is intentionally framework-agnostic: every function above returns
// plain data (a `DiscoveryDocument` = `{ status, contentType, body,
// cacheControl }`, or the raw bundle). It performs no I/O beyond fetching the
// platform bundle and never touches a `Request`/`Response` or `(req, res)`.
//
// Wire it into any framework in a couple of lines — call `resolveWellKnown` for
// the `.well-known/*` paths and `buildLlmsTxt` for `/llms.txt`, then hand the
// returned document to your framework's response. Examples:
//
//   // Next.js App Router — app/.well-known/[...path]/route.ts
//   export async function GET(req: Request) {
//     const { pathname } = new URL(req.url);
//     const doc = await resolveWellKnown(pathname, config);
//     if (!doc) return new Response('{"error":"not_found"}', { status: 404 });
//     return new Response(doc.body, {
//       status: doc.status,
//       headers: { 'Content-Type': doc.contentType, 'Cache-Control': doc.cacheControl },
//     });
//   }
//
//   // Next.js Pages Router / Express — (req, res)
//   const path = `/.well-known/${[].concat(req.query.path).join('/')}`;
//   const doc = await resolveWellKnown(path, config);
//   if (!doc) return res.status(404).json({ error: 'not_found' });
//   res.status(doc.status)
//      .setHeader('Content-Type', doc.contentType)
//      .setHeader('Cache-Control', doc.cacheControl)
//      .send(doc.body);
