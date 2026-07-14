'use client';

import { Bot, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMcpConnection } from '../../contexts/McpConfigContext';
import { useUIConfig } from '../../contexts/UIConfigContext';
import { useTranslation } from '../../i18n';
import { formatDate } from '../../lib/format-utils';
import { BBAction } from '../../lib/url-params';
import { cn } from '../../lib/utils';
import { useConnectedAgents } from '../../providers/connected-agents/hooks';
import { workspaceSettingsManager } from '../../providers/workspace/settings-manager';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { EmptyState } from '../ui/empty-state';
import { SectionHeader } from '../ui/section-header';
import { Skeleton } from '../ui/skeleton';
import { ConnectMcpGuide } from './ConnectMcpGuide';

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
  /**
   * Show the "Connect an agent" action (a header button + empty-state CTA that
   * open the setup guide in a dialog). Defaults to `true` when an `mcp` config
   * is passed to `SaaSOSProvider`; set `false` to hide it even when configured.
   */
  showConnectGuide?: boolean;
}

/**
 * A ready-made "Connected agents" screen: lists the AI agents the signed-in user
 * has authorized to access their account, with a per-row Disconnect action. When
 * an `mcp` config is set on `SaaSOSProvider`, a "Connect an agent" button (header
 * + empty state) opens a setup-guide dialog. Session-authed and scoped to the
 * current user — no config beyond having the app wrapped in <SaaSOSProvider>.
 *
 * As a workspace settings screen, open it programmatically with
 * `openWorkspaceSettings('connected-agents')`; add `{ action: 'openConnectGuide' }`
 * (or `?bb=action:openConnectGuide`) to land straight on the setup dialog.
 *
 * For a fully custom UI, use the `useConnectedAgents()` hook and `<ConnectMcpGuide />`.
 */
export function ConnectedAgents({
  className,
  title,
  description,
  disconnectLabel,
  emptyLabel,
  showConnectGuide = true,
}: ConnectedAgentsProps) {
  const { t, formattingLocale } = useTranslation();
  const { formats } = useUIConfig();
  const { agents, loading, error, revoking, revoke } = useConnectedAgents();
  const mcp = useMcpConnection();
  const guideEnabled = showConnectGuide && Boolean(mcp?.url);
  const [guideOpen, setGuideOpen] = useState(false);

  // Deep link: `openWorkspaceSettings('connected-agents', { action: 'openConnectGuide' })`
  // (or `?bb=action:openConnectGuide`) lands directly on the setup dialog.
  const actionHandledRef = useRef(false);
  useEffect(() => {
    if (actionHandledRef.current || !guideEnabled) return;
    const params = workspaceSettingsManager.getState().params;
    if (params?.action === BBAction.OpenConnectGuide) {
      actionHandledRef.current = true;
      workspaceSettingsManager.clearParams();
      setGuideOpen(true);
    }
  }, [guideEnabled]);

  const resolvedTitle = title === undefined ? t('security.connectedAgentsTitle') : title;
  const resolvedDescription =
    description === undefined ? t('security.connectedAgentsDescription') : description;
  const resolvedDisconnectLabel = disconnectLabel ?? t('security.connectedAgentsDisconnect');
  const resolvedEmptyLabel = emptyLabel ?? t('security.connectedAgentsEmpty');
  const connectLabel = t('security.mcpConnectAction');

  const formatGrantedDate = (isoDate: string): string =>
    formatDate(isoDate, formattingLocale, formats?.date ?? { dateStyle: 'medium' });

  // `compact` collapses to an icon-only button below `sm` (keeps the header
  // from overflowing on phones); the empty-state CTA keeps its full label.
  const renderConnectButton = (compact: boolean) =>
    guideEnabled ? (
      <Button
        size="sm"
        onClick={() => setGuideOpen(true)}
        aria-label={connectLabel}
        className="shrink-0 gap-1.5"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className={compact ? 'hidden sm:inline' : undefined}>{connectLabel}</span>
      </Button>
    ) : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header keeps the connect action always reachable, independent of how
          long the agent list is. */}
      <SectionHeader
        title={resolvedTitle}
        description={resolvedDescription}
        actions={!loading && agents.length > 0 ? renderConnectButton(true) : undefined}
      />

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
          action={renderConnectButton(false) ?? undefined}
        />
      )}

      {!loading && agents.length > 0 && (
        <ul className="space-y-3">
          {agents.map(agent => (
            <li
              key={agent.clientId}
              className="flex items-start justify-between gap-x-4 rounded-md border p-3"
            >
              <div className="flex min-w-0 flex-col gap-y-1">
                <span className="text-sm font-medium break-words">{agent.title}</span>
                {agent.scope.length > 0 && (
                  <span className="text-muted-foreground text-xs break-words">
                    {t('security.connectedAgentsAccess')}: {agent.scope.join(', ')}
                  </span>
                )}
                {agent.lastGrantedAt && (
                  <span className="text-muted-foreground text-xs">
                    {t('security.connectedAgentsGranted')}: {formatGrantedDate(agent.lastGrantedAt)}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                progress={revoking === agent.clientId}
                onClick={() => revoke(agent.clientId)}
                className="shrink-0"
              >
                {resolvedDisconnectLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {guideEnabled && (
        <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
          {/* Full-screen sheet on phones, centered card at `sm`+ — same idiom as
              the workspace settings dialog (h-dvh + min-w-full on mobile). */}
          <DialogContent className="h-dvh max-h-dvh min-w-full gap-4 overflow-y-auto p-4 sm:h-auto sm:max-h-[90vh] sm:w-full sm:min-w-0 sm:max-w-lg sm:p-6">
            <DialogHeader className="pe-8">
              <DialogTitle>{t('security.mcpGuideTitle')}</DialogTitle>
              <DialogDescription>{t('security.mcpGuideDescription')}</DialogDescription>
            </DialogHeader>
            {/* Dialog header renders title/description; guide renders body only. */}
            <ConnectMcpGuide title={null} description={null} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
