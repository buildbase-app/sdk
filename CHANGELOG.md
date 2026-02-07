# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.19] - 2025-02-07

### Added

- **Multi-currency support**: New `currency-utils` with `CURRENCY_DISPLAY`, `CURRENCY_FLAG`, `PLAN_CURRENCY_CODES`, `PLAN_CURRENCY_OPTIONS`, `formatCents`, `formatOverageRate`, `formatOverageRateWithLabel`, `formatQuotaIncludedOverage`, `getCurrencyFlag`, `getCurrencySymbol`, `getQuotaUnitLabelFromName`.
- **Pricing variant utilities**: New `pricing-variant-utils` with `getPricingVariant`, `getBasePriceCents`, `getStripePriceIdForInterval`, `getQuotaOverageCents`, `getQuotaDisplayWithVariant`, `getAvailableCurrenciesFromPlans`, `getDisplayCurrency`, `getBillingIntervalAndCurrencyFromPriceId`; types `IPricingVariant`, `PlanVersionWithPricingVariants`, `QuotaDisplayWithOverage`.
- **API types**: `IPricingVariant`, `IStripePricesByInterval`, `IQuotaOveragesByInterval`, `IQuotaOveragePriceIdsByInterval`; plan/plan-version types now support `pricingVariants` and per-interval quotas.

### Changed

- **Plan and subscription types**: `IPlanVersion` uses `pricingVariants` (multi-currency) instead of single `basePricing`/`stripePrices`; `quotas` unified to `IQuotaByInterval`; `IQuotaIntervalValue` overage/priceId optional for public plans.
- **Public plans**: `IPublicPlanVersion` uses `pricingVariants` and `IQuotaByInterval`; removed `IPublicPlanPricing`, `IPublicPlanQuotaValue`; added `notes` to `IPublicPlansResponse`.
- **Workspace**: Refactored workspace hooks to simplify dependencies and state management; `SubscriptionDialog` and `SettingsSubscription` updated for multi-currency and new types; `SettingsGeneral` and `SettingsInvoices` adjustments.
- **Quota utils**: `quota-utils` API updates and alignment with pricing variant overage display.
- **Docs**: README added "Multi-Currency & Pricing Utilities" section and API reference for currency/pricing-variant/quota utilities; `ARCHITECTURE.md` documents API utilities and type exports; `ERROR_CODES.md` unchanged.

### Removed

- Legacy types: `IQuotaValue`, `IPublicPlanPricing`, `IPublicPlanQuotaValue` (replaced by pricing variants and `IQuotaByInterval`).
