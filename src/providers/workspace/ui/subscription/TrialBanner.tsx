import React from 'react';
import { ISubscription } from '../../../../api/types';
import { Button } from '../../../../components/ui/button';
import { useTranslation } from '../../../../i18n';

export interface TrialBannerProps {
  subscription: ISubscription;
  showChangePlan: boolean;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  subscription,
  showChangePlan,
  setDialogOpen,
}) => {
  const { t } = useTranslation();
  const trialEndStr = subscription.trialEnd || subscription.stripeCurrentPeriodEnd;
  const trialEndRaw = trialEndStr ? new Date(trialEndStr) : null;
  const trialEnd = trialEndRaw && !isNaN(trialEndRaw.getTime()) ? trialEndRaw : null;
  const daysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const isUrgent = daysRemaining !== null && daysRemaining <= 3;
  return (
    <div
      className={`px-4 py-3 sm:px-5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isUrgent ? 'bg-warning/10 text-warning border-b border-warning/30' : 'bg-info/10 text-info border-b border-info/20'}`}
    >
      <span>
        {daysRemaining !== null && daysRemaining <= 0
          ? t('subscription.trialEnded')
          : daysRemaining !== null
            ? t('subscription.trialEndsIn', { days: daysRemaining })
            : t('subscription.onTrial')}{' '}
        {t('subscription.upgradeToKeepAccess')}
      </span>
      {showChangePlan && (
        <Button
          size="sm"
          variant={isUrgent ? 'default' : 'outline'}
          className={`shrink-0 ${isUrgent ? '' : 'border-info/30 text-info hover:bg-info/15'}`}
          onClick={() => setDialogOpen(true)}
        >
          {t('subscription.upgradePlan')}
        </Button>
      )}
    </div>
  );
};
