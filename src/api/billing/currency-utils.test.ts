import { describe, expect, it } from 'vitest';
import {
  formatCents,
  formatOverageRate,
  formatOverageRateWithLabel,
  isZeroDecimalCurrency,
  minorAmountToDisplay,
} from './currency-utils';
import { formatQuotaWithPrice, getQuotaDisplayParts } from './quota-utils';

describe('isZeroDecimalCurrency', () => {
  it('recognizes zero-decimal currencies case-insensitively', () => {
    expect(isZeroDecimalCurrency('jpy')).toBe(true);
    expect(isZeroDecimalCurrency('JPY')).toBe(true);
    expect(isZeroDecimalCurrency('krw')).toBe(true);
    expect(isZeroDecimalCurrency('usd')).toBe(false);
    expect(isZeroDecimalCurrency('')).toBe(false);
    expect(isZeroDecimalCurrency(null)).toBe(false);
  });
});

describe('minorAmountToDisplay', () => {
  it('divides by 100 for decimal currencies', () => {
    expect(minorAmountToDisplay(1999, 'usd')).toBe('19.99');
    expect(minorAmountToDisplay(50, 'eur')).toBe('0.50');
  });

  it('keeps whole units for zero-decimal currencies', () => {
    expect(minorAmountToDisplay(1000, 'jpy')).toBe('1,000');
    expect(minorAmountToDisplay(500, 'krw')).toBe('500');
  });
});

describe('formatCents', () => {
  it('formats decimal currencies as before', () => {
    expect(formatCents(1999, 'usd')).toBe('$19.99');
    expect(formatCents(0, 'gbp')).toBe('£0.00');
  });

  it('formats JPY without a cents division', () => {
    expect(formatCents(1000, 'jpy')).toBe('¥1,000');
    expect(formatCents(500, 'jpy')).toBe('¥500');
  });
});

describe('formatOverageRate', () => {
  it('formats per-unit and per-block rates', () => {
    expect(formatOverageRate(100, 1, 'usd')).toBe('$1.00/unit');
    expect(formatOverageRate(100, 1000, 'usd')).toBe('$1.00/1,000 units');
  });

  it('handles zero-decimal currencies', () => {
    expect(formatOverageRate(100, 1, 'jpy')).toBe('¥100/unit');
  });
});

describe('formatOverageRateWithLabel', () => {
  it('handles zero-decimal currencies', () => {
    expect(formatOverageRateWithLabel(50, 1000, 'video', 'jpy')).toBe('¥50/1,000 videos');
  });
});

describe('formatQuotaWithPrice (zero-decimal)', () => {
  it('does not divide zero-decimal overage by 100', () => {
    const out = formatQuotaWithPrice({ included: 10, overage: 100 }, 'videos', {
      currency: 'jpy',
    });
    expect(out).toContain('¥100');
    expect(out).not.toContain('1.00');
  });

  it('keeps decimal currencies unchanged', () => {
    const out = formatQuotaWithPrice({ included: 10, overage: 100 }, 'videos', {
      currency: 'usd',
    });
    expect(out).toContain('$1.00');
  });
});

describe('getQuotaDisplayParts (zero-decimal)', () => {
  it('formats JPY as whole yen', () => {
    const parts = getQuotaDisplayParts({ included: 10, overage: 100 }, 'videos', {
      currency: 'jpy',
      locale: 'en',
    });
    expect(parts?.price).toBe('¥100');
  });

  it('formats USD with cents', () => {
    const parts = getQuotaDisplayParts({ included: 10, overage: 100 }, 'videos', {
      currency: 'usd',
      locale: 'en',
    });
    expect(parts?.price).toBe('$1.00');
  });
});
