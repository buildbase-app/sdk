import React, { useMemo, useState } from 'react';
import { Coins } from 'lucide-react';
import { getCurrencySymbol } from '../../../api/billing/currency-utils';
import type { ICreditPackage } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useTranslation } from '../../../i18n';
import { cn } from '../../../lib/utils';

interface CreditPackagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: ICreditPackage[];
  billingCurrency?: string | null;
  workspaceName?: string;
  onSelectPackage: (pkg: ICreditPackage) => void;
  purchasingPackageId?: string | null;
  loading?: boolean;
}

const CreditPackagesDialog: React.FC<CreditPackagesDialogProps> = ({
  open,
  onOpenChange,
  packages,
  billingCurrency: workspaceBillingCurrency,
  workspaceName,
  onSelectPackage,
  purchasingPackageId,
  loading: isUpdating = false,
}) => {
  const { t, dir, fmtNum, fmtCents } = useTranslation();

  const allCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    packages.forEach(pkg => {
      pkg.pricingVariants?.forEach(v => {
        if (v.currency) currencies.add(v.currency.toLowerCase());
      });
    });
    return Array.from(currencies);
  }, [packages]);

  const availableCurrencies = useMemo(() => {
    const locked = workspaceBillingCurrency?.trim().toLowerCase();
    if (locked) {
      return allCurrencies.includes(locked) ? [locked] : [];
    }
    return allCurrencies;
  }, [workspaceBillingCurrency, allCurrencies]);

  const [selectedCurrency, setSelectedCurrency] = useState<string>(() =>
    availableCurrencies.length > 0 ? availableCurrencies[0]! : ''
  );

  const effectiveCurrency = workspaceBillingCurrency?.trim().toLowerCase() || selectedCurrency;
  const isLoading = isUpdating || !!purchasingPackageId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        className="inset-0 w-screen h-screen max-w-none rounded-none translate-x-0 translate-y-0 p-0 flex flex-col"
      >
        {/* Header — fixed */}
        <div className="flex-shrink-0 px-4 py-4 sm:px-6 sm:py-6 border-b space-y-3 sm:space-y-4">
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {t('credits.dialogTitle')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {t('credits.dialogDescription')}
              {workspaceName && (
                <span className="ms-1 font-medium text-foreground">
                  {t('credits.dialogDescriptionWorkspace', { workspace: workspaceName })}
                </span>
              )}
            </DialogDescription>
          </div>

          {/* Currency selector */}
          {!workspaceBillingCurrency?.trim() && availableCurrencies.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{t('pricing.currency')}</span>
              <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50/50 p-1">
                {availableCurrencies.map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedCurrency(code)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      effectiveCurrency === code
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {getCurrencySymbol(code)} {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable package list — vertical layout */}
        <div className="flex-1 overflow-y-auto">
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Coins className="h-12 w-12 mb-3" />
              <p className="text-sm">{t('credits.noPackages')}</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-4">
              {packages.map(pkg => {
                const variant =
                  pkg.pricingVariants?.find(
                    v => v.currency?.toLowerCase() === effectiveCurrency
                  ) ?? pkg.pricingVariants?.[0];
                const price = variant?.amount;
                const variantCurrency = variant?.currency ?? effectiveCurrency;
                const isPurchasing = purchasingPackageId === pkg._id;
                const perCredit =
                  price != null && price > 0 && pkg.creditAmount > 0
                    ? Math.round(price / pkg.creditAmount)
                    : null;

                return (
                  <div
                    key={pkg._id}
                    className={cn(
                      'rounded-xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-all',
                      isPurchasing
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    )}
                  >
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          <Coins className="h-3 w-3" />
                          {t('credits.creditsAmount', { count: fmtNum(pkg.creditAmount) })}
                        </span>
                      </div>
                      {pkg.description && (
                        <p className="text-sm text-gray-500 mb-2">{pkg.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>
                          {pkg.validityDays
                            ? t('credits.validityDays', { count: pkg.validityDays })
                            : t('credits.validityUnlimited')}
                        </span>
                        {perCredit != null && (
                          <span>
                            {t('credits.perCredit', {
                              price: fmtCents(perCredit, variantCurrency),
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: price + button */}
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2 shrink-0">
                      {price != null && (
                        <span className="text-2xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">
                          {fmtCents(price, variantCurrency)}
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => onSelectPackage(pkg)}
                        disabled={isLoading}
                        progress={isPurchasing}
                        className="whitespace-nowrap"
                      >
                        {isPurchasing
                          ? t('credits.purchasing')
                          : t('credits.buyAmount', { count: fmtNum(pkg.creditAmount) })}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditPackagesDialog;
