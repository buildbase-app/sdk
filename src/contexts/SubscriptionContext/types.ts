import type { ISubscriptionResponse } from '../../api/types';

export interface SubscriptionContextValue {
  response: ISubscriptionResponse | null;
  loading: boolean;
  /** Refetch subscription for the current workspace. Call after plan change (e.g. upgrade) or when subscription was updated elsewhere. */
  refetch: () => Promise<void>;
}
