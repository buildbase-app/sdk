/**
 * Internal notifier for subscription data invalidation.
 * When subscription is updated (plan change, cancel, resume), call invalidateSubscription()
 * so SubscriptionContextProvider refetches and gates stay in sync.
 */
import { createInvalidation } from './create-invalidation';

const manager = createInvalidation();

export const subscribeSubscriptionInvalidate = manager.subscribe;
export const invalidateSubscription = manager.invalidate;
export const resetSubscriptionInvalidation = manager.reset;
