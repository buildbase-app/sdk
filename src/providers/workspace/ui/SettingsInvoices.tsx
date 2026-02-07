import { Download, ExternalLink, FileText } from 'lucide-react';
import React from 'react';
import { IInvoice } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { useInvoices } from '../subscription-hooks';
import SettingSkeleton from './Skeleton';

// Helper function to format currency amount. Caller must pass currency (e.g. from invoice).
const formatCurrency = (amount: number, currency: string): string => {
  const c = (currency ?? '').trim();
  if (!c) return (amount / 100).toFixed(2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: c.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100); // Convert cents to dollars
};

// Helper function to format date
const formatDate = (timestamp: number | null): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper function to get invoice action button text and status color
const getInvoiceAction = (invoice: IInvoice) => {
  switch (invoice.status) {
    case 'draft':
    case 'open':
      return { text: 'Pay', color: 'bg-blue-600 hover:bg-blue-700' };
    case 'paid':
      return { text: 'View', color: 'bg-green-600 hover:bg-green-700' };
    case 'uncollectible':
    case 'void':
      return { text: 'View Details', color: 'bg-gray-600 hover:bg-gray-700' };
    default:
      return { text: 'View', color: 'bg-gray-600 hover:bg-gray-700' };
  }
};

// Helper function to get status badge color
const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'open':
      return 'bg-yellow-100 text-yellow-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'uncollectible':
      return 'bg-red-100 text-red-800';
    case 'void':
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
  const {
    invoices,
    loading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useInvoices(workspaceId, limit);

  const hasInvoices = invoices.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Billing History</h3>
          <p className="text-sm text-gray-600">View and download your invoices</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          progress={invoicesLoading}
          onClick={refetchInvoices}
          disabled={invoicesLoading}
        >
          {invoicesLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {invoicesError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Error loading invoices</p>
            <p className="text-sm mt-1">{invoicesError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchInvoices}
            disabled={invoicesLoading}
            className="flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            {invoicesLoading ? 'Retrying...' : 'Retry'}
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
            {hasActiveSubscription
              ? 'No invoices with download option found'
              : 'No invoices yet. Subscribe to a plan to receive invoices.'}
          </p>
          {!hasActiveSubscription && onViewPricingPlans && (
            <Button size="sm" className="mt-4" onClick={onViewPricingPlans}>
              View Pricing Plans
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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-gray-900">
                        {invoice.description || invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(invoice.amount_due, invoice.currency)}
                      </span>
                      {invoice.created && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>Created: {formatDate(invoice.created)}</span>
                        </>
                      )}
                      {invoice.due_date && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>Due: {formatDate(invoice.due_date)}</span>
                        </>
                      )}
                      {invoice.amount_paid > 0 && invoice.amount_due > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            Paid: {formatCurrency(invoice.amount_paid, invoice.currency)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() =>
                        window.open(invoice.hosted_invoice_url, '_blank', 'noopener,noreferrer')
                      }
                      className={action.color}
                    >
                      {action.text}
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                    {invoice.invoice_pdf && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(invoice.invoice_pdf!, '_blank', 'noopener,noreferrer')
                        }
                      >
                        <Download className="h-3 w-3 mr-1.5" />
                        PDF
                      </Button>
                    )}
                  </div>
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
