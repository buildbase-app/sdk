// Workspace context and API types (aligned with backend IWorkspace)

export interface IWorkspace {
  _id: string;
  name: string;
  image?: string;
  workspaceId: string;
  users: IUser[];
  roles: string[];
  createdBy: string | IUser;
  features: Record<string, boolean>;
  /**
   * Quota usage tracking: { [quotaSlug]: number } – how much of each quota has been used.
   */
  quotas?: Record<string, number>;
  /**
   * Subscription limits snapshot: { [limitSlug]: number | null } – synced from subscription plan.
   * Limits are maximum values (e.g. max-users, max-workspaces). Updated when subscription is assigned/updated.
   */
  limits?: Record<string, number | null>;
  subscription?: ISubscription | string | null;
  /** Stripe Customer ID for this workspace. */
  stripeCustomerId?: string;
  /**
   * Billing currency locked for this workspace (set on first subscription).
   * Stripe allows one currency per customer; all future subscriptions must use this currency.
   * When set, subscription UI only shows/uses this currency.
   */
  billingCurrency?: string | null;
  /** Per-workspace permission overrides. Takes priority over org-level settings.permissions. */
  permissions?: Record<string, string[]>;
  /** Set when workspace first uses a trial. Blocks trial from being used again on the same workspace. */
  trialUsedAt?: string | null;
}
export interface IWorkspaceFeature {
  _id: string;
  name: string;
  description: string;
  userManaged: boolean; // if true, the feature is managed by the user on the workspace setting page
  defaultValue: boolean;
  slug: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceUser {
  _id: string;
  workspace: string | IWorkspace;
  user: string | IUser;
  role: string;
}

import type { ISubscription, IUser } from '../../api/types';
