import React from 'react';
import { ISubscription, SubscriptionStatus } from '../../../../api/types';
import { useTranslation } from '../../../../i18n';

export interface SubscriptionStatusBadgeProps {
  subscription: ISubscription;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  subscription,
}) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        subscription.subscriptionStatus === SubscriptionStatus.Active
          ? subscription.cancelAtPeriodEnd
            ? 'bg-warning/15 text-warning'
            : 'bg-success/15 text-success'
          : subscription.subscriptionStatus === SubscriptionStatus.Trialing
            ? 'bg-info/15 text-info'
            : subscription.subscriptionStatus === SubscriptionStatus.Canceled
              ? 'bg-muted text-foreground'
              : 'bg-destructive/15 text-destructive'
      }`}
    >
      {subscription.subscriptionStatus === SubscriptionStatus.Active &&
        (subscription.cancelAtPeriodEnd
          ? t('subscription.status.canceling')
          : t('subscription.status.active'))}
      {subscription.subscriptionStatus === SubscriptionStatus.Trialing &&
        t('subscription.status.trial')}
      {subscription.subscriptionStatus === SubscriptionStatus.Canceled &&
        t('subscription.status.canceled')}
      {subscription.subscriptionStatus === SubscriptionStatus.PastDue &&
        t('subscription.status.pastDue')}
    </span>
  );
};
