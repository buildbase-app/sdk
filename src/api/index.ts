export type { IBetaConfig } from '../components/beta/api';

/** Central SDK APIs – all extend BaseApi for shared URL/auth/request handling. */
export { BaseApi } from '../lib/api-base';
export type { IBaseApiConfig } from '../lib/api-base';
export { SettingsApi } from '../providers/os/api';
export { UserApi } from '../providers/user/api';
export { WorkspaceApi } from '../providers/workspace/api';

/** Currency utilities */
export {
  CURRENCY_DISPLAY,
  CURRENCY_FLAG,
  PLAN_CURRENCY_CODES,
  PLAN_CURRENCY_OPTIONS,
  formatCents,
  formatOverageRate,
  formatOverageRateWithLabel,
  formatQuotaIncludedOverage,
  getCurrencyFlag,
  getCurrencySymbol,
  getQuotaUnitLabelFromName,
} from './currency-utils';

/** Pricing variant (multi-currency) utilities */
export {
  getAvailableCurrenciesFromPlans,
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getDisplayCurrency,
  getPricingVariant,
  getQuotaDisplayWithVariant,
  getQuotaOverageCents,
  getStripePriceIdForInterval,
} from './pricing-variant-utils';
export type {
  PlanVersionWithPricingVariants,
  QuotaDisplayWithOverage,
} from './pricing-variant-utils';
