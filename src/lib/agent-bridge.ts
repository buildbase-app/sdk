/**
 * OAuth2 app-bridge toolkit (server-side).
 *
 * BuildBase runs the OAuth2 authorization flow (login, consent, code, PKCE,
 * refresh rotation) but it never mints the access token itself — on the token
 * grant it calls the org's own backend to mint the token the agent will carry.
 * Concretely, the platform makes signed webhook-style calls to two endpoints an
 * OAuth2 client registers:
 *
 *   • applicationTokenUrl   — mint an access token for a user (required)
 *   • applicationRevokeUrl  — invalidate a user's token on revocation (optional)
 *
 * Both requests carry an `Authorization: Bearer <JWT>` where the JWT is HS256,
 * signed with the client's secret (so possession of the secret authenticates
 * the platform). This module verifies those requests and shapes the responses,
 * so an implementor writes only the part that is theirs: minting/invalidating a
 * token in their own format.
 *
 * HMAC verification uses the SDK's dependency-free pure-JS HMAC-SHA256 (no Web
 * Crypto, no Node `crypto`, no `require`), so it behaves identically whether the
 * bundle is loaded as ESM or CJS, under a bundler or on bare Node.
 *
 * @example applicationTokenUrl handler (Next.js Pages Router):
 * ```ts
 * import { handleAppTokenRequest } from "@buildbase/sdk";
 * export default async function handler(req, res) {
 *   const { status, body } = await handleAppTokenRequest({
 *     authorization: req.headers.authorization,
 *     clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,
 *     mintToken: (user) => ({
 *       token: signMyAccessToken(user, { aud: user.resource }), // your token, your format
 *       expiresIn: 3600,
 *     }),
 *   });
 *   res.status(status).json(body);
 * }
 * ```
 */

import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import { hmacSha256, timingSafeEqualBytes, utf8Bytes } from './sha256';

// ─── Errors ─────────────────────────────────────────────────────────────────

/** Thrown when an incoming platform request fails verification. */
export class AppBridgeError extends Error {
  /** Machine-readable reason, e.g. `invalid_signature`, `token_expired`. */
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppBridgeError';
    this.code = code;
  }
}

// ─── Claim types ──────────────────────────────────────────────────────────────

/**
 * The user + grant context BuildBase sends to `applicationTokenUrl`. The app
 * mints a token for this user; `resource` is the RFC 8707 audience(s) the token
 * should be bound to (stamp them as `aud`), and `scope` is what the user granted.
 * Unknown claims are preserved for forward-compatibility.
 */
export interface AppTokenRequestClaims {
  /** The user's id in the org. */
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
  image?: string;
  blocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  /** Which grant triggered this mint. */
  grantType?: 'authorization_code' | 'refresh_token';
  /** Scopes granted at authorization time. */
  scope?: string[];
  /** RFC 8707 resource indicator(s) — bind the minted token's `aud` to these. */
  resource?: string[];
  /** The OAuth2 client's display title. */
  clientTitle?: string;
  /**
   * Per-user BuildBase session bound to this grant. Embed it ENCRYPTED in the
   * token you mint (JWTs are signed, not encrypted) and never store it — your
   * MCP/agent endpoints decrypt it per request to call BuildBase as this user
   * (`buildbase.withSession(...)`). Fresh on every grant, including refresh.
   */
  sessionId?: string;
  [claim: string]: unknown;
}

/** The payload BuildBase sends to `applicationRevokeUrl`. */
export interface AppRevokeRequestClaims {
  userId: string;
  clientId: string;
  reason: string;
  [claim: string]: unknown;
}

// ─── JWT (HS256) verification ─────────────────────────────────────────────────

/**
 * A verified JWT payload: registered claims (RFC 7519) are typed, every other
 * claim is `unknown` — claims are attacker-influenced input until you narrow
 * them (`typeof payload.sid === 'string'`), even after the signature checks out.
 */
export interface VerifiedJwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [claim: string]: unknown;
}

function jsonFromB64Url(b64url: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(b64url)));
  // A segment can be valid JSON without being an object ("null", "42") — the
  // callers index into it, so reject non-objects here with a clean error.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('JWT segment is not a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/** Options for {@link verifyClientJwt} (all optional; secure defaults). */
export interface VerifyClientJwtOptions {
  /** Allowed clock skew in seconds for `exp`/`nbf`. Default 60. */
  clockToleranceSec?: number;
  /**
   * Require a numeric `exp` claim. Default **true** — a JWT with no expiry
   * would never expire, so a leaked token stays valid forever. Set `false`
   * only for a token type you know is intentionally non-expiring.
   */
  requireExp?: boolean;
  /** If set, `iss` must equal this value (RFC 7519 issuer check). */
  issuer?: string;
  /** If set, `aud` must equal (or, for an array `aud`, include) this value. */
  audience?: string;
}

/**
 * Verify a BuildBase-issued HS256 JWT (signed with the client secret) and return
 * its payload. Checks the signature (timing-safe), the algorithm, `exp`/`nbf`,
 * and — by default — that an `exp` is present at all. Optionally pins `iss`/`aud`.
 * Throws {@link AppBridgeError} on any failure.
 */
export function verifyClientJwt(
  token: string,
  clientSecret: string,
  options: VerifyClientJwtOptions = {}
): VerifiedJwtPayload {
  const clockToleranceSec = options.clockToleranceSec ?? 60;
  const requireExp = options.requireExp ?? true;

  if (!token || !clientSecret) {
    throw new AppBridgeError('invalid_token', 'Missing token or client secret');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppBridgeError('invalid_token', 'Malformed JWT');
  }
  const [headerB64, payloadB64, sigB64] = parts;

  // Decode the header and PIN the algorithm before doing any crypto. The key is
  // always the symmetric client secret, so we must never let the token's own
  // header pick the algorithm (alg-confusion / alg:none). Checking alg first —
  // before computing the HMAC — keeps this robust even if the verifier is later
  // extended to support asymmetric algorithms.
  let header: Record<string, unknown>;
  let payload: VerifiedJwtPayload;
  try {
    header = jsonFromB64Url(headerB64);
    payload = jsonFromB64Url(payloadB64) as VerifiedJwtPayload;
  } catch {
    throw new AppBridgeError('invalid_token', 'Unreadable JWT segments');
  }
  if (header.alg !== 'HS256') {
    throw new AppBridgeError('invalid_algorithm', `Unexpected JWT alg: ${String(header.alg)}`);
  }

  const expected = hmacSha256(utf8Bytes(clientSecret), utf8Bytes(`${headerB64}.${payloadB64}`));
  let provided: Uint8Array;
  try {
    provided = base64UrlToBytes(sigB64);
  } catch {
    throw new AppBridgeError('invalid_signature', 'Unreadable JWT signature');
  }
  if (!timingSafeEqualBytes(expected, provided)) {
    throw new AppBridgeError('invalid_signature', 'JWT signature verification failed');
  }

  const now = Math.floor(Date.now() / 1000);
  if (requireExp && typeof payload.exp !== 'number') {
    throw new AppBridgeError('invalid_token', 'JWT is missing a numeric exp claim');
  }
  if (typeof payload.exp === 'number' && now > payload.exp + clockToleranceSec) {
    throw new AppBridgeError('token_expired', 'JWT has expired');
  }
  if (typeof payload.nbf === 'number' && now + clockToleranceSec < payload.nbf) {
    throw new AppBridgeError('token_not_yet_valid', 'JWT is not yet valid');
  }
  if (options.issuer !== undefined && payload.iss !== options.issuer) {
    throw new AppBridgeError('invalid_issuer', 'JWT issuer mismatch');
  }
  if (options.audience !== undefined) {
    const aud = payload.aud;
    const ok = Array.isArray(aud) ? aud.includes(options.audience) : aud === options.audience;
    if (!ok) throw new AppBridgeError('invalid_audience', 'JWT audience mismatch');
  }
  return payload;
}

/** Extract the token from an `Authorization: Bearer <token>` header. */
export function extractBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : null;
}

function jsonToB64Url(value: unknown): string {
  return bytesToBase64Url(utf8Bytes(JSON.stringify(value)));
}

/**
 * Sign an HS256 JWT — the symmetric counterpart of {@link verifyClientJwt}.
 * Sets `iat` and `exp` (from `expiresInSec`, default 3600) unless the payload
 * already carries them. The intended use is minting the app's own agent access
 * tokens in an `applicationTokenUrl` handler, embedding whatever claims the
 * MCP/API layer needs to verify later (e.g. `sub`, `scope`, a session id).
 */
export function signClientJwt(
  payload: Record<string, unknown>,
  secret: string,
  options?: { expiresInSec?: number }
): string {
  if (!secret) {
    throw new AppBridgeError('invalid_secret', 'Missing signing secret');
  }
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iat: now,
    exp: now + (options?.expiresInSec ?? 3600),
    ...payload,
  };
  const signingInput = `${jsonToB64Url({ alg: 'HS256', typ: 'JWT' })}.${jsonToB64Url(claims)}`;
  const signature = hmacSha256(utf8Bytes(secret), utf8Bytes(signingInput));
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}

// ─── Request verifiers ─────────────────────────────────────────────────────────

interface VerifyOptions {
  /** The `Authorization` header value from the incoming request. */
  authorization: string | null | undefined;
  /** Your OAuth2 client's secret (the signing key). */
  clientSecret: string;
  /** Allowed clock skew in seconds for exp/nbf. Default 60. */
  clockToleranceSec?: number;
}

/** Verify an `applicationTokenUrl` request and return the user + grant context. */
export function verifyAppTokenRequest(options: VerifyOptions): AppTokenRequestClaims {
  const token = extractBearerToken(options.authorization);
  if (!token) {
    throw new AppBridgeError('invalid_token', 'Missing Bearer token');
  }
  return verifyClientJwt(token, options.clientSecret, {
    clockToleranceSec: options.clockToleranceSec,
  }) as AppTokenRequestClaims;
}

/** Verify an `applicationRevokeUrl` request and return the revocation context. */
export function verifyAppRevokeRequest(options: VerifyOptions): AppRevokeRequestClaims {
  const token = extractBearerToken(options.authorization);
  if (!token) {
    throw new AppBridgeError('invalid_token', 'Missing Bearer token');
  }
  return verifyClientJwt(token, options.clientSecret, {
    clockToleranceSec: options.clockToleranceSec,
  }) as AppRevokeRequestClaims;
}

// ─── Response envelope (matches the platform's strict schema) ───────────────────

/** What your `mintToken` returns: an access token and, ideally, its lifetime. */
export interface AppTokenResult {
  /** The access token your app minted (its own format). */
  token: string;
  /** Token lifetime in seconds; the platform surfaces it as `expires_in`. */
  expiresIn?: number;
  /** Optional human-readable message. */
  message?: string;
}

/**
 * The exact body shape the platform expects from `applicationTokenUrl`
 * (`{ success, token, message }`, plus optional `expiresIn`; no other keys).
 */
export interface AppTokenResponseBody {
  success: boolean;
  token: string;
  message: string;
  expiresIn?: number;
}

/** Build a success body for `applicationTokenUrl`. */
export function appTokenSuccess(result: AppTokenResult): AppTokenResponseBody {
  return {
    success: true,
    token: result.token,
    message: result.message ?? 'ok',
    ...(typeof result.expiresIn === 'number' ? { expiresIn: result.expiresIn } : {}),
  };
}

/** Build a failure body for `applicationTokenUrl`. */
export function appTokenFailure(message: string): AppTokenResponseBody {
  return { success: false, token: '', message };
}

// ─── One-call handlers (verify → your logic → response) ─────────────────────────

/** The `{ status, body }` a framework-agnostic handler returns. */
export interface HandlerResult<T> {
  status: number;
  body: T;
}

/**
 * Verify an `applicationTokenUrl` request, mint via your callback, and return
 * the exact response the platform expects. Returns 401 with a failure body when
 * verification fails; errors thrown by `mintToken` propagate to you.
 *
 * @example
 * ```ts
 * const { status, body } = await handleAppTokenRequest({
 *   authorization: req.headers.authorization,
 *   clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,
 *   mintToken: (user) => ({ token: signMyJwt(user, { aud: user.resource }), expiresIn: 3600 }),
 * });
 * res.status(status).json(body);
 * ```
 */
export async function handleAppTokenRequest(options: {
  authorization: string | null | undefined;
  clientSecret: string;
  mintToken: (claims: AppTokenRequestClaims) => AppTokenResult | Promise<AppTokenResult>;
  clockToleranceSec?: number;
}): Promise<HandlerResult<AppTokenResponseBody>> {
  let claims: AppTokenRequestClaims;
  try {
    claims = verifyAppTokenRequest(options);
  } catch (e) {
    const code = e instanceof AppBridgeError ? e.code : 'invalid_token';
    return { status: 401, body: appTokenFailure(code) };
  }
  const result = await options.mintToken(claims);
  return { status: 200, body: appTokenSuccess(result) };
}

/**
 * Verify an `applicationRevokeUrl` request and run your invalidation callback.
 * Returns 401 on verification failure; errors thrown by `onRevoke` propagate.
 */
export async function handleAppRevokeRequest(options: {
  authorization: string | null | undefined;
  clientSecret: string;
  onRevoke: (claims: AppRevokeRequestClaims) => void | Promise<void>;
  clockToleranceSec?: number;
}): Promise<HandlerResult<{ success: boolean; message?: string }>> {
  let claims: AppRevokeRequestClaims;
  try {
    claims = verifyAppRevokeRequest(options);
  } catch (e) {
    const code = e instanceof AppBridgeError ? e.code : 'invalid_token';
    return { status: 401, body: { success: false, message: code } };
  }
  await options.onRevoke(claims);
  return { status: 200, body: { success: true } };
}

// ─── Resource-server 401 challenge (RFC 9728 / RFC 6750) ───────────────────────

/**
 * Build the 401 an agent should receive when it calls your protected API without
 * a valid token. The `WWW-Authenticate: Bearer resource_metadata=...` header
 * points the agent at your `/.well-known/oauth-protected-resource` document,
 * bootstrapping the OAuth discovery flow (RFC 9728 §5.1, RFC 6750 §3).
 *
 * @example
 * ```ts
 * if (!isValid(token)) {
 *   const c = bearerChallenge({ resourceMetadataUrl: "https://example.com/.well-known/oauth-protected-resource" });
 *   res.writeHead(c.status, c.headers).end(c.body);
 * }
 * ```
 */
/**
 * Sanitize a value for use inside an HTTP `WWW-Authenticate` quoted string:
 * drop control characters (CR/LF — header-injection defense) and backslash-
 * escape `"` and `\` per RFC 7230 quoted-string rules.
 */
function quoteAuthParam(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1f\x7f]/g, '').replace(/([\\"])/g, '\\$1');
}

export function bearerChallenge(options: {
  resourceMetadataUrl: string;
  error?: 'invalid_token' | 'insufficient_scope' | string;
  errorDescription?: string;
}): { status: number; headers: Record<string, string>; body: string } {
  const parts = [`Bearer resource_metadata="${quoteAuthParam(options.resourceMetadataUrl)}"`];
  if (options.error) parts.push(`error="${quoteAuthParam(options.error)}"`);
  if (options.errorDescription) {
    parts.push(`error_description="${quoteAuthParam(options.errorDescription)}"`);
  }
  return {
    status: 401,
    headers: {
      'WWW-Authenticate': parts.join(', '),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: options.error ?? 'invalid_token' }),
  };
}
