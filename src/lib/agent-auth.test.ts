import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildbaseAuth, createSessionRefCrypto, mintAgentToken } from './agent-auth';
import { signClientJwt } from './agent-bridge';

const SECRET = 'test-system-secret';

// The reference implementation consumers have been shipping (Node crypto,
// aes-256-gcm, base64url(iv | tag | ciphertext), key = SHA-256(secret + ':bb-session')).
// The SDK's WebCrypto implementation must stay byte-compatible with it.
const nodeKey = createHash('sha256').update(`${SECRET}:bb-session`).digest();

function nodeEncrypt(sessionId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', nodeKey, iv);
  const enc = Buffer.concat([cipher.update(sessionId, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url');
}

function nodeDecrypt(ref: string): string | null {
  try {
    const buf = Buffer.from(ref, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', nodeKey, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

describe('createSessionRefCrypto', () => {
  const crypto = createSessionRefCrypto(SECRET);

  it('round-trips', async () => {
    const ref = await crypto.encryptSessionRef('sess_12345');
    expect(await crypto.decryptSessionRef(ref)).toBe('sess_12345');
  });

  it('decrypts refs produced by the Node-crypto reference implementation', async () => {
    expect(await crypto.decryptSessionRef(nodeEncrypt('sess_from_node'))).toBe('sess_from_node');
  });

  it('produces refs the Node-crypto reference implementation can decrypt', async () => {
    expect(nodeDecrypt(await crypto.encryptSessionRef('sess_from_webcrypto'))).toBe(
      'sess_from_webcrypto'
    );
  });

  it('returns null for tampered or garbage refs', async () => {
    const ref = await crypto.encryptSessionRef('sess_x');
    expect(await crypto.decryptSessionRef(ref.slice(0, -4) + 'AAAA')).toBeNull();
    expect(await crypto.decryptSessionRef('not-a-ref')).toBeNull();
    expect(await createSessionRefCrypto('other-secret').decryptSessionRef(ref)).toBeNull();
  });
});

describe('mintAgentToken → buildbaseAuth', () => {
  const RESOURCE = 'https://app.example.com/api/mcp';
  const claims = {
    id: 'user_1',
    email: 'u@example.com',
    name: 'U',
    scope: ['read:profile'],
    resource: [RESOURCE],
    sessionId: 'sess_platform',
  };

  it('verifies its own mint: aud bound, sid decrypted, claims mapped', async () => {
    const { token, expiresIn } = await mintAgentToken({ claims, secret: SECRET });
    expect(expiresIn).toBe(3600);

    const auth = buildbaseAuth({ secret: SECRET, resource: RESOURCE });
    expect(auth.resourceMetadataUrl).toBe(
      'https://app.example.com/.well-known/oauth-protected-resource/api/mcp'
    );

    const info = await auth.verify(token, { method: 'POST', headers: {} });
    expect(info).not.toBeNull();
    expect(info!.sessionId).toBe('sess_platform');
    expect(info!.userId).toBe('user_1');
    expect(info!.scopes).toEqual(['read:profile']);
  });

  it('rejects a token minted for a different resource', async () => {
    const { token } = await mintAgentToken({
      claims: { ...claims, resource: ['https://other.example.com/api/mcp'] },
      secret: SECRET,
    });
    const auth = buildbaseAuth({ secret: SECRET, resource: RESOURCE });
    expect(await auth.verify(token, { method: 'POST', headers: {} })).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const { token } = await mintAgentToken({ claims, secret: 'wrong-secret' });
    const auth = buildbaseAuth({ secret: SECRET, resource: RESOURCE });
    expect(await auth.verify(token, { method: 'POST', headers: {} })).toBeNull();
  });

  it('accepts audience-less tokens unless requireAudience is set', async () => {
    const token = signClientJwt({ userId: 'user_2' }, SECRET);
    const lenient = buildbaseAuth({ secret: SECRET, resource: RESOURCE });
    const strict = buildbaseAuth({ secret: SECRET, resource: RESOURCE, requireAudience: true });
    const req = { method: 'POST', headers: {} };
    expect(await lenient.verify(token, req)).not.toBeNull();
    expect(await strict.verify(token, req)).toBeNull();
  });

  it('merges extraClaims into the minted token (e.g. workspaceId)', async () => {
    const { token } = await mintAgentToken({
      claims,
      secret: SECRET,
      extraClaims: { workspaceId: 'ws_9' },
    });
    const auth = buildbaseAuth({ secret: SECRET, resource: RESOURCE });
    const info = await auth.verify(token, { method: 'POST', headers: {} });
    expect(info!.workspaceId).toBe('ws_9');
  });
});
