export { CreditActionsProvider } from './CreditActions';
export type { CreditActionsDetails, CreditActionsProviderProps } from './CreditActions';

export { CreditBalance } from './CreditBalance';
export type { CreditBalanceDetails, CreditBalanceProps } from './CreditBalance';

export { CreditStorePage } from './CreditStorePage';
export type { CreditStorePageDetails, CreditStorePageProps } from './CreditStorePage';

import { useCreditBalanceContext } from '../../contexts/CreditBalanceContext';

interface IWhenCreditsProps {
  /** Content to render when the condition is met. */
  children: React.ReactNode;
  /** Optional component/element to show while credit balance is loading (e.g. <Skeleton />). */
  loadingComponent?: React.ReactNode;
  /** Optional component/element to show when condition is not met (e.g. <BuyCreditsPrompt />). */
  fallbackComponent?: React.ReactNode;
}

interface IWhenCreditsAvailableProps extends IWhenCreditsProps {
  /** Minimum credits required to render children. Default: 1 */
  min?: number;
}

interface IWhenCreditsLowProps extends IWhenCreditsProps {
  /** Credits threshold. Children render when available <= threshold. */
  threshold: number;
}

/**
 * Renders children only when the workspace has at least `min` credits available.
 * Must be used within CreditBalanceContextProvider (included in SaaSOSProvider by default).
 *
 * @example
 * ```tsx
 * <WhenCreditsAvailable min={10}>
 *   <GenerateButton />
 * </WhenCreditsAvailable>
 * ```
 *
 * @example
 * ```tsx
 * <WhenCreditsAvailable
 *   min={5}
 *   loadingComponent={<Skeleton />}
 *   fallbackComponent={<p>Not enough credits. <BuyCreditsLink /></p>}
 * >
 *   <AIFeature />
 * </WhenCreditsAvailable>
 * ```
 */
export const WhenCreditsAvailable = (props: IWhenCreditsAvailableProps) => {
  const { min = 1, children, loadingComponent, fallbackComponent } = props;
  const { balance, loading } = useCreditBalanceContext();

  if (loading) return loadingComponent ?? null;
  if (!balance) return fallbackComponent ?? null;
  if (balance.available < min) return fallbackComponent ?? null;
  return children;
};

/**
 * Renders children only when the workspace has zero credits available.
 * Must be used within CreditBalanceContextProvider (included in SaaSOSProvider by default).
 *
 * @example
 * ```tsx
 * <WhenCreditsExhausted>
 *   <BuyCreditsPrompt message="You're out of credits!" />
 * </WhenCreditsExhausted>
 * ```
 *
 * @example
 * ```tsx
 * <WhenCreditsExhausted
 *   loadingComponent={<Spinner />}
 *   fallbackComponent={null}
 * >
 *   <NoCreditsOverlay />
 * </WhenCreditsExhausted>
 * ```
 */
export const WhenCreditsExhausted = (props: IWhenCreditsProps) => {
  const { children, loadingComponent, fallbackComponent } = props;
  const { balance, loading } = useCreditBalanceContext();

  if (loading) return loadingComponent ?? null;
  if (!balance) return fallbackComponent ?? null;
  if (balance.available > 0) return fallbackComponent ?? null;
  return children;
};

/**
 * Renders children when credits are at or below a threshold.
 * Must be used within CreditBalanceContextProvider (included in SaaSOSProvider by default).
 *
 * @example
 * ```tsx
 * <WhenCreditsLow threshold={50}>
 *   <p>Running low on credits! Consider buying more.</p>
 * </WhenCreditsLow>
 * ```
 *
 * @example
 * ```tsx
 * <WhenCreditsLow
 *   threshold={10}
 *   loadingComponent={<Skeleton />}
 *   fallbackComponent={null}
 * >
 *   <LowCreditsBanner />
 * </WhenCreditsLow>
 * ```
 */
export const WhenCreditsLow = (props: IWhenCreditsLowProps) => {
  const { threshold, children, loadingComponent, fallbackComponent } = props;
  const { balance, loading } = useCreditBalanceContext();

  if (loading) return loadingComponent ?? null;
  if (!balance) return fallbackComponent ?? null;
  if (balance.available > threshold) return fallbackComponent ?? null;
  return children;
};

WhenCreditsAvailable.displayName = 'WhenCreditsAvailable';
WhenCreditsExhausted.displayName = 'WhenCreditsExhausted';
WhenCreditsLow.displayName = 'WhenCreditsLow';
