import { Download, ExternalLink, FileText } from 'lucide-react';
import React from 'react';
import { IInvoice, InvoiceStatuses } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { Permission } from '../../../lib/permissions';
import { useInvoices } from '../subscription-hooks';
import NoPermission from './NoPermission';
import SettingSkeleton from './Skeleton';

// Helper function to format currency amount. Caller must pass currency and locale.
const formatCurrency = (amount: number, currency: string, locale = 'en-US'): string => {
  const c = (currency ?? '').trim();
  if (!c) return (amount / 100).toFixed(2);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: c.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
};

import { formatUnixDate as formatDate } from '../../../lib/format-utils';

// Helper function to get invoice action button text and status color
const getInvoiceAction = (invoice: IInvoice) => {
  switch (invoice.status) {
    case InvoiceStatuses.Draft:
    case InvoiceStatuses.Open:
      return { textKey: 'invoices.pay', color: 'bg-blue-600 hover:bg-blue-700' };
    case InvoiceStatuses.Paid:
      return { textKey: 'invoices.view', color: 'bg-green-600 hover:bg-green-700' };
    case InvoiceStatuses.Uncollectible:
    case InvoiceStatuses.Void:
      return { textKey: 'invoices.viewDetails', color: 'bg-gray-600 hover:bg-gray-700' };
    default:
      return { textKey: 'invoices.view', color: 'bg-gray-600 hover:bg-gray-700' };
  }
};

// Helper function to get status badge color
const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case InvoiceStatuses.Paid:
      return 'bg-green-100 text-green-800';
    case InvoiceStatuses.Open:
      return 'bg-yellow-100 text-yellow-800';
    case InvoiceStatuses.Draft:
      return 'bg-gray-100 text-gray-800';
    case InvoiceStatuses.Uncollectible:
      return 'bg-red-100 text-red-800';
    case InvoiceStatuses.Void:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export interface SettingsInvoicesProps {
  workspaceId: string | null | undefined;
  /** Whether the user has an active subscription */
  hasActiveSubscription?: boolean;
  /** Callback when user clicks View Pricing Plans (e.g., switch to Plan tab) */
  onViewPricingPlans?: () => void;
  /** Number of invoices to fetch (default: 20) */
  limit?: number;
}

const SettingsInvoices: React.FC<SettingsInvoicesProps> = ({
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('invoices.title')}</h3>
          <p className="text-sm text-gray-600">{t('invoices.description')}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          progress={invoicesLoading}
          onClick={refetchInvoices}
          disabled={invoicesLoading}
        >
          {t('settings.common.refreshAction', { loading: String(invoicesLoading) })}
        </Button>
      </div>

      {invoicesError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{t('invoices.errorLoading')}</p>
            <p className="text-sm mt-1">{invoicesError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchInvoices}
            disabled={invoicesLoading}
            className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            {t('settings.common.retryAction', { loading: String(invoicesLoading) })}
          </Button>
        </div>
      )}

      {invoicesLoading && !hasInvoices ? (
        <div className="border rounded-lg p-6">
          <SettingSkeleton />
        </div>
      ) : !hasInvoices ? (
        <div className="border rounded-lg p-6 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">
            {hasActiveSubscription ? t('invoices.noInvoicesWithSub') : t('invoices.noInvoices')}
          </p>
          {!hasActiveSubscription && onViewPricingPlans && (
            <Button size="sm" className="mt-4" onClick={onViewPricingPlans}>
              {t('subscription.viewPricingPlans')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(invoice => {
            const action = getInvoiceAction(invoice);
            return (
              <div
                key={invoice.id}
                className="border rounded-lg bg-white hover:shadow-sm transition-shadow p-3"
              >
                {/* Top: invoice ID + status badge */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate min-w-0">
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-600 mb-2.5">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(invoice.amount_due, invoice.currency, formattingLocale)}
                  </span>
                  {invoice.created && (
                    <>
                      <span className="text-gray-300 hidden sm:inline">·</span>
                      <span>{formatDate(invoice.created, formattingLocale)}</span>
                    </>
                  )}
                  {invoice.amount_paid > 0 && invoice.amount_due > 0 && (
                    <span className="text-xs text-gray-500">
                      {t('invoices.paidAmount', {
                        amount: formatCurrency(
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
                    <ExternalLink className="h-3 w-3 ms-1.5" />
                  </Button>
                  {invoice.invoice_pdf && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(invoice.invoice_pdf!, '_blank', 'noopener,noreferrer')
                      }
                    >
                      <Download className="h-3 w-3 me-1.5" />
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

export default SettingsInvoices;
