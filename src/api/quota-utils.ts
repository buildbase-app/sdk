import type { BillingInterval, IQuotaByInterval, IQuotaValue } from './types';

export type QuotaDisplayValue =
  | { included: number; overage?: number; unitSize?: number }
  | number
  | null;

/**
 * Normalize a quota value (legacy or per-interval) to a display shape for a given billing interval.
 * - Legacy: number or IQuotaValue → use as-is (interval ignored).
 * - New schema: IQuotaByInterval → pick the interval slice (e.g. monthly, yearly, quarterly).
 */
export function getQuotaDisplayValue(
  value: number | IQuotaValue | IQuotaByInterval | null | undefined,
  interval?: BillingInterval
): QuotaDisplayValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  // New schema: per-interval quotas (IQuotaByInterval)
  if ('monthly' in value || 'yearly' in value || 'quarterly' in value) {
    const key = interval ?? 'monthly';
    const slice = value[key];
    if (!slice) return null;
    return {
      included: slice.included,
      overage: slice.overage,
      ...(slice.unitSize !== undefined && { unitSize: slice.unitSize }),
    };
  }
  // Legacy IQuotaValue (has included at top level)
  const legacy = value as IQuotaValue;
  return { included: legacy.included, overage: legacy.overage };
}

/** Options for formatting quota with price. */
export interface FormatQuotaWithPriceOptions {
  /** If true, overage is in cents (Stripe); format as dollars. Default true. */
  overageInCents?: boolean;
  /** Currency symbol. Default '$'. */
  currencySymbol?: string;
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
  const { overageInCents = true, currencySymbol = '$' } = options;
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return `${value} included`;
  const { included, overage } = value;
  const includedStr = `${included} included`;
  if (overage === undefined || overage === null) return includedStr;
  const priceNum = overageInCents ? overage / 100 : overage;
  const price = typeof priceNum === 'number' && Number.isFinite(priceNum) ? priceNum.toFixed(2) : String(overage);
  const unit =
    unitName && 'unitSize' in value && value.unitSize != null && value.unitSize > 0
      ? ` / ${value.unitSize.toLocaleString()} ${unitName}`
      : unitName
        ? ` / ${unitName}`
        : '';
  return `${includedStr}, then ${currencySymbol}${price}${unit}`;
}
