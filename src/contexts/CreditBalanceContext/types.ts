import type { ICreditBalance } from '../../api/types';

export interface CreditBalanceContextValue {
  /** Credit balance for the current workspace. Null if not loaded or no workspace. */
  balance: ICreditBalance | null;
  /** Whether the balance is being fetched. */
  loading: boolean;
  /** Error message if the fetch failed. */
  error: string | null;
  /** Manually refetch the credit balance. */
  refetch: () => Promise<void>;
}
