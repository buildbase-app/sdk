'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { PartialSDKMessages } from '../i18n/types';
import type { WorkspaceSettingsSection } from '../providers/workspace/settings-screens';

/**
 * Implementor-facing UI configuration for the SDK.
 *
 * Every option is additive and defaults to the current behavior, so the
 * config is never required. Visibility options can only HIDE UI — they
 * never bypass platform permissions, which remain the security floor.
 */
export interface SDKUIConfig {
  /** Workspace settings dialog. */
  settings?: {
    /**
     * Show/hide sidebar sections of the workspace settings dialog.
     * Omitted sections stay visible. Hiding a section also prevents its
     * screen from rendering via deep links or `defaultSection`.
     *
     * @example
     * ```tsx
     * ui={{ settings: { sections: { credits: false, 'connected-agents': false } } }}
     * ```
     */
    sections?: Partial<Record<WorkspaceSettingsSection, boolean>>;
    /** Profile screen — hide individual preference fields. */
    profile?: {
      language?: boolean;
      country?: boolean;
      currency?: boolean;
      timezone?: boolean;
    };
    /** Security screen — hide passkey row actions. */
    security?: {
      passkeyRename?: boolean;
      passkeyDelete?: boolean;
    };
    /** General screen — hide workspace editing affordances. */
    general?: {
      nameEdit?: boolean;
      iconEditor?: boolean;
    };
    /** Users screen — hide member-management affordances. */
    users?: {
      invite?: boolean;
      roleChange?: boolean;
      remove?: boolean;
      /** Seat usage / seat pricing block above the member list. */
      seatPricing?: boolean;
    };
    /** Subscription screen — hide billing actions. */
    subscription?: {
      changePlan?: boolean;
      cancel?: boolean;
      managePayment?: boolean;
      invoicesTab?: boolean;
      /** Expandable plan features/limits/quotas breakdown. */
      planDetails?: boolean;
    };
    /** Credits screen — hide purchase/history blocks. */
    credits?: {
      buyButton?: boolean;
      transactions?: boolean;
    };
    /** Notifications screen — hide the push block or preference columns. */
    notifications?: {
      /** Browser push-notification block (subscribe/unsubscribe). */
      push?: boolean;
      /** Per-event email preference column. */
      emailToggles?: boolean;
      /** Per-event push preference column. */
      pushToggles?: boolean;
    };
  };
  /** Workspace switcher dialog (client-side; ANDed with server settings). */
  workspaceSwitcher?: {
    /** Overrides `settings.workspace.showSwitcher` to hide the switcher UI. */
    show?: boolean;
    createButton?: boolean;
    /** Subscription plan badge on each workspace row. */
    planBadge?: boolean;
    memberCount?: boolean;
  };
  /** SDK behaviors that are currently automatic. */
  behavior?: {
    /**
     * Auto-open the plan picker dialog when a workspace has no
     * subscription. Default true (current behavior).
     */
    autoOpenPlanDialog?: boolean;
    /** Default `daysThreshold` for `WhenTrialEnding` (default 3). */
    trialEndingDays?: number;
  };
  /**
   * Per-key overrides for SDK UI strings, deep-merged over the active
   * locale bundle. Use to rebrand terms (e.g. "Credits" → "Tokens")
   * without forking locale files.
   *
   * @example
   * ```tsx
   * ui={{ messages: { settings: { sidebar: { credits: 'Tokens' } } } }}
   * ```
   */
  messages?: PartialSDKMessages;
  /**
   * Strings for the top-level error boundary's default fallback.
   * Plain strings (not i18n keys) — the boundary renders even when the
   * translation layer itself has crashed.
   */
  errorBoundary?: {
    title?: string;
    retryLabel?: string;
  };
  /** Locale-aware formatting defaults. */
  formats?: {
    /**
     * Options for dates the SDK renders (passkey activity, connected agents,
     * etc.). Default: `{ dateStyle: 'medium' }`.
     */
    date?: Intl.DateTimeFormatOptions;
  };
}

const UIConfigContext = createContext<SDKUIConfig>({});

export function UIConfigProvider({
  ui,
  children,
}: {
  ui?: SDKUIConfig;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ui ?? {}, [ui]);
  return <UIConfigContext.Provider value={value}>{children}</UIConfigContext.Provider>;
}

/** Access the implementor-provided UI config (empty object when unset). */
export function useUIConfig(): SDKUIConfig {
  return useContext(UIConfigContext);
}

/**
 * Deep-merge a per-instance UI config over a base (provider-global) one.
 * Instance leaves win; objects merge recursively. Used by components that
 * accept their own `ui` prop (e.g. WorkspaceSettingsDialog).
 */
export function mergeUIConfig(base: SDKUIConfig, override?: SDKUIConfig): SDKUIConfig {
  if (!override) return base;
  return deepMerge(base, override) as SDKUIConfig;
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (
    !base ||
    !override ||
    typeof base !== 'object' ||
    typeof override !== 'object' ||
    Array.isArray(base) ||
    Array.isArray(override)
  ) {
    return override;
  }
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    result[key] = key in result ? deepMerge(result[key], value) : value;
  }
  return result;
}
