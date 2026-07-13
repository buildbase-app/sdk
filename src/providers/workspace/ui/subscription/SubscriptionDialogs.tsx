import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { ISubscriptionResponse, SubscriptionStatus } from '../../../../api/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../components/ui/alert-dialog';
import { useTranslation } from '../../../../i18n';
import { formatPeriodEndDate } from './format';

export interface ResumeSubscriptionDialogProps {
  resumeDialogOpen: boolean;
  setResumeDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resumeLoading: boolean;
  handleResumeSubscription: () => Promise<void>;
  subscription: ISubscriptionResponse | null;
}

export const ResumeSubscriptionDialog: React.FC<ResumeSubscriptionDialogProps> = ({
  resumeDialogOpen,
  setResumeDialogOpen,
  resumeLoading,
  handleResumeSubscription,
  subscription,
}) => {
  const { t, formattingLocale } = useTranslation();
  return (
    <AlertDialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('subscription.resumeTitle')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{t('subscription.resumeConfirm')}</p>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <span>
                    {t('subscription.resumeChargeDate')}{' '}
                    {subscription?.subscription?.stripeCurrentPeriodEnd &&
                    formatPeriodEndDate(
                      formattingLocale,
                      subscription.subscription.stripeCurrentPeriodEnd
                    ) ? (
                      <span className="font-medium">
                        {formatPeriodEndDate(
                          formattingLocale,
                          subscription.subscription.stripeCurrentPeriodEnd
                        )}
                      </span>
                    ) : (
                      t('subscription.resumeChargeFallback')
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span>{t('subscription.resumeContinue')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-info mt-0.5">ℹ</span>
                  <span>{t('subscription.resumeCancelAnytime')}</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resumeLoading}>
            {t('subscription.resumeKeep')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleResumeSubscription} disabled={resumeLoading}>
            {resumeLoading ? t('subscription.resuming') : t('subscription.resumeButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export interface CancelSubscriptionDialogProps {
  cancelDialogOpen: boolean;
  setCancelDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  cancelLoading: boolean;
  handleCancelSubscription: () => Promise<void>;
  subscription: ISubscriptionResponse | null;
}

export const CancelSubscriptionDialog: React.FC<CancelSubscriptionDialogProps> = ({
  cancelDialogOpen,
  setCancelDialogOpen,
  cancelLoading,
  handleCancelSubscription,
  subscription,
}) => {
  const { t, formattingLocale } = useTranslation();
  const isTrialing = subscription?.subscription?.subscriptionStatus === SubscriptionStatus.Trialing;
  const endDate = isTrialing
    ? subscription?.subscription?.trialEnd || subscription?.subscription?.stripeCurrentPeriodEnd
    : subscription?.subscription?.stripeCurrentPeriodEnd;

  return (
    <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isTrialing ? t('subscription.cancelTrialTitle') : t('subscription.cancelTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {isTrialing
                  ? t('subscription.cancelTrialConfirm')
                  : t('subscription.cancelConfirm')}
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>
                    {isTrialing
                      ? t('subscription.cancelTrialAccess')
                      : t('subscription.retainAccess')}{' '}
                    {endDate && formatPeriodEndDate(formattingLocale, endDate) ? (
                      <span className="font-medium">
                        {formatPeriodEndDate(formattingLocale, endDate)}
                      </span>
                    ) : (
                      t('subscription.retainAccessFallback')
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>
                    {isTrialing
                      ? t('subscription.cancelTrialNoCharge')
                      : t('subscription.cancelNotCharged')}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-info mt-0.5">ℹ</span>
                  <span>
                    {isTrialing
                      ? t('subscription.cancelTrialResume')
                      : t('subscription.cancelResumeAnytime')}
                  </span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelLoading}>
            {isTrialing ? t('subscription.cancelTrialKeep') : t('subscription.cancelKeep')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancelSubscription}
            disabled={cancelLoading}
            className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
          >
            {cancelLoading
              ? t('subscription.canceling')
              : isTrialing
                ? t('subscription.cancelTrialButton')
                : t('subscription.cancelButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
