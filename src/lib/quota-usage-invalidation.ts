/**
 * Internal notifier for quota usage data invalidation.
 * When usage is recorded (via useRecordUsage), call invalidateQuotaUsage()
 * so QuotaUsageContextProvider refetches and gates stay in sync.
 */
import { createInvalidation } from './create-invalidation';

const manager = createInvalidation();

export const subscribeQuotaUsageInvalidate = manager.subscribe;
export const invalidateQuotaUsage = manager.invalidate;
export const resetQuotaUsageInvalidation = manager.reset;
