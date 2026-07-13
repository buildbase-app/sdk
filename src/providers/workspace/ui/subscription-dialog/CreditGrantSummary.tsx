import React from 'react';
import { IPlanVersionWithPlan } from '../../../../api/types';
import { useTranslation } from '../../../../i18n';
import { getCreditRenewalModeKey } from './utils';

interface CreditGrantSummaryProps {
  planVersion: IPlanVersionWithPlan;
}

/**
 * Credit-grant summary block for the mobile plan card.
 * Renders nothing when the plan grants no credits (or the credit package is not populated).
 */
const CreditGrantSummary: React.FC<CreditGrantSummaryProps> = ({ planVersion }) => {
  const { t, fmtNum } = useTranslation();
  const creditGrant = planVersion.creditGrant;
  if (
    !creditGrant?.enabled ||
    typeof creditGrant.creditPackage !== 'object' ||
    creditGrant.creditPackage === null
  ) {
    return null;
  }
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-info uppercase tracking-wider mb-1.5">
        {t('subscription.items.credits')}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {creditGrant.renewOnPeriod
              ? t('subscription.items.creditsPerMonth')
              : t('subscription.items.creditsOneTime')}
          </span>
          <span className="font-semibold text-info">
            {fmtNum(creditGrant.creditPackage.creditAmount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('subscription.items.creditRenewal')}</span>
          <span className="font-medium text-foreground">
            {t(getCreditRenewalModeKey(creditGrant))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreditGrantSummary;
