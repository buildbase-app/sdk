/**
 * Small display helpers for device/session rows — turning raw request metadata
 * (user-agent, IP info) into something a non-technical person can read.
 */

/** Rough desktop-vs-mobile guess from a user-agent, for choosing a device icon. */
export function isMobileAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);
}

/** Friendly browser name from a user-agent (order matters — most UAs overlap). */
function browserName(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
  return '';
}

/** Friendly OS/platform name from a user-agent (order matters). */
function osName(ua: string): string {
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return '';
}

/**
 * A short, human-readable "Browser · OS" label from a raw user-agent — e.g.
 * "Chrome · macOS", "Safari · iPhone". Returns whichever parts we can identify
 * (or an empty string). Deliberately neutral punctuation so no word needs
 * translating. Never shows the raw user-agent, which is unreadable noise.
 */
export function describeAgent(userAgent?: string | null): string {
  if (!userAgent) return '';
  return [browserName(userAgent), osName(userAgent)].filter(Boolean).join(' · ');
}
