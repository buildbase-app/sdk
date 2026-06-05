/**
 * Shared formatting utilities for SDK UI components.
 */

/**
 * Format an ISO date string into a localized display string.
 * @param isoDate - ISO 8601 date string
 * @param locale - BCP 47 locale (default: 'en-US')
 * @param options - Intl.DateTimeFormat options (defaults to short date without time)
 */
export function formatDate(
  isoDate: string,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(
      locale,
      options ?? { month: 'short', day: 'numeric', year: 'numeric' }
    ).format(date);
  } catch {
    return '';
  }
}

/**
 * Format an ISO date string with time included.
 * @param isoDate - ISO 8601 date string
 * @param locale - BCP 47 locale (default: 'en-US')
 */
export function formatDateTime(isoDate: string, locale = 'en-US'): string {
  return formatDate(isoDate, locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a Unix timestamp (seconds) into a localized date string.
 * @param timestamp - Unix timestamp in seconds (null returns '')
 * @param locale - BCP 47 locale (default: 'en-US')
 */
export function formatUnixDate(timestamp: number | null, locale = 'en-US'): string {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
