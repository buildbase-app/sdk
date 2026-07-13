import React from 'react';
import { BillingInterval } from '../../../../api/types';
import { useTranslation } from '../../../../i18n';

interface PlanPriceBlockProps {
  /** Whether the plan has a pricing variant for the effective currency. */
  hasVariant: boolean;
  /** Base price in cents for the selected interval (null when unavailable). */
  price: number | null;
  /** Currency used for display (see getDisplayCurrency). */
  displayCurrency: string;
  selectedInterval: BillingInterval;
  /** Resolves the localized interval suffix (e.g. "/month"). */
  getIntervalLabel: (interval: BillingInterval) => string;
}

/** Main price figure + interval suffix (shared by mobile plan cards and desktop table header). */
const PlanPriceBlock: React.FC<PlanPriceBlockProps> = ({
  hasVariant,
  price,
  displayCurrency,
  selectedInterval,
  getIntervalLabel,
}) => {
  const { t, fmtCents } = useTranslation();
  /** Format price in cents for display. Returns '' for 0/null. */
  const formatPrice = (priceInCents: number | undefined | null, currency: string): string => {
    if (priceInCents === undefined || priceInCents === null || priceInCents === 0) return '';
    return fmtCents(priceInCents, currency);
  };
  return (
    <>
      <span className="text-2xl font-bold text-foreground">
        {hasVariant && price !== null
          ? formatPrice(price, displayCurrency) || t('pricing.free')
          : '—'}
      </span>
      {price !== null && price > 0 && hasVariant && (
        <span className="text-sm text-muted-foreground">{getIntervalLabel(selectedInterval)}</span>
      )}
    </>
  );
};

export default PlanPriceBlock;
