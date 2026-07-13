/**
 * Centralized formatting for subscription/quota display: cents, overage rates, included + overage text.
 * Currency must be provided by the caller (e.g. workspace.billingCurrency, plan.currency, or selected currency).
 */

/** Common currency display (code or symbol). Use lowercase Stripe codes (usd, eur, etc.). */
export const CURRENCY_DISPLAY: Record<string, string> = {
  usd: '$',
  eur: '\u20AC',
  gbp: '\u00A3',
  jpy: '\u00A5',
  cad: 'CA$',
  aud: 'A$',
  chf: 'CHF',
  cny: '\u00A5',
  hkd: 'HK$',
  sgd: 'S$',
  inr: '\u20B9',
  mxn: 'MX$',
  brl: 'R$',
  nzd: 'NZ$',
  sek: 'kr',
  nok: 'kr',
  dkk: 'kr',
  pln: 'z\u0142',
  thb: '\u0E3F',
};

/** Currency code to flag emoji (country/region associated with the currency). Use for dropdowns. */
export const CURRENCY_FLAG: Record<string, string> = {
  usd: '\uD83C\uDDFA\uD83C\uDDF8', // 🇺🇸
  eur: '\uD83C\uDDEA\uD83C\uDDFA', // 🇪🇺
  gbp: '\uD83C\uDDEC\uD83C\uDDE7', // 🇬🇧
  jpy: '\uD83C\uDDEF\uD83C\uDDF5', // 🇯🇵
  cad: '\uD83C\uDDE8\uD83C\uDDE6', // 🇨🇦
  aud: '\uD83C\uDDE6\uD83C\uDDFA', // 🇦🇺
  chf: '\uD83C\uDDE8\uD83C\uDDED', // 🇨🇭
  cny: '\uD83C\uDDE8\uD83C\uDDF3', // 🇨🇳
  hkd: '\uD83C\uDDED\uD83C\uDDF0', // 🇭🇰
  sgd: '\uD83C\uDDF8\uD83C\uDDEC', // 🇸🇬
  inr: '\uD83C\uDDEE\uD83C\uDDF3', // 🇮🇳
  mxn: '\uD83C\uDDF2\uD83C\uDDFD', // 🇲🇽
  brl: '\uD83C\uDDE7\uD83C\uDDF7', // 🇧🇷
  nzd: '\uD83C\uDDF3\uD83C\uDDFF', // 🇳🇿
  sek: '\uD83C\uDDF8\uD83C\uDDEA', // 🇸🇪
  nok: '\uD83C\uDDF3\uD83C\uDDF4', // 🇳🇴
  dkk: '\uD83C\uDDE9\uD83C\uDDF0', // 🇩🇰
  pln: '\uD83C\uDDF5\uD83C\uDDF1', // 🇵🇱
  thb: '\uD83C\uDDF9\uD83C\uDDED', // 🇹🇭
};

/** Get flag emoji for a currency code. Returns empty string when unknown or empty. */
export function getCurrencyFlag(currency: string): string {
  if (!currency || !currency.trim()) return '';
  return CURRENCY_FLAG[currency.trim().toLowerCase()] ?? '';
}

/** Get currency symbol for display. Use lowercase Stripe codes (usd, eur). Returns code when unknown; empty string when currency is empty. */
export function getCurrencySymbol(currency: string): string {
  if (!currency || !currency.trim()) return '';
  const key = currency.trim().toLowerCase();
  return CURRENCY_DISPLAY[key] ?? key.toUpperCase();
}

/** Allowed plan/pricing currency codes (must match server ALLOWED_BILLING_CURRENCIES). Use for dropdowns and validation. */
export const PLAN_CURRENCY_CODES = [
  'usd',
  'eur',
  'gbp',
  'jpy',
  'cad',
  'aud',
  'chf',
  'cny',
  'hkd',
  'sgd',
  'inr',
  'mxn',
  'brl',
  'nzd',
  'sek',
  'nok',
  'dkk',
  'pln',
  'thb',
] as const;

/** Options for plan currency select: { value, label } with symbol. Use in CreateOrEditPlan and anywhere a currency dropdown is needed. */
export const PLAN_CURRENCY_OPTIONS = PLAN_CURRENCY_CODES.map(value => ({
  value,
  label: `${value.toUpperCase()} (${getCurrencySymbol(value)})`,
}));

/**
 * ISO 4217 zero-decimal currencies (per Stripe): amounts are already whole
 * units — there is no "cents" subdivision to divide by.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
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
]);

/**
 * ISO 4217 three-decimal currencies (per Stripe): the minor unit is 1/1000
 * (fils/baisa) — amounts divide by 1000, not 100.
 */
const THREE_DECIMAL_CURRENCIES = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd']);

const currencyDecimalsCache = new Map<string, number>();

/**
 * Minor-unit digits for a currency per ISO 4217: 0 (JPY, KRW, …), 2 (most),
 * or 3 (KWD, BHD, …). The zero- and three-decimal sets are pinned to Stripe's
 * treatment (the billing backend defines amount semantics); ISK is pinned to 2
 * (Stripe legacy — ISO 4217 says 0). Any other code defers to the runtime's
 * CLDR data (IQD/LYD → 3, CLF/UYW → 4, UYI → 0), falling back to 2 for codes
 * unknown to Intl or malformed.
 */
export function getCurrencyDecimals(currency: string | null | undefined): number {
  const key = (currency ?? '').trim().toLowerCase();
  if (!key) return 2;
  if (ZERO_DECIMAL_CURRENCIES.has(key)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(key)) return 3;
  if (key === 'isk') return 2; // Stripe requires ISK amounts divisible by 100, despite ISO exponent 0
  let d = currencyDecimalsCache.get(key);
  if (d === undefined) {
    try {
      d =
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: key.toUpperCase(),
        }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      d = 2;
    }
    currencyDecimalsCache.set(key, d);
  }
  return d;
}

/** True when `currency` has no minor unit (JPY, KRW, …) — amounts are whole units, not cents. */
export function isZeroDecimalCurrency(currency: string | null | undefined): boolean {
  return (currency ?? '').trim() !== '' && getCurrencyDecimals(currency) === 0;
}

/**
 * Convert a minor-unit amount to its display number for `currency`:
 * `minorAmountToDisplay(1999, 'usd')` → `"19.99"`,
 * `minorAmountToDisplay(1000, 'jpy')` → `"1,000"` (zero-decimal — no division),
 * `minorAmountToDisplay(12345, 'kwd')` → `"12.345"` (three-decimal — ÷1000).
 */
export function minorAmountToDisplay(amount: number, currency: string): string {
  const decimals = getCurrencyDecimals(currency);
  return decimals === 0
    ? amount.toLocaleString('en-US')
    : (amount / 10 ** decimals).toFixed(decimals);
}

/**
 * Locale-aware currency formatting of a minor-unit amount via `Intl.NumberFormat`
 * (`(1999, 'usd', 'en-US')` → `"$19.99"`; `(1000, 'jpy', 'ja-JP')` → `"￥1,000"`;
 * `(12345, 'kwd')` → `"KWD 12.345"`). The divisor follows the currency's ISO 4217
 * minor-unit digits (see `getCurrencyDecimals`) — zero-decimal currencies are
 * never divided, three-decimal divide by 1000. Falls back to the symbol table
 * when the currency code is empty or malformed.
 */
export function formatMinorAmountIntl(amount: number, currency: string, locale = 'en-US'): string {
  const c = (currency ?? '').trim();
  const decimals = getCurrencyDecimals(c);
  const value = amount / 10 ** decimals;
  if (!c) return value.toFixed(decimals);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: c.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return (
      getCurrencySymbol(c) +
      (decimals === 0 ? value.toLocaleString('en-US') : value.toFixed(decimals))
    );
  }
}

/** Format cents as money string (e.g. 1999, "usd" -> "$19.99"; 1000, "jpy" -> "¥1,000"). Caller must pass currency (e.g. from plan or workspace). */
export function formatCents(cents: number, currency: string): string {
  return getCurrencySymbol(currency) + minorAmountToDisplay(cents, currency);
}

/** Translatable labels for overage/quota formatting */
export interface OverageLabels {
  /** Singular unit fallback (default: "unit") */
  unit: string;
  /** Plural units fallback (default: "units") */
  units: string;
  /** "Included" label */
  included: string;
  /** "after that" separator */
  afterThat: string;
  /** "After included:" prefix when no included count */
  afterIncluded: string;
  /** "Hard limit" label for quotas where over-usage is not allowed */
  hardLimit?: string;
}

const DEFAULT_OVERAGE_LABELS: Required<OverageLabels> = {
  unit: 'unit',
  units: 'units',
  included: 'Included',
  afterThat: 'after that',
  afterIncluded: 'After included',
  hardLimit: 'hard limit',
};

/**
 * Format overage rate for display. When unitSize > 1: "$1.00/1,000 units"; else "$1.00/unit".
 * Pass `labels` for i18n support and `locale` to group numbers in the display locale.
 */
export function formatOverageRate(
  overageCents: number | undefined,
  unitSize: number | undefined,
  currency: string,
  labels?: Partial<OverageLabels>,
  locale?: string
): string | null {
  if (overageCents == null || overageCents < 0) return null;
  const l = { ...DEFAULT_OVERAGE_LABELS, ...labels };
  const unitSizeN = unitSize != null && unitSize >= 1 ? unitSize : 1;
  const symbol = getCurrencySymbol(currency);
  const amount = minorAmountToDisplay(overageCents, currency);
  if (unitSizeN === 1) return `${symbol}${amount}/${l.unit}`;
  return `${symbol}${amount}/${unitSizeN.toLocaleString(locale)} ${l.units}`;
}

/**
 * Format overage rate with optional unit label for comparison/preview UIs.
 * e.g. formatOverageRateWithLabel(50, 1000, "video", "usd") -> "$0.50/1,000 videos"
 * Pass `labels` for i18n support. Pass `pluralUnitLabel` to avoid English "s" pluralization.
 * Pass `locale` to group numbers in the display locale.
 */
export function formatOverageRateWithLabel(
  overageCents: number | undefined,
  unitSize: number | undefined,
  unitLabel: string | undefined,
  currency: string,
  pluralUnitLabel?: string,
  labels?: Partial<OverageLabels>,
  locale?: string
): string | null {
  if (overageCents == null || overageCents < 0) return null;
  const l = { ...DEFAULT_OVERAGE_LABELS, ...labels };
  const unitSizeN = unitSize != null && unitSize >= 1 ? unitSize : 1;
  const symbol = getCurrencySymbol(currency);
  const amount = minorAmountToDisplay(overageCents, currency);
  if (unitLabel) {
    const plural = pluralUnitLabel ?? (unitLabel.endsWith('s') ? unitLabel : `${unitLabel}s`);
    if (unitSizeN >= 2) return `${symbol}${amount}/${unitSizeN.toLocaleString(locale)} ${plural}`;
    return `${symbol}${amount}/${unitLabel}`;
  }
  if (unitSizeN === 1) return `${symbol}${amount}/${l.unit}`;
  return `${symbol}${amount}/${unitSizeN.toLocaleString(locale)} ${l.units}`;
}

/**
 * Get singular unit label from item name or slug (e.g. "Videos" -> "video", "reels" -> "reel").
 * Used for quota display in comparison and preview.
 * Pass `fallback` for i18n unit fallback (default: "unit").
 */
export function getQuotaUnitLabelFromName(nameOrSlug: string, fallback = 'unit'): string {
  const raw = (nameOrSlug || '').trim().toLowerCase();
  if (!raw) return fallback;
  const word = raw.split(/\s+/)[0] ?? raw;
  // Words that are the same in singular and plural, or end in 's' naturally
  const invariant = new Set([
    'series',
    'species',
    'status',
    'analysis',
    'basis',
    'bus',
    'campus',
    'corpus',
    'axis',
  ]);
  if (invariant.has(word)) return word;
  if (word.endsWith('ies') && word.length > 3) return word.slice(0, -3) + 'y';
  if (
    word.endsWith('ses') ||
    word.endsWith('xes') ||
    word.endsWith('zes') ||
    word.endsWith('ches') ||
    word.endsWith('shes')
  ) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 1) return word.slice(0, -1);
  return word || fallback;
}

/**
 * Format quota "included + overage" for display.
 * Pass `labels` and `pluralUnitLabel` for i18n support, and `locale` to group
 * numbers in the display locale.
 */
export function formatQuotaIncludedOverage(
  included: number | undefined,
  overageCents: number | undefined,
  unitLabel: string,
  currency: string,
  unitSize?: number,
  pluralUnitLabel?: string,
  labels?: Partial<OverageLabels>,
  allowOverage?: boolean,
  locale?: string
): string {
  const l = { ...DEFAULT_OVERAGE_LABELS, ...labels };
  if (allowOverage === false) {
    if (included != null) return `${l.included}: ${included.toLocaleString(locale)} (${l.hardLimit})`;
    return l.hardLimit;
  }
  const plural = pluralUnitLabel ?? (unitLabel.endsWith('s') ? unitLabel : `${unitLabel}s`);
  const perUnit =
    unitSize != null && unitSize >= 2 ? `${unitSize.toLocaleString(locale)} ${plural}` : unitLabel;
  if (included != null && overageCents != null) {
    return `${l.included}: ${included.toLocaleString(locale)}, ${l.afterThat} ${formatCents(overageCents, currency)}/${perUnit}`;
  }
  if (included != null) return `${l.included}: ${included.toLocaleString(locale)}`;
  if (overageCents != null)
    return `${l.afterIncluded}: ${formatCents(overageCents, currency)}/${perUnit}`;
  return '\u2014';
}
