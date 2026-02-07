import { getCurrencySymbol } from './currency-utils';
import type { BillingInterval, IQuotaByInterval } from './types';

export type QuotaDisplayValue = { included: number; overage?: number; unitSize?: number } | null;

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
}

/**
 * Format a quota display value as "X included, then $Y.YY / unit" (e.g. "10 included, then $10.00 / video").
 * Assumes overage is the per-unit price (in cents when overageInCents is true).
 */
export function formatQuotaWithPrice(
  value: QuotaDisplayValue,
  unitName: string,
  options: FormatQuotaWithPriceOptions = {}
): string {
  const { overageInCents = true, currency } = options;
  const currencySymbol = options.currencySymbol ?? getCurrencySymbol(currency ?? '');
  if (value === null || value === undefined) return '—';
  const { included, overage } = value;
  const includedStr = `${included} included`;
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
  return `${includedStr}, then ${currencySymbol}${price}${unit}`;
}
