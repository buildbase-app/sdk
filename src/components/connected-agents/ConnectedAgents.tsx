'use client';

import { Bot } from 'lucide-react';
import { useUIConfig } from '../../contexts/UIConfigContext';
import { useTranslation } from '../../i18n';
import { cn } from '../../lib/utils';
import { useConnectedAgents } from '../../providers/connected-agents/hooks';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { SectionHeader } from '../ui/section-header';
import { Skeleton } from '../ui/skeleton';

export interface ConnectedAgentsProps {
  /** Extra classes for the root element. */
  className?: string;
  /** Heading text. Defaults to the translated title; set to null to hide. */
  title?: string | null;
  /** Sub-heading under the title. Defaults to the translated description; set to null to hide. */
  description?: string | null;
  /** Label for the disconnect button. Defaults to the translated label. */
  disconnectLabel?: string;
  /** Text shown when the user has no connected agents. Defaults to the translated label. */
  emptyLabel?: string;
}

/**
 * A ready-made "Connected agents" screen: lists the AI agents the signed-in user
 * has authorized to access their account, with a per-row Disconnect action.
 * Session-authed and scoped to the current user — no config beyond having the
 * app wrapped in <SaaSOSProvider>.
 *
 * For a fully custom UI, use the `useConnectedAgents()` hook instead.
 */
export function ConnectedAgents({
  className,
  title,
  description,
  disconnectLabel,
  emptyLabel,
}: ConnectedAgentsProps) {
  const { t, formattingLocale } = useTranslation();
  const { formats } = useUIConfig();
  const { agents, loading, error, revoking, revoke } = useConnectedAgents();

  const resolvedTitle = title === undefined ? t('security.connectedAgentsTitle') : title;
  const resolvedDescription =
    description === undefined ? t('security.connectedAgentsDescription') : description;
  const resolvedDisconnectLabel = disconnectLabel ?? t('security.connectedAgentsDisconnect');
  const resolvedEmptyLabel = emptyLabel ?? t('security.connectedAgentsEmpty');

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(
      formattingLocale,
      formats?.date ?? { dateStyle: 'medium' }
    ).format(date);
  };

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

      {!loading && !error && agents.length === 0 && (
        <EmptyState
          icon={<Bot className="h-5 w-5 text-muted-foreground" />}
          description={resolvedEmptyLabel}
        />
      )}

      {!loading && agents.length > 0 && (
        <ul className="space-y-3">
          {agents.map(agent => (
            <li
              key={agent.clientId}
              className="flex items-start justify-between gap-x-4 rounded-md border p-3"
            >
              <div className="flex flex-col gap-y-1">
                <span className="text-sm font-medium">{agent.title}</span>
                {agent.scope.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {t('security.connectedAgentsAccess')}: {agent.scope.join(', ')}
                  </span>
                )}
                {agent.lastGrantedAt && (
                  <span className="text-muted-foreground text-xs">
                    {t('security.connectedAgentsGranted')}: {formatDate(agent.lastGrantedAt)}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                progress={revoking === agent.clientId}
                onClick={() => revoke(agent.clientId)}
              >
                {resolvedDisconnectLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
