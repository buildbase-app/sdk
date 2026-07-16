import { describe, expect, it } from 'vitest';
import { describeAgent, isMobileAgent } from './device-display';

// Representative real-world user-agent strings.
const UA = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  firefoxWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  operaWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/106.0.0.0',
  safariIpad:
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

describe('isMobileAgent', () => {
  it('flags phones/tablets as mobile', () => {
    expect(isMobileAgent(UA.safariIphone)).toBe(true);
    expect(isMobileAgent(UA.chromeAndroid)).toBe(true);
    expect(isMobileAgent(UA.safariIpad)).toBe(true);
  });

  it('flags desktops as not mobile', () => {
    expect(isMobileAgent(UA.chromeMac)).toBe(false);
    expect(isMobileAgent(UA.firefoxWindows)).toBe(false);
    expect(isMobileAgent(UA.edgeWindows)).toBe(false);
  });

  it('is safe for missing input', () => {
    expect(isMobileAgent(undefined)).toBe(false);
    expect(isMobileAgent(null)).toBe(false);
    expect(isMobileAgent('')).toBe(false);
  });
});

describe('describeAgent', () => {
  it('names common browser · OS combinations', () => {
    expect(describeAgent(UA.chromeMac)).toBe('Chrome · macOS');
    expect(describeAgent(UA.safariIphone)).toBe('Safari · iPhone');
    expect(describeAgent(UA.firefoxWindows)).toBe('Firefox · Windows');
    expect(describeAgent(UA.chromeAndroid)).toBe('Chrome · Android');
    expect(describeAgent(UA.safariIpad)).toBe('Safari · iPad');
  });

  it('disambiguates browsers whose UA overlaps with Chrome/Safari', () => {
    // Edge and Opera both contain "Chrome/…"; Chrome contains "Safari/…".
    expect(describeAgent(UA.edgeWindows)).toBe('Edge · Windows');
    expect(describeAgent(UA.operaWindows)).toBe('Opera · Windows');
  });

  it('returns whatever it can identify, or empty when nothing matches', () => {
    expect(describeAgent('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows'); // OS only
    expect(describeAgent('Some/1.0 totally-unknown-agent')).toBe('');
    expect(describeAgent(undefined)).toBe('');
    expect(describeAgent(null)).toBe('');
    expect(describeAgent('')).toBe('');
  });
});
