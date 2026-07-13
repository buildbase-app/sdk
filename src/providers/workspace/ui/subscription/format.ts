import { formatDate } from '../../../../lib/format-utils';

// Format ISO date string to readable date (shared formatter, long month)
export const formatPeriodEndDate = (locale: string, isoDate: string | undefined | null): string =>
  isoDate ? formatDate(isoDate, locale, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
