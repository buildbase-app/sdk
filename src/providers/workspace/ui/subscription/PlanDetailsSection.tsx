import React from 'react';
import { getQuotaDisplayWithVariant } from '../../../../api/billing/pricing-variant-utils';
import type { QuotaDisplayValue } from '../../../../api/billing/quota-utils';
import { getQuotaDisplayParts, getQuotaDisplayValue } from '../../../../api/billing/quota-utils';
import {
  BillingInterval,
  BillingIntervals,
  IPlanVersion,
  IPricingVariant,
  ISubscriptionItem,
  SubscriptionItemType,
} from '../../../../api/types';
import { useTranslation } from '../../../../i18n';

// Helper function to get plan details from subscriptionItems (optionally with currency for multi-currency quota overage)
const getPlanDetailsFromItems = (
  planVersion: IPlanVersion | null | undefined,
  currency?: string,
  interval: BillingInterval = BillingIntervals.Monthly
) => {
  if (!planVersion?.subscriptionItems) {
    return { features: [], limits: [], quotas: [] };
  }

  const features: Array<{ item: ISubscriptionItem; enabled: boolean }> = [];
  const limits: Array<{ item: ISubscriptionItem; value: number }> = [];
  const quotas: Array<{ item: ISubscriptionItem; value: QuotaDisplayValue }> = [];

  planVersion.subscriptionItems.forEach(item => {
    const slug = item.slug;

    if (item.type === SubscriptionItemType.Feature) {
      const enabled = planVersion.features?.[slug] ?? false;
      features.push({ item, enabled });
    } else if (item.type === SubscriptionItemType.Limit) {
      const value = planVersion.limits?.[slug] ?? 0;
      limits.push({ item, value });
    } else if (item.type === SubscriptionItemType.Quota) {
      const value =
        currency && planVersion.pricingVariants?.length
          ? getQuotaDisplayWithVariant(planVersion, currency, slug, interval)
          : getQuotaDisplayValue(planVersion.quotas?.[slug], interval);
      if (value !== null && value !== undefined) {
        quotas.push({ item, value });
      }
    }
  });

  return { features, limits, quotas };
};

export interface PlanDetailsSectionProps {
  planVersion: IPlanVersion;
  subscriptionCurrency: string;
  billingInterval: BillingInterval | null;
  seatPricingConfig: IPricingVariant['seatPricing'] | null;
  isPersonalMode: boolean;
  memberCount: number;
  includedSeats: number;
  billableSeats: number;
  perSeatPrice: number | null;
  intervalLabel: string;
}

export const PlanDetailsSection: React.FC<PlanDetailsSectionProps> = ({
  planVersion,
  subscriptionCurrency,
  billingInterval,
  seatPricingConfig,
  isPersonalMode,
  memberCount,
  includedSeats,
  billableSeats,
  perSeatPrice,
  intervalLabel,
}) => {
  const { t, formattingLocale, fmtNum, fmtCents } = useTranslation();

  const planDetails = getPlanDetailsFromItems(
    planVersion,
    subscriptionCurrency,
    billingInterval ?? 'monthly'
  );
  const hasDetails =
    planDetails.features.length > 0 ||
    planDetails.limits.length > 0 ||
    planDetails.quotas.length > 0;

  if (!hasDetails) return null;

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5 border-t border-border/60">
      <div className="space-y-5">
        {/* Features */}
        {planDetails.features.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('subscription.items.features')}
            </h4>
            <ul className="space-y-1.5">
              {planDetails.features
                .sort(a => (a.enabled ? -1 : 1))
                .map(({ item, enabled }) => (
                  <li key={item._id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-4 text-center shrink-0 ${enabled ? 'text-success' : 'text-muted-foreground/50'}`}
                    >
                      {enabled ? '✓' : '✕'}
                    </span>
                    <span className={enabled ? 'text-foreground' : 'text-muted-foreground/70'}>
                      {item.name}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Limits */}
        {planDetails.limits.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('subscription.items.limits')}
            </h4>
            <ul className="space-y-1.5">
              {planDetails.limits.map(({ item, value }) => (
                <li key={item._id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium text-foreground">{fmtNum(value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quotas */}
        {planDetails.quotas.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('subscription.items.quotas')}
            </h4>
            <ul className="space-y-1.5">
              {planDetails.quotas.map(({ item, value }) => {
                const parts = getQuotaDisplayParts(value, item.name.toLowerCase(), {
                  currency: subscriptionCurrency,
                  locale: formattingLocale,
                });
                const quotaDisplay = parts
                  ? parts.hasOverage
                    ? t('quota.includedWithOverage', {
                        count: parts.included,
                        price: parts.price,
                        unit: parts.unit,
                      })
                    : t('quota.includedOnly', { count: parts.included })
                  : '—';
                return (
                  <li key={item._id} className="text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium text-foreground text-xs sm:text-sm">
                        {quotaDisplay}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Seats — hidden in personal mode */}
        {seatPricingConfig && !isPersonalMode && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('subscription.seats.title')}
            </h4>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('subscription.seats.members')}</span>
                <span className="font-semibold text-foreground">{fmtNum(memberCount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('subscription.seats.included')}</span>
                <span className="text-foreground">{fmtNum(includedSeats)}</span>
              </div>
              {billableSeats > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('subscription.seats.billable')}</span>
                  <span className="font-medium text-warning">
                    {fmtNum(billableSeats)} {t('subscription.seats.extra')}
                  </span>
                </div>
              )}
              {perSeatPrice != null && perSeatPrice > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('subscription.seats.perExtraSeat')}
                  </span>
                  <span className="text-foreground">
                    {fmtCents(perSeatPrice, subscriptionCurrency)}
                    {intervalLabel}
                  </span>
                </div>
              )}
              {(seatPricingConfig?.maxSeats ?? 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('subscription.seats.limit')}</span>
                  <span className="text-foreground">{fmtNum(seatPricingConfig!.maxSeats!)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Credits */}
        {planVersion?.creditGrant?.enabled &&
          typeof planVersion.creditGrant.creditPackage === 'object' &&
          planVersion.creditGrant.creditPackage !== null && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('subscription.items.credits')}
              </h4>
              <div className="bg-info/10 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {planVersion.creditGrant.renewOnPeriod
                      ? t('subscription.items.creditsPerMonth')
                      : t('subscription.items.creditsOneTime')}
                  </span>
                  <span className="font-semibold text-info">
                    {fmtNum(
                      typeof planVersion.creditGrant.creditPackage === 'object'
                        ? planVersion.creditGrant.creditPackage.creditAmount
                        : 0
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('subscription.items.creditRenewal')}
                  </span>
                  <span className="font-medium text-foreground">
                    {!planVersion.creditGrant.renewOnPeriod
                      ? t('subscription.items.creditModeLifetime')
                      : planVersion.creditGrant.mode === 'reset'
                        ? t('subscription.items.creditModeReset')
                        : t('subscription.items.creditModeTopup')}
                  </span>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
