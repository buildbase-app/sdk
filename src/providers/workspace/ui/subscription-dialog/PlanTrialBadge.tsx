import React from 'react';
import { IPlanVersionWithPlan } from '../../../../api/types';
import { useTranslation } from '../../../../i18n';

interface PlanTrialBadgeProps {
  planVersion: IPlanVersionWithPlan;
  /** Whether this plan is the workspace's current plan — badge is hidden for the current plan. */
  isCurrent: boolean;
  /** When set, workspace has used a trial — hide the badge. */
  trialUsedAt?: string | null;
  /** When set, workspace already has a Stripe subscription — hide the badge. */
  currentStripePriceId?: string | null;
}

/** Trial badge next to the plan name (shared by mobile plan cards and desktop table header). */
const PlanTrialBadge: React.FC<PlanTrialBadgeProps> = ({
  planVersion,
  isCurrent,
  trialUsedAt,
  currentStripePriceId,
}) => {
  const { t } = useTranslation();
  const trial = planVersion.trial;
  if (
    !trial?.enabled ||
    !(trial.durationDays > 0) ||
    isCurrent ||
    !!trialUsedAt ||
    !!currentStripePriceId
  ) {
    return null;
  }
  return (
    <span className="shrink-0 rounded-md bg-success/15 text-success px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
      {t('subscription.trialBadge', {
        days: trial.durationDays,
      })}
    </span>
  );
};

export default PlanTrialBadge;
