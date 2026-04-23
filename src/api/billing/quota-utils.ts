import type { BillingInterval, IQuotaByInterval } from '../types';
import { getCurrencySymbol } from './currency-utils';

export type QuotaDisplayValue = {
  included: number;
  overage?: number;
  unitSize?: number;
  allowOverage?: boolean;
} | null;

/**
 * Normalize a per-interval quota value to a display shape for the given billing interval.
 */
export function getQuotaDisplayValue(
  value: IQuotaByInterval | null | undefined,
  interval?: BillingInterval
): QuotaDisplayValue {
  if (value === null || value === undefined) return null;
  const key = interval ?? 'monthly';
  const slice = value[key];
  if (!slice) return null;
  return {
    included: slice.included,
    ...(slice.overage !== undefined && { overage: slice.overage }),
    ...(slice.unitSize !== undefined && { unitSize: slice.unitSize }),
    allowOverage: value.allowOverage !== false,
  };
}

/** Options for formatting quota with price. */
export interface FormatQuotaWithPriceOptions {
  /** If true, overage is in cents (Stripe); format as dollars. Default true. */
  overageInCents?: boolean;
  /** Currency symbol override. When omitted, derived from `currency` (empty if no currency). */
  currencySymbol?: string;
  /** Stripe currency code (e.g. 'usd', 'inr'). Used to resolve symbol when currencySymbol is not set. */
  currency?: string;
  /**
   * i18n labels for quota display. When provided, used instead of hardcoded English.
   * Callers in React components should pass translated strings from `t()`.
   */
  labels?: QuotaLabels;
}

/** Translatable labels for quota formatting */
export interface QuotaLabels {
  /** e.g. "included" — appended after count */
  included: string;
  /** e.g. "then" — separator between included and price */
  then: string;
}

const DEFAULT_LABELS: QuotaLabels = {
  included: 'included',
  then: 'then',
};

/**
 * Format a quota display value as "X included, then $Y.YY / unit".
 * Pass `labels` for i18n support.
 *
 * @example
 * formatQuotaWithPrice(value, 'videos', { currency: 'inr' })
 * // → "1 included, then ₹1.00 / 1,000 videos"
 *
 * formatQuotaWithPrice(value, 'वीडियो', { currency: 'inr', labels: { included: 'शामिल', then: 'फिर' } })
 * // → "1 शामिल, फिर ₹1.00 / 1,000 वीडियो"
 */
export function formatQuotaWithPrice(
  value: QuotaDisplayValue,
  unitName: string,
  options: FormatQuotaWithPriceOptions = {}
): string {
  const { overageInCents = true, currency } = options;
  const labels = options.labels ?? DEFAULT_LABELS;
  const currencySymbol = options.currencySymbol ?? getCurrencySymbol(currency ?? '');
  if (value === null || value === undefined) return '—';
  const { included, overage } = value;
  const includedStr = `${included} ${labels.included}`;
  if (value.allowOverage === false) return `${includedStr} (hard limit)`;
  if (overage === undefined || overage === null) return includedStr;
  const priceNum = overageInCents ? overage / 100 : overage;
  const price =
    typeof priceNum === 'number' && Number.isFinite(priceNum)
      ? priceNum.toFixed(2)
      : String(overage);
  const unit =
    unitName && 'unitSize' in value && value.unitSize != null && value.unitSize > 0
      ? ` / ${value.unitSize.toLocaleString()} ${unitName}`
      : unitName
        ? ` / ${unitName}`
        : '';
  return `${includedStr}, ${labels.then} ${currencySymbol}${price}${unit}`;
}

/** Structured quota data for i18n-aware formatting in components */
export interface QuotaDisplayParts {
  included: number;
  hasOverage: boolean;
  /** Whether over-usage is allowed. When false, quota is hard-capped. */
  allowOverage: boolean;
  price: string;
  unit: string;
}

/**
 * Extract structured parts from a quota value for i18n formatting.
 * Components use these parts with `t('quota.includedWithOverage', { count, price, unit })`.
 *
 * @param locale - BCP 47 locale for number formatting (e.g. 'hi' → ₹१.००, 'en' → ₹1.00)
 */
export function getQuotaDisplayParts(
  value: QuotaDisplayValue,
  unitName: string,
  options: {
    overageInCents?: boolean;
    currency?: string;
    currencySymbol?: string;
    locale?: string;
  } = {}
): QuotaDisplayParts | null {
  if (value === null || value === undefined) return null;
  const { overageInCents = true, currency, locale = 'en' } = options;
  const { included, overage } = value;

  const allowOverage = value.allowOverage !== false;
  if (!allowOverage) {
    return { included, hasOverage: false, allowOverage: false, price: '', unit: '' };
  }
  if (overage === undefined || overage === null) {
    return { included, hasOverage: false, allowOverage: true, price: '', unit: '' };
  }

  // Format price with locale-aware currency formatting
  const priceNum = overageInCents ? overage / 100 : overage;
  const currencyCode = (currency ?? '').trim().toUpperCase();
  let price: string;
  if (currencyCode && typeof priceNum === 'number' && Number.isFinite(priceNum)) {
    try {
      price = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(priceNum);
    } catch {
      const symbol = options.currencySymbol ?? getCurrencySymbol(currency ?? '');
      price = `${symbol}${priceNum.toFixed(2)}`;
    }
  } else {
    const symbol = options.currencySymbol ?? getCurrencySymbol(currency ?? '');
    price = `${symbol}${typeof priceNum === 'number' ? priceNum.toFixed(2) : String(overage)}`;
  }

  // Format unit size with locale-aware number formatting
  const unit =
    unitName && 'unitSize' in value && value.unitSize != null && value.unitSize > 0
      ? `${value.unitSize.toLocaleString(locale)} ${unitName}`
      : unitName || '';

  return { included, hasOverage: true, allowOverage: true, price, unit };
}
