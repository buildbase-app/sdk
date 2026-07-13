/**
 * BuildBase agent-auth presets (server-side, framework-agnostic).
 *
 * The BuildBase security model: the platform runs the OAuth2 flow (login,
 * consent, PKCE, refresh) but the APP mints and verifies its own user tokens,
 * signed with the app's own secret. The platform only relays the minted token
 * to the agent — it never sees the secret, so it can neither forge nor decode
 * an app token. The per-user BuildBase session travels inside the token only
 * as an AES-256-GCM-encrypted `sid` claim, so it is never stored and never
 * plaintext anywhere; access to it expires with the token.
 *
 * These presets make that model a one-liner on each side of the flow, and run
 * entirely in the app's process — pure local crypto, zero platform calls:
 *
 *   • {@link mintAgentToken}  — inside your `applicationTokenUrl` handler:
 *     signs the app JWT (HS256) with your secret, stamps `aud` from the RFC
 *     8707 resource, and embeds the encrypted `sid` automatically.
 *   • {@link buildbaseAuth}   — the `auth` config for `createMcpHandler`:
 *     verifies the JWT, enforces audience binding, decrypts the `sid`, and
 *     maps the claims to `McpAuthInfo`.
 *
 * @example The full loop:
 * ```ts
 * // applicationTokenUrl route — the platform calls this on every grant
 * const { status, body } = await handleAppTokenRequest({
 *   authorization: req.headers.get("authorization"),
 *   clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,
 *   mintToken: (claims) => mintAgentToken({ claims, secret: process.env.SYSTEM_SECRET! }),
 * });
 *
 * // MCP server — verifies what the route above minted
 * const mcp = createMcpHandler({
 *   buildbase,
 *   auth: buildbaseAuth({ secret: process.env.SYSTEM_SECRET!, resource: "https://app.example.com/api/mcp" }),
 * });
 * ```
 *
 * AES-GCM comes from WebCrypto (`globalThis.crypto.subtle`) — Node 18+, Bun,
 * Deno, edge runtimes, browsers. The wire format is
 * `base64url(iv(12) || authTag(16) || ciphertext)` with the key derived as
 * `SHA-256(secret + ":bb-session")`, byte-compatible with Node
 * `createCipheriv("aes-256-gcm", ...)` implementations of the same layout.
 */

import type { AppTokenRequestClaims, VerifiedJwtPayload, VerifyClientJwtOptions } from './agent-bridge';
import { signClientJwt, verifyClientJwt } from './agent-bridge';
import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import type { McpAuthInfo, McpHttpRequest } from './mcp-server';

// ─── Session-ref crypto (encrypted `sid` claim) ───────────────────────────────

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_CONTEXT = ':bb-session';

function subtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error(
      'WebCrypto is unavailable in this runtime — agent-auth session encryption requires globalThis.crypto.subtle (Node 18+, Bun, Deno, edge, browsers).'
    );
  }
  return c.subtle;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function sessionKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = (async () => {
      const digest = await subtle().digest(
        'SHA-256',
        new TextEncoder().encode(`${secret}${KEY_CONTEXT}`)
      );
      return subtle().importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    })();
    keyCache.set(secret, key);
  }
  return key;
}

/** Encrypt/decrypt pair for the `sid` claim, bound to one app secret. */
export interface SessionRefCrypto {
  /** Encrypt a BuildBase session id for embedding in an app JWT. */
  encryptSessionRef(sessionId: string): Promise<string>;
  /** Decrypt a `sid` claim. Returns null on any failure (wrong key, garbage). */
  decryptSessionRef(ref: string): Promise<string | null>;
}

/**
 * Session-ref crypto derived from the app's secret. Both sides of the loop
 * ({@link mintAgentToken}, {@link buildbaseAuth}) use this internally — reach
 * for it directly only when minting or verifying tokens by hand.
 */
export function createSessionRefCrypto(secret: string): SessionRefCrypto {
  if (!secret) throw new Error('createSessionRefCrypto: missing secret');
  return {
    async encryptSessionRef(sessionId: string): Promise<string> {
      const iv = (globalThis.crypto as Crypto).getRandomValues(new Uint8Array(IV_BYTES));
      const key = await sessionKey(secret);
      // WebCrypto AES-GCM output is ciphertext || tag; reorder to the SDK wire
      // layout iv || tag || ciphertext.
      const sealed = new Uint8Array(
        await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(sessionId))
      );
      const tag = sealed.subarray(sealed.length - TAG_BYTES);
      const ciphertext = sealed.subarray(0, sealed.length - TAG_BYTES);
      const out = new Uint8Array(IV_BYTES + TAG_BYTES + ciphertext.length);
      out.set(iv, 0);
      out.set(tag, IV_BYTES);
      out.set(ciphertext, IV_BYTES + TAG_BYTES);
      return bytesToBase64Url(out);
    },
    async decryptSessionRef(ref: string): Promise<string | null> {
      try {
        const bytes = base64UrlToBytes(ref);
        if (bytes.length <= IV_BYTES + TAG_BYTES) return null;
        const iv = bytes.slice(0, IV_BYTES);
        const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
        const ciphertext = bytes.subarray(IV_BYTES + TAG_BYTES);
        const sealed = new Uint8Array(ciphertext.length + TAG_BYTES);
        sealed.set(ciphertext, 0);
        sealed.set(tag, ciphertext.length);
        const key = await sessionKey(secret);
        const plain = await subtle().decrypt({ name: 'AES-GCM', iv }, key, sealed);
        return new TextDecoder().decode(plain);
      } catch {
        return null;
      }
    },
  };
}

// ─── Minting side (applicationTokenUrl) ───────────────────────────────────────

/** Options for {@link mintAgentToken}. */
export interface MintAgentTokenOptions {
  /** The verified platform claims (from `handleAppTokenRequest`'s callback). */
  claims: AppTokenRequestClaims;
  /** The APP's token-signing secret. Never leaves this process. */
  secret: string;
  /** Token lifetime in seconds. Default 3600 — keep agent tokens short-lived. */
  expiresInSec?: number;
  /**
   * App-specific claims merged into the token — e.g. a `workspaceId` resolved
   * by your own user sync. Merged last, so they can override the defaults.
   */
  extraClaims?: Record<string, unknown>;
}

/**
 * Mint the app's agent access token from a platform grant: HS256-signed with
 * YOUR secret, `aud` bound to the granted RFC 8707 resource(s), scopes carried
 * through, and the per-user BuildBase session embedded as an encrypted `sid`
 * claim. The result plugs straight into `handleAppTokenRequest`'s `mintToken`.
 */
export async function mintAgentToken(
  options: MintAgentTokenOptions
): Promise<{ token: string; expiresIn: number }> {
  const { claims, secret } = options;
  const expiresIn = options.expiresInSec ?? 3600;
  const aud =
    claims.resource && claims.resource.length
      ? claims.resource.length === 1
        ? claims.resource[0]
        : claims.resource
      : undefined;
  const sid = claims.sessionId
    ? await createSessionRefCrypto(secret).encryptSessionRef(claims.sessionId)
    : undefined;
  const token = signClientJwt(
    {
      sub: claims.id,
      userId: claims.id,
      email: claims.email,
      ...(claims.name ? { name: claims.name } : {}),
      ...(claims.scope ? { scope: claims.scope } : {}),
      ...(aud ? { aud } : {}),
      ...(sid ? { sid } : {}),
      ...options.extraClaims,
    },
    secret,
    { expiresInSec: expiresIn }
  );
  return { token, expiresIn };
}

// ─── Verifying side (createMcpHandler auth preset) ────────────────────────────

/** Options for {@link buildbaseAuth}. */
export interface BuildBaseAuthOptions {
  /** The APP's token-signing secret — the same one `mintAgentToken` used. */
  secret: string;
  /**
   * The protected resource(s) this server IS. Enforces RFC 8707 audience
   * binding — the token's `aud` must include one of these URIs. Pass an array
   * when the server is addressable under more than one resource identifier
   * (e.g. the canonical `<host>/mcp` plus the literal endpoint URL); the
   * FIRST entry is the canonical one used to derive `resourceMetadataUrl`.
   */
  resource?: string | string[];
  /**
   * Explicit RFC 9728 metadata URL for the 401 challenge. Defaults to the
   * path-derived `/.well-known/oauth-protected-resource<path>` of the first
   * `resource`.
   */
  resourceMetadataUrl?: string;
  /**
   * Reject tokens that carry no `aud` claim at all. Default false: audience is
   * enforced when present, and legacy audience-less tokens still work. Turn
   * this on once every minted token is audience-bound.
   */
  requireAudience?: boolean;
  /** Extra JWT verification options (clock tolerance, issuer pinning). */
  verify?: Pick<VerifyClientJwtOptions, 'clockToleranceSec' | 'issuer'>;
}

/**
 * Audience-mismatch diagnostics without hand-decoding JWTs: set
 * `MCP_AUTH_DEBUG=1` in the environment and every audience rejection logs the
 * received `aud` next to the expected value(s).
 */
function audDebug(received: string[], expected: string[], reason: string): void {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  if (env?.MCP_AUTH_DEBUG !== '1') return;
  // eslint-disable-next-line no-console
  console.warn(
    `[buildbase/mcp-auth] audience rejected (${reason}): received aud=${JSON.stringify(
      received
    )} expected one of ${JSON.stringify(expected)}`
  );
}

/**
 * The `auth` config for `createMcpHandler`, prewired for BuildBase-minted app
 * tokens: HS256 verification with your secret, RFC 8707 audience binding,
 * `sid` decryption to the BuildBase session, claim mapping to `McpAuthInfo`,
 * and the derived RFC 9728 `resourceMetadataUrl`. Entirely local — the token
 * and secret never leave this process.
 */
export function buildbaseAuth(options: BuildBaseAuthOptions): {
  verify: (token: string, req: McpHttpRequest) => Promise<McpAuthInfo | null>;
  resourceMetadataUrl?: string;
} {
  const { secret } = options;
  if (!secret) throw new Error('buildbaseAuth: missing secret');
  const sessionCrypto = createSessionRefCrypto(secret);
  const resources = options.resource
    ? Array.isArray(options.resource)
      ? options.resource
      : [options.resource]
    : [];

  let resourceMetadataUrl = options.resourceMetadataUrl;
  if (!resourceMetadataUrl && resources.length) {
    try {
      const url = new URL(resources[0]);
      const suffix = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
      resourceMetadataUrl = `${url.origin}/.well-known/oauth-protected-resource${suffix}`;
    } catch {
      // relative/malformed resource — no challenge pointer, binding still applies
    }
  }

  return {
    resourceMetadataUrl,
    verify: async (token: string): Promise<McpAuthInfo | null> => {
      let payload: VerifiedJwtPayload;
      try {
        payload = verifyClientJwt(token, secret, { ...options.verify });
      } catch {
        return null;
      }

      if (resources.length) {
        const aud: string[] = payload.aud
          ? Array.isArray(payload.aud)
            ? payload.aud
            : [payload.aud]
          : [];
        if (!aud.length && options.requireAudience) {
          audDebug(aud, resources, 'token carries no aud claim');
          return null;
        }
        if (aud.length && !aud.some(a => resources.includes(a))) {
          audDebug(aud, resources, 'aud does not include this resource');
          return null;
        }
      }

      const sid =
        typeof payload.sid === 'string' ? await sessionCrypto.decryptSessionRef(payload.sid) : null;

      const scopes = Array.isArray(payload.scope)
        ? (payload.scope as string[])
        : typeof payload.scope === 'string'
          ? payload.scope.split(' ').filter(Boolean)
          : undefined;

      return {
        // Empty when the token carries no session — BuildBase built-in tools
        // then fail with the platform's 401 in-band; custom tools unaffected.
        sessionId: sid ?? '',
        userId:
          typeof payload.userId === 'string'
            ? payload.userId
            : typeof payload.sub === 'string'
              ? payload.sub
              : undefined,
        workspaceId: typeof payload.workspaceId === 'string' ? payload.workspaceId : undefined,
        scopes,
        claims: payload,
      };
    },
  };
}
