import { Download, ExternalLink, FileText } from 'lucide-react';
import React from 'react';
import { formatMinorAmountIntl } from '../../../api/billing/currency-utils';
import { IInvoice, InvoiceStatuses } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { SectionHeader } from '../../../components/ui/section-header';
import { StatusBanner } from '../../../components/ui/status-banner';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { Permission } from '../../../lib/permissions';
import { useInvoices } from '../subscription-hooks';
import NoPermission from './NoPermission';
import SettingSkeleton from './Skeleton';

import { formatUnixDate as formatDate } from '../../../lib/format-utils';

// Helper function to get invoice action button text and status color
const getInvoiceAction = (invoice: IInvoice) => {
  switch (invoice.status) {
    case InvoiceStatuses.Draft:
    case InvoiceStatuses.Open:
      return { textKey: 'invoices.pay', color: 'bg-info text-info-foreground hover:bg-info/90' };
    case InvoiceStatuses.Paid:
      return {
        textKey: 'invoices.view',
        color: 'bg-success text-success-foreground hover:bg-success/90',
      };
    case InvoiceStatuses.Uncollectible:
    case InvoiceStatuses.Void:
      return {
        textKey: 'invoices.viewDetails',
        color: 'bg-muted-foreground text-background hover:bg-muted-foreground/90',
      };
    default:
      return {
        textKey: 'invoices.view',
        color: 'bg-muted-foreground text-background hover:bg-muted-foreground/90',
      };
  }
};

// Helper function to get status badge color
const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case InvoiceStatuses.Paid:
      return 'bg-success/15 text-success';
    case InvoiceStatuses.Open:
      return 'bg-warning/15 text-warning';
    case InvoiceStatuses.Draft:
      return 'bg-muted text-foreground';
    case InvoiceStatuses.Uncollectible:
      return 'bg-destructive/15 text-destructive';
    case InvoiceStatuses.Void:
      return 'bg-muted text-foreground';
    default:
      return 'bg-muted text-foreground';
  }
};

export interface WorkspaceSettingsInvoicesProps {
  workspaceId: string | null | undefined;
  /** Whether the user has an active subscription */
  hasActiveSubscription?: boolean;
  /** Callback when user clicks View Pricing Plans (e.g., switch to Plan tab) */
  onViewPricingPlans?: () => void;
  /** Number of invoices to fetch (default: 20) */
  limit?: number;
}

const WorkspaceSettingsInvoices: React.FC<WorkspaceSettingsInvoicesProps> = ({
  workspaceId,
  hasActiveSubscription = false,
  onViewPricingPlans,
  limit = 20,
}) => {
  const { t, formattingLocale } = useTranslation();
  const { can } = usePermissions();
  const canViewBilling = can(Permission.WORKSPACE_BILLING_VIEW);
  const {
    invoices,
    loading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useInvoices(workspaceId, limit);

  if (!canViewBilling) return <NoPermission />;

  const hasInvoices = invoices.length > 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('invoices.title')}
        description={t('invoices.description')}
        actions={
          <Button
            variant="ghost"
            size="sm"
            progress={invoicesLoading}
            onClick={refetchInvoices}
            disabled={invoicesLoading}
          >
            {t('settings.common.refreshAction', { loading: String(invoicesLoading) })}
          </Button>
        }
      />

      {invoicesError && (
        <StatusBanner
          variant="error"
          title={t('invoices.errorLoading')}
          message={invoicesError}
          actionLabel={t('settings.common.retryAction', { loading: String(invoicesLoading) })}
          onAction={refetchInvoices}
          actionDisabled={invoicesLoading}
        />
      )}

      {invoicesLoading && !hasInvoices ? (
        <div className="border rounded-lg p-6">
          <SettingSkeleton />
        </div>
      ) : !hasInvoices ? (
        <EmptyState
          icon={<FileText className="h-5 w-5 text-muted-foreground" />}
          description={
            hasActiveSubscription ? t('invoices.noInvoicesWithSub') : t('invoices.noInvoices')
          }
          action={
            !hasActiveSubscription && onViewPricingPlans ? (
              <Button size="sm" className="mt-2" onClick={onViewPricingPlans}>
                {t('subscription.viewPricingPlans')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {invoices.map(invoice => {
            const action = getInvoiceAction(invoice);
            return (
              <div
                key={invoice.id}
                className="border rounded-md bg-background hover:shadow-sm transition-shadow p-3"
              >
                {/* Top: invoice ID + status badge */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium text-foreground truncate min-w-0">
                    {invoice.description || invoice.number || invoice.id.slice(-8)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusBadgeColor(
                      invoice.status
                    )}`}
                  >
                    {t(`invoices.status.${invoice.status}` as TranslationKey)}
                  </span>
                </div>

                {/* Middle: amount + date — wrap on mobile */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mb-2.5">
                  <span className="font-medium text-foreground">
                    {formatMinorAmountIntl(invoice.amount_due, invoice.currency, formattingLocale)}
                  </span>
                  {invoice.created && (
                    <>
                      <span className="text-muted-foreground/50 hidden sm:inline">·</span>
                      <span>{formatDate(invoice.created, formattingLocale)}</span>
                    </>
                  )}
                  {invoice.amount_paid > 0 && invoice.amount_due > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t('invoices.paidAmount', {
                        amount: formatMinorAmountIntl(
                          invoice.amount_paid,
                          invoice.currency,
                          formattingLocale
                        ),
                      })}
                    </span>
                  )}
                </div>

                {/* Bottom: action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={!invoice.hosted_invoice_url}
                    onClick={() =>
                      invoice.hosted_invoice_url &&
                      window.open(invoice.hosted_invoice_url, '_blank', 'noopener,noreferrer')
                    }
                    className={action.color}
                  >
                    {t(action.textKey as TranslationKey)}
                    <ExternalLink className="h-3.5 w-3.5 ms-1.5" />
                  </Button>
                  {invoice.invoice_pdf && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(invoice.invoice_pdf!, '_blank', 'noopener,noreferrer')
                      }
                    >
                      <Download className="h-3.5 w-3.5 me-1.5" />
                      {t('invoices.download')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsInvoices;
