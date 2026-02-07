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

export interface WorkspaceContextValue {
  workspaces: IWorkspace[];
  currentWorkspace: IWorkspace | null;
  loading: boolean;
  switchingToId: string | null;
  refreshing: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>; // Manual trigger to fetch workspaces
  refreshWorkspaces: () => Promise<void>;
}

// Import IUser from your main types if needed
import type { ISubscription, IUser } from '../../api/types';
