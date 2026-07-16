'use client';

import { Monitor, MonitorSmartphone, Smartphone } from 'lucide-react';
import { useUIConfig } from '../../contexts/UIConfigContext';
import { useUIVisibility } from '../../hooks/useUIVisibility';
import { useTranslation } from '../../i18n';
import { describeAgent, isMobileAgent } from '../../lib/device-display';
import { formatDate } from '../../lib/format-utils';
import { cn } from '../../lib/utils';
import type { ISessionView } from '../../providers/sessions/api';
import { useSessions } from '../../providers/sessions/hooks';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { SectionHeader } from '../ui/section-header';
import { Skeleton } from '../ui/skeleton';

export interface SessionsProps {
  /** Extra classes for the root element. */
  className?: string;
  /** Heading text. Defaults to the translated title; set to null to hide. */
  title?: string | null;
  /** Sub-heading under the title. Defaults to the translated description; null to hide. */
  description?: string | null;
  /** Show the per-session Sign out action. Defaults to the `settings.devices.sessionSignOut` UI config (visible). */
  showSignOut?: boolean;
  /** Override the Sign out button label. */
  signOutLabel?: string;
  /** Text shown when there are no active sessions. */
  emptyLabel?: string;
}

/** "City, Country · IP" — only the parts we actually have, joined with a dot. */
function whereLabel(session: ISessionView): string {
  const location = [session.ipInfo?.city, session.ipInfo?.country].filter(Boolean).join(', ');
  return [location, session.ip].filter(Boolean).join(' · ');
}

/**
 * A ready-made "Active sessions" screen: lists the signed-in user's live
 * sessions and lets them sign out any that isn't the current one. Session-authed
 * and scoped to the current user — no config beyond having the app wrapped in
 * <SaaSOSProvider>.
 *
 * For a fully custom UI, use the `useSessions()` hook.
 */
export function Sessions({
  className,
  title,
  description,
  showSignOut,
  signOutLabel,
  emptyLabel,
}: SessionsProps) {
  const { t, formattingLocale } = useTranslation();
  const { formats } = useUIConfig();
  const { visible } = useUIVisibility();
  const { sessions, loading, error, revoking, revoke } = useSessions();

  // Explicit prop wins; otherwise fall back to the provider UI config (visible).
  const canSignOut = showSignOut ?? visible(ui => ui.settings?.devices?.sessionSignOut);

  const resolvedTitle = title === undefined ? t('security.sessionsTitle') : title;
  const resolvedDescription =
    description === undefined ? t('security.sessionsDescription') : description;
  const signOutLabelText = signOutLabel ?? t('security.sessionSignOut');
  const emptyLabelText = emptyLabel ?? t('security.sessionsEmpty');

  const formatWhen = (isoDate: string): string =>
    formatDate(isoDate, formattingLocale, formats?.date ?? { dateStyle: 'medium' });

  return (
    <div className={cn('space-y-4', className)}>
      <SectionHeader title={resolvedTitle} description={resolvedDescription} />

      {loading && (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      )}

      {error && !loading && <p className="text-destructive text-sm">{error}</p>}

      {!loading && !error && sessions.length === 0 && (
        <EmptyState
          icon={<MonitorSmartphone className="h-5 w-5 text-muted-foreground" />}
          description={emptyLabelText}
        />
      )}

      {!loading && sessions.length > 0 && (
        <ul className="space-y-3">
          {sessions.map(session => {
            const agent = describeAgent(session.userAgent);
            const where = whereLabel(session);
            const label = session.device?.name || agent || t('security.sessionsTitle');
            const SessionIcon = isMobileAgent(session.userAgent) ? Smartphone : Monitor;
            return (
              <li
                key={session.id}
                className="flex items-start justify-between gap-x-4 rounded-md border p-3"
              >
                <div className="flex min-w-0 gap-x-3">
                  <SessionIcon
                    className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-col gap-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium break-words">{label}</span>
                      {session.current && (
                        <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                          {t('security.sessionCurrent')}
                        </span>
                      )}
                    </div>
                    {agent && label !== agent && (
                      <span className="text-muted-foreground text-xs break-words">{agent}</span>
                    )}
                    {where && (
                      <span className="text-muted-foreground text-xs break-words">{where}</span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {session.lastActiveAt && (
                        <>
                          {t('security.sessionLastActive', {
                            date: formatWhen(session.lastActiveAt),
                          })}
                          {session.expiresAt && ' · '}
                        </>
                      )}
                      {session.expiresAt &&
                        t('security.sessionExpires', { date: formatWhen(session.expiresAt) })}
                    </span>
                  </div>
                </div>

                {!session.current && canSignOut && (
                  <Button
                    variant="ghost"
                    size="sm"
                    progress={revoking === session.id}
                    onClick={() => revoke(session.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    {signOutLabelText}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
