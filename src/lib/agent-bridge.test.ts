import { describe, expect, it } from 'vitest';
import {
  AppBridgeError,
  bearerChallenge,
  extractBearerToken,
  handleAppTokenRequest,
  signClientJwt,
  verifyClientJwt,
} from './agent-bridge';
import { bytesToBase64Url } from './base64url';
import { hmacSha256, utf8Bytes } from './sha256';

const SECRET = 'client_secret_test';

function b64url(value: unknown): string {
  return bytesToBase64Url(utf8Bytes(JSON.stringify(value)));
}

/** Hand-build a JWT with an arbitrary header — for alg-confusion tests. */
function forgeJwt(header: Record<string, unknown>, payload: Record<string, unknown>): string {
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const sig = bytesToBase64Url(hmacSha256(utf8Bytes(SECRET), utf8Bytes(signingInput)));
  return `${signingInput}.${sig}`;
}

describe('signClientJwt → verifyClientJwt round trip', () => {
  it('verifies its own mint and preserves claims', () => {
    const token = signClientJwt({ sub: 'u1', email: 'a@b.c', scope: ['x:read'] }, SECRET);
    const claims = verifyClientJwt(token, SECRET);
    expect(claims.sub).toBe('u1');
    expect(claims.email).toBe('a@b.c');
    expect(claims.scope).toEqual(['x:read']);
    expect(typeof claims.exp).toBe('number');
    expect(typeof claims.iat).toBe('number');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signClientJwt({ sub: 'u1' }, 'other_secret');
    expect(() => verifyClientJwt(token, SECRET)).toThrowError(AppBridgeError);
  });

  it('rejects a tampered payload', () => {
    const token = signClientJwt({ sub: 'u1', role: 'member' }, SECRET);
    const [h, p, s] = token.split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    payload.role = 'admin';
    const tampered = `${h}.${b64url(payload)}.${s}`;
    expect(() => verifyClientJwt(tampered, SECRET)).toThrowError(/signature/i);
  });
});

describe('verifyClientJwt hardening', () => {
  it('rejects alg:none even with a matching HMAC (alg pinned before crypto)', () => {
    const payload = { sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 };
    const forged = forgeJwt({ alg: 'none', typ: 'JWT' }, payload);
    expect(() => verifyClientJwt(forged, SECRET)).toThrowError(/alg/i);
    const forgedRs = forgeJwt({ alg: 'RS256', typ: 'JWT' }, payload);
    expect(() => verifyClientJwt(forgedRs, SECRET)).toThrowError(/alg/i);
  });

  it('requires exp by default; requireExp:false allows non-expiring tokens', () => {
    const noExp = forgeJwt({ alg: 'HS256', typ: 'JWT' }, { sub: 'u1' });
    expect(() => verifyClientJwt(noExp, SECRET)).toThrowError(/exp/i);
    expect(verifyClientJwt(noExp, SECRET, { requireExp: false }).sub).toBe('u1');
  });

  it('rejects expired tokens, honoring clockToleranceSec', () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = forgeJwt({ alg: 'HS256', typ: 'JWT' }, { sub: 'u1', exp: now - 120 });
    expect(() => verifyClientJwt(expired, SECRET)).toThrowError(AppBridgeError);
    expect(verifyClientJwt(expired, SECRET, { clockToleranceSec: 300 }).sub).toBe('u1');
  });

  it('rejects not-yet-valid (nbf) tokens', () => {
    const now = Math.floor(Date.now() / 1000);
    const future = forgeJwt(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'u1', exp: now + 3600, nbf: now + 600 }
    );
    expect(() => verifyClientJwt(future, SECRET)).toThrowError(AppBridgeError);
  });

  it('pins issuer and audience when configured', () => {
    const token = signClientJwt({ sub: 'u1', iss: 'https://as.example', aud: 'rs-a' }, SECRET);
    expect(verifyClientJwt(token, SECRET, { issuer: 'https://as.example' }).sub).toBe('u1');
    expect(() => verifyClientJwt(token, SECRET, { issuer: 'https://evil' })).toThrowError(
      AppBridgeError
    );
    expect(verifyClientJwt(token, SECRET, { audience: 'rs-a' }).sub).toBe('u1');
    expect(() => verifyClientJwt(token, SECRET, { audience: 'rs-b' })).toThrowError(AppBridgeError);
  });

  it('rejects garbage tokens with a clear error', () => {
    expect(() => verifyClientJwt('not-a-jwt', SECRET)).toThrowError(AppBridgeError);
    expect(() => verifyClientJwt('a.b', SECRET)).toThrowError(AppBridgeError);
  });
});

describe('extractBearerToken', () => {
  it('extracts the token case-insensitively and trims it', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
    expect(extractBearerToken('bearer abc123 ')).toBe('abc123');
  });

  it('returns null for missing/malformed headers', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('')).toBeNull();
  });
});

describe('bearerChallenge', () => {
  it('builds an RFC 9728 401 with the resource metadata pointer', () => {
    const r = bearerChallenge({ resourceMetadataUrl: 'https://a.example/.well-known/x' });
    expect(r.status).toBe(401);
    expect(r.headers['WWW-Authenticate']).toContain(
      'resource_metadata="https://a.example/.well-known/x"'
    );
    expect(JSON.parse(r.body)).toEqual({ error: 'invalid_token' });
  });

  it('escapes quotes and strips CR/LF from header values (no header injection)', () => {
    const r = bearerChallenge({
      resourceMetadataUrl: 'https://a.example/x',
      error: 'invalid_token',
      errorDescription: 'bad "token"\r\nSet-Cookie: pwned=1',
    });
    const header = r.headers['WWW-Authenticate'];
    expect(header).not.toMatch(/[\r\n]/);
    expect(header).toContain('\\"token\\"');
  });
});

describe('handleAppTokenRequest', () => {
  it('verifies the platform JWT and returns the minted token envelope', async () => {
    const platformJwt = signClientJwt(
      { id: 'u1', email: 'a@b.c', scope: ['x:read'], sessionId: 'sess_1' },
      SECRET
    );
    const result = await handleAppTokenRequest({
      authorization: `Bearer ${platformJwt}`,
      clientSecret: SECRET,
      mintToken: claims => ({ token: `minted-for-${claims.id}`, expiresIn: 3600 }),
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true, token: 'minted-for-u1', expiresIn: 3600 });
  });

  it('returns 401 with a machine-readable code for a bad token', async () => {
    const result = await handleAppTokenRequest({
      authorization: 'Bearer garbage',
      clientSecret: SECRET,
      mintToken: () => ({ token: 'x', expiresIn: 1 }),
    });
    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({ success: false });
  });
});
