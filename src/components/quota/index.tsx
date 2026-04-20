import { useQuotaUsageContext } from '../../contexts/QuotaUsageContext';

interface IWhenQuotaProps {
  /** Quota slug to check (e.g. 'api_calls', 'emails', 'storage'). */
  slug: string;
  /** Content to render when the condition is met. */
  children: React.ReactNode;
  /** Optional component/element to show while quota usage is loading (e.g. <Skeleton />). */
  loadingComponent?: React.ReactNode;
  /** Optional component/element to show when condition is not met (e.g. <UpgradePrompt />). */
  fallbackComponent?: React.ReactNode;
}

interface IWhenQuotaThresholdProps extends IWhenQuotaProps {
  /** Usage percentage threshold (0-100). Children render when usage >= this percentage. */
  threshold: number;
}

/**
 * Renders children only when the specified quota has remaining units (available > 0).
 * Must be used within QuotaUsageContextProvider (included in SaaSOSProvider by default).
 *
 * @example
 * ```tsx
 * <WhenQuotaAvailable slug="api_calls">
 *   <MakeApiCallButton />
 * </WhenQuotaAvailable>
 * ```
 *
 * @example
 * ```tsx
 * <WhenQuotaAvailable
 *   slug="emails"
 *   loadingComponent={<Skeleton />}
 *   fallbackComponent={<p>Email quota exhausted. <UpgradeLink /></p>}
 * >
 *   <SendEmailButton />
 * </WhenQuotaAvailable>
 * ```
 */
export const WhenQuotaAvailable = (props: IWhenQuotaProps) => {
  const { slug, children, loadingComponent, fallbackComponent } = props;
  const { quotas, loading } = useQuotaUsageContext();

  if (loading) return loadingComponent ?? null;
  const quota = quotas?.[slug];
  if (!quota) return fallbackComponent ?? null;
  if (quota.available <= 0) return fallbackComponent ?? null;
  return children;
};

/**
 * Renders children only when the specified quota is fully consumed (available <= 0).
 * Must be used within QuotaUsageContextProvider (included in SaaSOSProvider by default).
 *
 * @example
 * ```tsx
 * <WhenQuotaExhausted slug="api_calls">
 *   <UpgradePrompt message="You've used all your API calls this month." />
 * </WhenQuotaExhausted>
 * ```
 *
 * @example
 * ```tsx
 * <WhenQuotaExhausted
 *   slug="storage"
 *   loadingComponent={<Spinner />}
 *   fallbackComponent={null}
 * >
 *   <StorageFullBanner />
 * </WhenQuotaExhausted>
 * ```
 */
export const WhenQuotaExhausted = (props: IWhenQuotaProps) => {
  const { slug, children, loadingComponent, fallbackComponent } = props;
  const { quotas, loading } = useQuotaUsageContext();

  if (loading) return loadingComponent ?? null;
  const quota = quotas?.[slug];
  if (!quota) return fallbackComponent ?? null;
  if (quota.available > 0) return fallbackComponent ?? null;
  return children;
};

/**
 * Renders children only when the specified quota is in overage (consumed > included).
 * Must be used within QuotaUsageContextProvider (included in SaaSOSProvider by default).
 *
 * @example
 * ```tsx
 * <WhenQuotaOverage slug="api_calls">
 *   <OverageBillingWarning />
 * </WhenQuotaOverage>
 * ```
 *
 * @example
 * ```tsx
 * <WhenQuotaOverage
 *   slug="emails"
 *   loadingComponent={<Skeleton />}
 *   fallbackComponent={null}
 * >
 *   <p>You are being billed for overage usage.</p>
 * </WhenQuotaOverage>
 * ```
 */
export const WhenQuotaOverage = (props: IWhenQuotaProps) => {
  const { slug, children, loadingComponent, fallbackComponent } = props;
  const { quotas, loading } = useQuotaUsageContext();

  if (loading) return loadingComponent ?? null;
  const quota = quotas?.[slug];
  if (!quota) return fallbackComponent ?? null;
  if (!quota.hasOverage || quota.allowOverage === false) return fallbackComponent ?? null;
  return children;
};

/**
 * Renders children when the specified quota's usage percentage reaches or exceeds the threshold.
 * Usage percentage = (consumed / included) * 100. If included is 0 and consumed > 0, treats as 100%.
 * Must be used within QuotaUsageContextProvider (included in SaaSOSProvider by default).
 *
 * @example
 * ```tsx
 * <WhenQuotaThreshold slug="api_calls" threshold={80}>
 *   <p>Warning: You've used over 80% of your API calls.</p>
 * </WhenQuotaThreshold>
 * ```
 *
 * @example
 * ```tsx
 * <WhenQuotaThreshold
 *   slug="storage"
 *   threshold={90}
 *   loadingComponent={<Spinner />}
 *   fallbackComponent={null}
 * >
 *   <StorageWarningBanner />
 * </WhenQuotaThreshold>
 * ```
 */
export const WhenQuotaThreshold = (props: IWhenQuotaThresholdProps) => {
  const { slug, threshold, children, loadingComponent, fallbackComponent } = props;
  const { quotas, loading } = useQuotaUsageContext();

  if (loading) return loadingComponent ?? null;
  const quota = quotas?.[slug];
  if (!quota) return fallbackComponent ?? null;

  const usagePercent =
    quota.included > 0 ? (quota.consumed / quota.included) * 100 : quota.consumed > 0 ? 100 : 0;

  if (usagePercent < threshold) return fallbackComponent ?? null;
  return children;
};

WhenQuotaAvailable.displayName = 'WhenQuotaAvailable';
WhenQuotaExhausted.displayName = 'WhenQuotaExhausted';
WhenQuotaOverage.displayName = 'WhenQuotaOverage';
WhenQuotaThreshold.displayName = 'WhenQuotaThreshold';
