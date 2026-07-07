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

/** Decode a base64url string to bytes. Uses the global `atob` (Node 16+, edge, browser). */
function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function jsonFromB64Url(b64url: string): Record<string, any> {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(b64url)));
}

/**
 * Verify a BuildBase-issued HS256 JWT (signed with the client secret) and return
 * its payload. Checks the signature (timing-safe), the algorithm, and `exp`/`nbf`.
 * Throws {@link AppBridgeError} on any failure.
 */
export function verifyClientJwt(
  token: string,
  clientSecret: string,
  clockToleranceSec = 60
): Record<string, any> {
  if (!token || !clientSecret) {
    throw new AppBridgeError('invalid_token', 'Missing token or client secret');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppBridgeError('invalid_token', 'Malformed JWT');
  }
  const [headerB64, payloadB64, sigB64] = parts;

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

  let header: Record<string, any>;
  let payload: Record<string, any>;
  try {
    header = jsonFromB64Url(headerB64);
    payload = jsonFromB64Url(payloadB64);
  } catch {
    throw new AppBridgeError('invalid_token', 'Unreadable JWT segments');
  }
  if (header.alg !== 'HS256') {
    throw new AppBridgeError('invalid_algorithm', `Unexpected JWT alg: ${String(header.alg)}`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && now > payload.exp + clockToleranceSec) {
    throw new AppBridgeError('token_expired', 'JWT has expired');
  }
  if (typeof payload.nbf === 'number' && now + clockToleranceSec < payload.nbf) {
    throw new AppBridgeError('token_not_yet_valid', 'JWT is not yet valid');
  }
  return payload;
}

/** Extract the token from an `Authorization: Bearer <token>` header. */
export function extractBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : null;
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
  return verifyClientJwt(
    token,
    options.clientSecret,
    options.clockToleranceSec
  ) as AppTokenRequestClaims;
}

/** Verify an `applicationRevokeUrl` request and return the revocation context. */
export function verifyAppRevokeRequest(options: VerifyOptions): AppRevokeRequestClaims {
  const token = extractBearerToken(options.authorization);
  if (!token) {
    throw new AppBridgeError('invalid_token', 'Missing Bearer token');
  }
  return verifyClientJwt(
    token,
    options.clientSecret,
    options.clockToleranceSec
  ) as AppRevokeRequestClaims;
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
 *   const c = bearerChallenge({ resourceMetadataUrl: "https://imejis.io/.well-known/oauth-protected-resource" });
 *   res.writeHead(c.status, c.headers).end(c.body);
 * }
 * ```
 */
export function bearerChallenge(options: {
  resourceMetadataUrl: string;
  error?: 'invalid_token' | 'insufficient_scope' | string;
  errorDescription?: string;
}): { status: number; headers: Record<string, string>; body: string } {
  const parts = [`Bearer resource_metadata="${options.resourceMetadataUrl}"`];
  if (options.error) parts.push(`error="${options.error}"`);
  if (options.errorDescription) {
    parts.push(`error_description="${options.errorDescription}"`);
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
