import type { IQuotaUsageStatus } from '../../api/types';

/**
 * Value provided by QuotaUsageContext and returned by useQuotaUsageContext.
 */
export interface QuotaUsageContextValue {
  /** Current quota usage statuses keyed by slug, or null if not loaded. */
  quotas: Record<string, IQuotaUsageStatus> | null;
  /** True while quota usage is being fetched. */
  loading: boolean;
  /** Error message if the last fetch failed, or null. */
  error: string | null;
  /** Refetch all quota usage for the current workspace. Call after recording usage or when usage was updated elsewhere. */
  refetch: () => Promise<void>;
}
