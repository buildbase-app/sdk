/**
 * @buildbase/sdk — Core module
 *
 * Framework-agnostic foundation shared by both server and React entry points.
 * Contains: API classes, types, utilities, event emitter.
 * Zero React dependencies. Zero Node.js dependencies. Runs anywhere.
 *
 * Architecture:
 *   core.ts         → API classes, types, utils (this file)
 *   index.ts        → Server entry = core + BuildBase() factory
 *   react.ts        → React entry  = core types + hooks, providers, components
 */

// ─── API Classes ───────────────────────────────────────────────────────────────
// These are the low-level HTTP clients. Framework-agnostic, no React.
// Both server (BuildBase factory) and React (hooks) use these internally.

export { BaseApi } from './lib/api-base';
export type { IBaseApiConfig } from './lib/api-base';
export { AuthApi, BetaForm, PushApi, SettingsApi, UserApi, WorkspaceApi } from './api/services';
export type { IBetaConfig } from './api/services';

// ─── API Version & Config ──────────────────────────────────────────────────────

export { ApiVersion } from './providers/os/types';
export type { IOsConfig, IOsState } from './providers/os/types';

// ─── Event Emitter ─────────────────────────────────────────────────────────────

export { EventEmitter, eventEmitter } from './providers/events';
export type {
  EventData,
  EventType,
  IEventCallbacks,
  UserCreatedEventData,
  UserUpdatedEventData,
  WorkspaceChangedEventData,
  WorkspaceCreatedEventData,
  WorkspaceDeletedEventData,
  WorkspaceUpdatedEventData,
  WorkspaceUserAddedEventData,
  WorkspaceUserRemovedEventData,
  WorkspaceUserRoleChangedEventData,
} from './providers/events/types';

// ─── Invalidation ──────────────────────────────────────────────────────────────

export { invalidateSubscription } from './lib/subscription-invalidation';
export { invalidateQuotaUsage } from './lib/quota-usage-invalidation';

// ─── URL Params ────────────────────────────────────────────────────────────────

export {
  createBBUrl,
  createCheckoutRedirectUrls,
  readBBParams,
  cleanBBParams,
  BB_PARAM,
} from './lib/url-params';

// ─── Security ──────────────────────────────────────────────────────────────────

export { validateRedirectUrl, safeRedirect } from './lib/security';

// ─── Billing Utilities (currency, pricing, quotas) ─────────────────────────────

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
} from './api/billing/currency-utils';

export { formatQuotaWithPrice, getQuotaDisplayValue } from './api/billing/quota-utils';
export type { FormatQuotaWithPriceOptions, QuotaDisplayValue } from './api/billing/quota-utils';

export {
  calculateBillableSeats,
  calculateSeatOverageCents,
  calculateTotalSubscriptionCents,
  getAvailableCurrenciesFromPlans,
  getBasePriceCents,
  getBillingIntervalAndCurrencyFromPriceId,
  getDisplayCurrency,
  getPerSeatPriceCents,
  getPricingVariant,
  getQuotaDisplayWithVariant,
  getQuotaOverageCents,
  getSeatPricing,
  getStripePriceIdForInterval,
  resolveMaxUsers,
  validateInvite,
} from './api/billing/pricing-variant-utils';
export type {
  InviteBlockReason,
  InviteValidation,
  MaxUsersConfig,
  PlanVersionWithPricingVariants,
  QuotaDisplayWithOverage,
} from './api/billing/pricing-variant-utils';

// ─── Push Notification (service worker template) ───────────────────────────────

export { PUSH_SERVICE_WORKER_SCRIPT } from './providers/push/service-worker-template';

// ─── Beta types (schema moved to @buildbase/sdk/data to avoid Zod in server bundle) ──
export type { BetaFormData, BetaFormResponse } from './api/beta/types';

// ─── Auth Types ────────────────────────────────────────────────────────────────

export { AuthStatus } from './providers/auth/types';
export type { OnWorkspaceChangeParams } from './providers/auth/types';

// ─── Domain Types ──────────────────────────────────────────────────────────────

export type {
  BillingInterval,
  CheckoutResult,
  IAllQuotaUsageResponse,
  IBasePricing,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IInvoice,
  IInvoiceListResponse,
  IInvoiceResponse,
  IPlan,
  IPlanGroup,
  IPlanGroupInfo,
  IPlanGroupLatestVersion,
  IPlanGroupResponse,
  IPlanGroupVersion,
  IPlanGroupVersionWithPlans,
  IPlanGroupVersionsResponse,
  IPlanVersion,
  IPlanVersionSummary,
  IPlanVersionWithPlan,
  IPricingVariant,
  IPublicPlanItem,
  IPublicPlanItemCategory,
  IPublicPlanVersion,
  IPublicPlansResponse,
  IQuotaByInterval,
  IQuotaIntervalValue,
  IQuotaOveragePriceIdsByInterval,
  IQuotaOveragesByInterval,
  IQuotaUsageStatus,
  IQuotaUsageStatusResponse,
  IRecordUsageRequest,
  IRecordUsageResponse,
  IStripePricesByInterval,
  ISubscription,
  ISubscriptionItem,
  ISubscriptionResponse,
  ISubscriptionUpdateRequest,
  ISubscriptionUpdateResponse,
  IUsageLogEntry,
  IUsageLogsQuery,
  IUsageLogsResponse,
  InvoiceStatus,
} from './api/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

export {
  BillingIntervals,
  SubscriptionStatus,
  InvoiceStatuses,
  SubscriptionItemType,
  DunningState,
} from './api/types';
export type { SubscriptionStatusType } from './api/types';

export { SDKEvent } from './providers/events/types';
