import type { ISubscriptionResponse } from '../../api/types';

/**
 * Value provided by SubscriptionContext and returned by useSubscriptionContext.
 */
export interface SubscriptionContextValue {
  /** Current subscription response for the current workspace, or null if none or not loaded. */
  response: ISubscriptionResponse | null;
  /** True while subscription is being fetched. */
  loading: boolean;
  /** Error message if the last fetch failed, or null. */
  error: string | null;
  /** Refetch subscription for the current workspace. Call after plan change (e.g. upgrade) or when subscription was updated elsewhere. */
  refetch: () => Promise<void>;
}
