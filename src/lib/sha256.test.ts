import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  bytesToHex,
  hexToBytes,
  hmacSha256,
  sha256Bytes,
  sha256Hex,
  timingSafeEqualBytes,
  utf8Bytes,
} from './sha256';

// Cross-check the dependency-free implementation against Node's crypto for a
// spread of inputs — this is the trust root for OAuth2 JWT verification.
describe('sha256Bytes / sha256Hex', () => {
  it('matches the FIPS 180-4 empty-string vector', () => {
    expect(sha256Hex(utf8Bytes(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('matches the "abc" vector', () => {
    expect(sha256Hex(utf8Bytes('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it.each([
    '',
    'a',
    'abc',
    'The quick brown fox jumps over the lazy dog',
    'x'.repeat(55), // one byte short of a block boundary
    'x'.repeat(56), // forces an extra padding block
    'x'.repeat(64), // exact block
    'x'.repeat(1000), // many blocks
    '🔐 unicode ☃ multibyte',
  ])('agrees with node:crypto for %j', input => {
    const expected = createHash('sha256').update(input, 'utf8').digest('hex');
    expect(sha256Hex(utf8Bytes(input))).toBe(expected);
  });
});

describe('hmacSha256', () => {
  it('matches the RFC 4231 test case 1', () => {
    // key = 0x0b*20, data = "Hi There"
    const key = new Uint8Array(20).fill(0x0b);
    const mac = bytesToHex(hmacSha256(key, utf8Bytes('Hi There')));
    expect(mac).toBe('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
  });

  it.each([
    ['short-key', 'message'],
    ['k'.repeat(64), 'exactly-block-length-key'],
    ['k'.repeat(65), 'key longer than block forces inner hash'],
    ['k'.repeat(200), 'very long key'],
  ])('agrees with node:crypto (key=%j)', (key, msg) => {
    const expected = createHmac('sha256', key).update(msg, 'utf8').digest('hex');
    expect(bytesToHex(hmacSha256(utf8Bytes(key), utf8Bytes(msg)))).toBe(expected);
  });
});

describe('timingSafeEqualBytes', () => {
  it('is true for equal arrays', () => {
    expect(timingSafeEqualBytes(utf8Bytes('secret'), utf8Bytes('secret'))).toBe(true);
  });

  it('is false for different content of equal length', () => {
    expect(timingSafeEqualBytes(utf8Bytes('secreta'), utf8Bytes('secretb'))).toBe(false);
  });

  it('is false for different lengths (never throws)', () => {
    expect(timingSafeEqualBytes(utf8Bytes('short'), utf8Bytes('longer'))).toBe(false);
  });

  it('is true for two empty arrays', () => {
    expect(timingSafeEqualBytes(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });
});

describe('hexToBytes', () => {
  it('round-trips with bytesToHex', () => {
    const bytes = new Uint8Array([0x00, 0x0f, 0xff, 0xa5, 0x7c]);
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it('returns null on odd-length input', () => {
    expect(hexToBytes('abc')).toBeNull();
  });

  it('returns null on non-hex characters', () => {
    expect(hexToBytes('zz')).toBeNull();
  });

  it('decodes uppercase hex', () => {
    expect(hexToBytes('FF00')).toEqual(new Uint8Array([0xff, 0x00]));
  });
});

// Guard the digest layout the JWT signature relies on.
describe('sha256Bytes output shape', () => {
  it('is always 32 bytes', () => {
    expect(sha256Bytes(utf8Bytes('anything')).length).toBe(32);
  });
});
