/**
 * Exhaustive sweep tests for the central money formatters.
 *
 * Oracle strategy: instead of re-implementing the formatter in the test, every
 * formatted string is parsed back to a number and compared to the input amount
 * (round-trip). A formatter bug that loses, scales, or rounds the amount —
 * e.g. the ÷100-on-JPY class of bug — cannot survive a round-trip check.
 *
 * Coverage:
 * - every supported plan currency (PLAN_CURRENCY_CODES) × boundary amounts
 * - every ISO 4217 zero-decimal currency (Stripe list) × boundary amounts
 * - every ISO 4217 three-decimal currency (Stripe list) × boundary amounts
 * - every ISO 4217 currency the runtime knows (Intl.supportedValuesOf) —
 *   minor-unit digits agree with CLDR (modulo documented Stripe pins) and
 *   formatting round-trips
 * - international locale formats (de-DE, fr-FR, ja-JP, ar-EG, en-IN, pt-BR, …)
 * - USD: every cent from $0.01 to $10,000.00 (1..1,000,000 minor units) for
 *   formatCents/minorAmountToDisplay; formatMinorAmountIntl is exhaustive to
 *   $100.00 and prime-stride sampled to $10,000.00 (it constructs an
 *   Intl.NumberFormat per call — a million instantiations would take minutes
 *   without adding coverage: the ÷100 and fraction-digit logic does not vary
 *   past the first grouping boundary, which the sample crosses many times)
 * - JPY (zero-decimal): same exhaustive + sampled scheme over ¥1..¥1,000,000
 */
import { describe, expect, it } from 'vitest';
import {
  formatCents,
  formatMinorAmountIntl,
  getCurrencyDecimals,
  getCurrencySymbol,
  isZeroDecimalCurrency,
  minorAmountToDisplay,
  PLAN_CURRENCY_CODES,
} from './currency-utils';

/** ISO 4217 zero-decimal currencies (per Stripe) — spec assertion list. */
const ZERO_DECIMAL_CODES = [
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
] as const;

/** ISO 4217 three-decimal currencies (per Stripe) — spec assertion list. */
const THREE_DECIMAL_CODES = ['bhd', 'jod', 'kwd', 'omr', 'tnd'] as const;

/** Boundary + representative minor-unit amounts: grouping, rounding, and magnitude edges. */
const BOUNDARY_AMOUNTS = [
  0, 1, 2, 9, 10, 49, 50, 99, 100, 101, 999, 1000, 1001, 1299, 9999, 10000, 10001, 12345, 99999,
  100000, 100001, 123456, 999999, 1000000,
];

/**
 * Parse the numeric value out of a formatted en-US money string. Extracts the
 * numeric token rather than stripping characters — symbols may themselves
 * contain periods (XCG → "Cg.") or, for garbage codes, digits.
 */
function parseBack(formatted: string): number {
  const match = formatted.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return NaN;
  return Number.parseFloat(match[0].replace(/,/g, ''));
}

/** Compare in minor units to avoid float noise (12.99 * 100 === 1298.9999…). */
function roundTripsExactly(formatted: string, cents: number, currency: string): boolean {
  const decimals = getCurrencyDecimals(currency);
  const parsed = parseBack(formatted);
  return decimals === 0 ? parsed === cents : Math.round(parsed * 10 ** decimals) === cents;
}

describe('every supported plan currency × boundary amounts', () => {
  it.each([...PLAN_CURRENCY_CODES])('formatCents round-trips all amounts for %s', code => {
    const symbol = getCurrencySymbol(code);
    const failures: string[] = [];
    for (const cents of BOUNDARY_AMOUNTS) {
      const out = formatCents(cents, code);
      if (!out.startsWith(symbol)) failures.push(`${cents} → "${out}" missing symbol "${symbol}"`);
      if (!roundTripsExactly(out, cents, code)) failures.push(`${cents} → "${out}" lost value`);
    }
    expect(failures).toEqual([]);
  });

  it.each([...PLAN_CURRENCY_CODES])(
    'formatMinorAmountIntl round-trips all amounts for %s',
    code => {
      const failures: string[] = [];
      for (const cents of BOUNDARY_AMOUNTS) {
        const out = formatMinorAmountIntl(cents, code);
        if (!roundTripsExactly(out, cents, code)) failures.push(`${cents} → "${out}" lost value`);
      }
      expect(failures).toEqual([]);
    }
  );

  it.each([...PLAN_CURRENCY_CODES])('decimal currencies always show 2 decimals for %s', code => {
    if (isZeroDecimalCurrency(code)) return;
    for (const cents of BOUNDARY_AMOUNTS) {
      expect(minorAmountToDisplay(cents, code)).toMatch(/\.\d{2}$/);
      expect(formatMinorAmountIntl(cents, code)).toMatch(/\.\d{2}/);
    }
  });
});

describe('every ISO zero-decimal currency × boundary amounts', () => {
  it.each([...ZERO_DECIMAL_CODES])('is classified as zero-decimal: %s', code => {
    expect(getCurrencyDecimals(code)).toBe(0);
    expect(isZeroDecimalCurrency(code)).toBe(true);
  });

  it.each([...ZERO_DECIMAL_CODES])('never divides or shows decimals for %s', code => {
    const failures: string[] = [];
    for (const cents of BOUNDARY_AMOUNTS) {
      for (const out of [formatCents(cents, code), formatMinorAmountIntl(cents, code)]) {
        // A decimal point in a zero-decimal currency means a ÷100 slipped in.
        if (parseBack(out) !== cents) failures.push(`${code} ${cents} → "${out}"`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('every ISO three-decimal currency × boundary amounts', () => {
  it.each([...THREE_DECIMAL_CODES])('is classified as three-decimal: %s', code => {
    expect(getCurrencyDecimals(code)).toBe(3);
  });

  it.each([...THREE_DECIMAL_CODES])('divides by 1000 and shows 3 decimals for %s', code => {
    expect(minorAmountToDisplay(12345, code)).toBe('12.345');
    expect(minorAmountToDisplay(1, code)).toBe('0.001');
    const failures: string[] = [];
    for (const cents of BOUNDARY_AMOUNTS) {
      for (const out of [formatCents(cents, code), formatMinorAmountIntl(cents, code)]) {
        if (!roundTripsExactly(out, cents, code)) failures.push(`${code} ${cents} → "${out}"`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('every ISO 4217 currency known to the runtime', () => {
  // Intl.supportedValuesOf is ES2022 — feature-detect so the file compiles
  // under the build's lib target while still sweeping the full list in Node.
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  const allIsoCodes = supportedValuesOf ? supportedValuesOf('currency') : [];

  it('runtime exposes the ISO currency list', () => {
    expect(allIsoCodes.length).toBeGreaterThan(150);
  });

  it('minor-unit digits agree with CLDR for every currency (modulo Stripe pins)', () => {
    // Deliberate divergences from CLDR, matching the Stripe billing backend:
    const STRIPE_PINS: Record<string, number> = {
      isk: 2, // ISO/CLDR say 0; Stripe requires amounts divisible by 100
    };
    const failures: string[] = [];
    for (const iso of allIsoCodes) {
      const code = iso.toLowerCase();
      const cldr = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: iso,
      }).resolvedOptions().maximumFractionDigits;
      const expected = STRIPE_PINS[code] ?? cldr;
      const actual = getCurrencyDecimals(code);
      if (actual !== expected) failures.push(`${iso}: ours=${actual} cldr=${cldr}`);
    }
    expect(failures).toEqual([]);
  });

  it('formatMinorAmountIntl round-trips boundary amounts for every ISO currency', () => {
    const failures: string[] = [];
    for (const iso of allIsoCodes) {
      const code = iso.toLowerCase();
      for (const cents of [1, 100, 1299, 999999, 1000000]) {
        const out = formatMinorAmountIntl(cents, code);
        if (!roundTripsExactly(out, cents, code)) {
          failures.push(`${iso} ${cents} → "${out}"`);
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });
});

describe('international locale formats', () => {
  // Divisor correctness is proven by the round-trip suites above; this checks
  // that the locale reaches Intl unmangled — separators, symbol position, and
  // digit systems must match what Intl itself produces for the same value.
  const LOCALES = ['en-US', 'de-DE', 'fr-FR', 'ja-JP', 'ar-EG', 'en-IN', 'pt-BR', 'sv-SE'];
  const CURRENCIES = ['usd', 'eur', 'gbp', 'jpy', 'inr', 'kwd', 'brl', 'sek'];

  it.each(LOCALES)('matches Intl output for every currency in %s', locale => {
    const failures: string[] = [];
    for (const code of CURRENCIES) {
      const decimals = getCurrencyDecimals(code);
      for (const cents of [1, 1299, 123456789]) {
        const expected = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code.toUpperCase(),
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(cents / 10 ** decimals);
        const actual = formatMinorAmountIntl(cents, code, locale);
        if (actual !== expected)
          failures.push(`${locale} ${code} ${cents}: "${actual}" ≠ "${expected}"`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('formats with non-Latin digit systems (ar-EG uses Arabic-Indic digits)', () => {
    const out = formatMinorAmountIntl(1299, 'usd', 'ar-EG');
    expect(out).toContain('١٢'); // ١٢٫٩٩ — Arabic-Indic 12
  });

  it('applies Indian lakh/crore grouping for en-IN', () => {
    // 12,34,56,789 paise → ₹1,23,45,678.90? No — 123456789 paise = ₹12,34,567.89
    expect(formatMinorAmountIntl(123456789, 'inr', 'en-IN')).toBe('₹12,34,567.89');
  });
});

describe('USD exhaustive sweep — every cent from $0.01 to $10,000.00', () => {
  it('formatCents round-trips all 1,000,000 amounts', () => {
    const failures: string[] = [];
    for (let cents = 1; cents <= 1_000_000; cents++) {
      const out = formatCents(cents, 'usd');
      if (out.charCodeAt(0) !== 36 /* '$' */ || !roundTripsExactly(out, cents, 'usd')) {
        failures.push(`${cents} → "${out}"`);
        if (failures.length >= 10) break;
      }
    }
    expect(failures).toEqual([]);
  });

  it('formatMinorAmountIntl round-trips exhaustively to $100, prime-stride sampled to $10,000', () => {
    const failures: string[] = [];
    const check = (cents: number) => {
      const out = formatMinorAmountIntl(cents, 'usd');
      if (!out.startsWith('$') || !roundTripsExactly(out, cents, 'usd')) {
        failures.push(`${cents} → "${out}"`);
      }
    };
    for (let cents = 1; cents <= 10_000; cents++) check(cents);
    // 991 is prime → the sample hits every residue mod 10/100/1000, crossing
    // both grouping boundaries and every cents pattern.
    for (let cents = 10_001; cents <= 1_000_000; cents += 991) check(cents);
    check(1_000_000);
    expect(failures.slice(0, 10)).toEqual([]);
  });
});

describe('JPY exhaustive sweep — zero-decimal, ¥1 to ¥1,000,000', () => {
  it('formatCents round-trips all 1,000,000 amounts as whole yen', () => {
    const failures: string[] = [];
    for (let yen = 1; yen <= 1_000_000; yen++) {
      const out = formatCents(yen, 'jpy');
      if (parseBack(out) !== yen) {
        failures.push(`${yen} → "${out}"`);
        if (failures.length >= 10) break;
      }
    }
    expect(failures).toEqual([]);
  });

  it('formatMinorAmountIntl round-trips exhaustively to ¥10,000, prime-stride sampled to ¥1,000,000', () => {
    const failures: string[] = [];
    const check = (yen: number) => {
      const out = formatMinorAmountIntl(yen, 'jpy');
      if (parseBack(out) !== yen || out.includes('.')) failures.push(`${yen} → "${out}"`);
    };
    for (let yen = 1; yen <= 10_000; yen++) check(yen);
    for (let yen = 10_001; yen <= 1_000_000; yen += 991) check(yen);
    check(1_000_000);
    expect(failures.slice(0, 10)).toEqual([]);
  });
});

describe('unknown and malformed currency codes', () => {
  it('round-trips value for unknown codes across boundary amounts', () => {
    for (const code of ['zzz', 'xyz', 'abc']) {
      for (const cents of BOUNDARY_AMOUNTS) {
        expect(roundTripsExactly(formatCents(cents, code), cents, code)).toBe(true);
        expect(roundTripsExactly(formatMinorAmountIntl(cents, code), cents, code)).toBe(true);
      }
    }
  });

  it('handles empty/whitespace/malformed currency without crashing and keeps the value', () => {
    // (a digit-containing garbage code like '12' is excluded: its fallback
    // "symbol" is the code itself, which merges with the number in the output)
    for (const code of ['', '  ', '$', 'usdd', 'zz']) {
      for (const cents of [1, 1299, 1_000_000]) {
        expect(roundTripsExactly(formatMinorAmountIntl(cents, code), cents, code)).toBe(true);
      }
    }
  });

  it('is case- and whitespace-insensitive for real codes', () => {
    expect(formatMinorAmountIntl(1299, 'USD')).toBe(formatMinorAmountIntl(1299, 'usd'));
    expect(formatMinorAmountIntl(1000, ' JPY ')).toBe(formatMinorAmountIntl(1000, 'jpy'));
    expect(formatMinorAmountIntl(12345, 'KWD')).toBe(formatMinorAmountIntl(12345, 'kwd'));
    expect(formatCents(1299, 'Usd')).toBe(formatCents(1299, 'usd'));
  });
});
