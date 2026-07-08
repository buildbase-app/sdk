'use client';

import { useCallback } from 'react';
import { useUIConfig, type SDKUIConfig } from '../contexts/UIConfigContext';
import { usePermissions } from './usePermissions';

/**
 * Single-call visibility decisions combining the implementor's `ui` config
 * with platform permissions.
 *
 * A piece of UI is visible when its config flag is not explicitly `false`
 * AND the optional permission check passes. Config can only hide UI —
 * permissions remain the security floor.
 *
 * @example
 * ```tsx
 * const { visible } = useUIVisibility();
 *
 * // Config flag only
 * visible(ui => ui.settings?.credits?.buyButton)
 *
 * // Config flag AND permission — one line decides show/hide
 * visible(ui => ui.settings?.sections?.users, Permission.WORKSPACE_MEMBERS_VIEW)
 * ```
 */
export function useUIVisibility() {
  const ui = useUIConfig();
  const { can } = usePermissions();

  const visible = useCallback(
    (select: (ui: SDKUIConfig) => boolean | undefined, permission?: string | string[]): boolean =>
      select(ui) !== false && (permission === undefined || can(permission)),
    [ui, can]
  );

  return { visible, ui };
}
